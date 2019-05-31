using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Threading.Tasks;
using System.Security.Claims;
using System.IdentityModel.Tokens.Jwt;
using System;

using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;

using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

using todo_app.DataTransferLayer.DatabaseContext;
using todo_app.JwtTestCode;
using todo_app.JwtAuthenticationHelperMiddlewares;

namespace todo_app
{

    public class Startup {
        
        public IConfiguration Configuration { get; }
        private ILogger logger;

        public Startup(IConfiguration configuration, ILoggerFactory loggerFactory) {
            Configuration = configuration;
            this.logger = loggerFactory.CreateLogger<Startup>();
        }

        // This method gets called by the runtime. Use this method to add services to the container.
        public void ConfigureServices(IServiceCollection services) {
            
            // We are going to be hosting our API backend as an independent, public API, hosted on a different domain
            // from our front-end client Single-page-app. The SPA will be sending AJAX http requests to us; but browsers
            // do not allow cross-origin javascript requests unless the server recieving them explicitly declares (with a
            // header after initial probing) that it allows requests from different domains. This is called CORS - Cross
            // origin resource sharing. Our API needs to declare that it allows CORS so that our SPA ajax requests are not
            // automatically blocked by the client-browser. For now, we will simply setup a 'global' CORS policy, which 
            // means we accept requests from ANY domain, and thus solely rely on legitimate JWT tokens to authenticate and
            // authorize requests to access our API. Later, we can implement a stricter CORS policy, and ONLY allow requests
            // coming from our client-applications, e.g. the domain our SPA is served to.
            //
            // For this API, we will build two policies; one for our user-facing Single-page-app, and another for a CRM/Admin
            // app (which currently does not exist) which comes from a different domain from the SPA. This will allow us to
            // only allow the appropriate origins for each particular API end-point.
            services.AddCors(corsOptions => {
                corsOptions.AddPolicy("UserFacingApplications", builder => {    // TODO: Move CORS policy names to a Configurations Service binding.
                    // TODO: For production, we should NOT allow CORS requests from HTTP, only HTTPS!
                    builder.WithOrigins("https://localhost:3000", "http://localhost:3000").AllowAnyHeader().AllowAnyMethod();
                });
                corsOptions.AddPolicy("AdminApplications", builder => {
                    builder.WithOrigins("https://some-admin-domain.com").AllowAnyHeader().AllowAnyMethod();
                });
            });

            services.AddAuthentication(authOptions => {
                // Tell ASP's authentication service to authenticate using JWT Bearer flows, by setting it as our 'scheme(s)'.
                authOptions.DefaultScheme = JwtBearerDefaults.AuthenticationScheme;
                authOptions.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
                authOptions.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
            }).AddJwtBearer(jwtOptions => {
                // Construct some Token validation params which contain Google Authority and Audience.
                jwtOptions.TokenValidationParameters = new TokenValidationParameters {
                    ClockSkew = TimeSpan.FromMinutes(5),    // Allow for 5 minutes of de-sync between token-issuing server and our server. (This is alot)
                    ValidateAudience = true,
                    ValidAudience = "918054703402-2u53f3l62mpekrao3jkqd6geg3mjvtjq.apps.googleusercontent.com",
                    ValidateIssuer = true,
                    ValidIssuers = new List<string> { "accounts.google.com", "https://accounts.google.com" },
                    ValidateLifetime = true,
                };

                // Attach an event handler which will extract the Google public keys from the HttpContext, which should have been placed there
                // by previous custom middleware.
                // WARNING: I'm not sure if mutating the jwtOptions object mid-request handling is thread safe, if another concurrent request is simulataneously running here. This could potentially be an issue!!
                // WARNING: If it is, we will have to instead completely take over the validation in this event; i.e. instantiate fresh validationParams, and a fresh JwtSecurityTokenHandler, extract the token, validate it directly,
                // WARNING: instnatiate a TokenValidationContext containing the Claims principal and populate Security Token, and then attach the TokenValidationContext.Result to the messageContext.Result.
                // WARNING: In essence, this would be copying the behaviour of the existing validation process, except it would explicitly ensure that this request is handled with isolated instances which won't change from other
                // WARNING: threads! 
                // WARNING: SEE: https://github.com/aspnet/Security/blob/master/src/Microsoft.AspNetCore.Authentication.JwtBearer/JwtBearerHandler.cs for the built-in logic we would have to emulate.
                // WARNING: SEE: https://gist.github.com/twaldecker/da0594baeef0e15466c68112ae375988 for example of how to use the built-in JwtSecurityTokenHandler to manually validate.
                jwtOptions.Events = new JwtBearerEvents() {
                    OnMessageReceived = messageContext => {
                        IEnumerable<SecurityKey> keysFromPreviousMiddleware = PublicKeyFetchingMiddleware.RetrieveSecurityKeys(messageContext.HttpContext);
                        messageContext.Options.TokenValidationParameters.IssuerSigningKeys = keysFromPreviousMiddleware;
                        messageContext.Options.TokenValidationParameters.IssuerSigningKeyResolver = (tokenString, securityTokenObj, kidString, validationParamsObj) => {
                            return keysFromPreviousMiddleware.Where(key => key.KeyId.ToUpper() == kidString.ToUpper());
                        };
                        return Task.CompletedTask;
                    }
                };
            });

            // Register our EFCore database context with DI, and configure it to be backed by an in-memory database provider.
            // Later, we can replace this with a PostGres provider and hopefully not have to change much/any logic.
            services.AddDbContext<TodoEventContext>(optionsObj => {
                optionsObj.UseInMemoryDatabase("TestTodoEventStorage");
            });
            
            services.AddMvc().SetCompatibilityVersion(CompatibilityVersion.Version_2_2);
        }

        // This method gets called by the runtime. Use this method to configure the HTTP request pipeline middleware.
        public void Configure(IApplicationBuilder app, IHostingEnvironment env) {
            if (env.IsDevelopment()) {
                app.UseDeveloperExceptionPage();
            }
            else {
                // The default HSTS value is 30 days. You may want to change this for production scenarios, see https://aka.ms/aspnetcore-hsts.
                app.UseHsts();
            }
            
            // NOTE: We are NOT enabling CORS here by specifying 'app.UseCors()', because this would enable CORS globally with a 
            // specified policy. Instead, I am going to choose explicitly which CORS policy to apply to each Controller-action
            // endpoint in our API. This allows us to allow request specifically from our SPA domain, (rather than just any), for
            // the user endpoints, but NOT allow requests from our SPA domain to any 'admin only' end-points, for example!

            app.UseHttpsRedirection();
            app.UseAuthentication();
            app.UseMvc();
        }
    }
}
