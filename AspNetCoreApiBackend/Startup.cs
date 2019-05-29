using System.Collections.Generic;
using System.Linq;

using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;

using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

using todo_app.DataTransferLayer.DatabaseContext;

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
                
                //jwtOptions.MetadataAddress = "https://www.googleapis.com/oauth2/v3/certs";

                // Specify the token validation paramters; I.e., what steps should be taken in order to fully verify the validity of an incoming token.
                // (e.g., check it is signed by google, by using Google's public key, check expiry time, etc.)
                jwtOptions.TokenValidationParameters = new TokenValidationParameters {
                    ValidateAudience = true,
                    ValidAudience = "918054703402-2u53f3l62mpekrao3jkqd6geg3mjvtjq.apps.googleusercontent.com",
                
                    ValidateIssuer = true,
                    ValidIssuer = "accounts.google.com",
                
                    ValidateLifetime = true,
                    
                    /* Assign a delegate (of type 'IssuerSigningKeyResolver') which fetches/returns google's current public key! */
                    IssuerSigningKeyResolver = (tokenString, securityTokenObj, kidString, validationParamsObj) => {
                        string jwkArrayJson = "[{\"kid\":\"07a082839f2e71a9bf6c596996b94739785afdc3\",\"e\":\"AQAB\",\"kty\":\"RSA\",\"alg\":\"RS256\",\"n\":\"9Y5kfSJyw-GyM4lSXNCVaMKmDdOkYdu5ZhQ7E-8nfae-CPPsx3IZjdUrrv_AoKhM3vsZW_Z3Vucou53YZQuHFpnAa6YxiG9ntpScviU1dhMd4YyUtNYWVBxgNemT9dhhj2i32ez0tOj7o0tGh2Yoo2LiSXRDT-m2zwBImYkBksws4qq_X3jZhlfYkznrCJGjVhKEHzlQy5BBqtQtN5dXFVi-zRZ0-m7oiNW_2wivjw_99li087PNFSeyHpgxjbg30K2qnm1T8gVhnzqf8xnPW9vZFyc_8-3qmbQeDedB8YWyzojM3hDLsHqypP84MSOmejmi0c2b836oc-pI8seXwQ\",\"use\":\"sig\"},{\"e\":\"AQAB\",\"kty\":\"RSA\",\"alg\":\"RS256\",\"n\":\"uNgHfkBGmFZbxa7E0tnsRzarMiE26hnGfwf6PPIbMClW_-VqwwTPXftsnrPbQg93XAKS-r1jQZL54vpVbKJjT7V0TwGpEHplIlLQdSiHLvcUTKPi8ZdG2Promst8khxHTbNDvBhtJwsYXUwLJ3fDF-6v2kTZCHnggQF-tPo4Jumb0WoZYXN74VxmcBU52ypEAlGCxECwpVYOQlrJUzRl7BXvP1EI24D_ZLPLLZd1oP0zz4bFTXeHYm1Q79y8UVBH6o-7nrw9MC1150lSCXX-tXnVJ53f1U2V8PhyDNVy9feTBMO06mvyhl5b3E0aHptgTBUeSFcCIGMvjMgVAO2brw\",\"use\":\"sig\",\"kid\":\"c7f522d032284d252bee4fd80560cefa0fb60c39\"}]";
                        JArray jArray = JArray.Parse(jwkArrayJson);
                        List<SecurityKey> l = new List<SecurityKey>();
                        foreach (JToken item in jArray) {
                            l.Add(new JsonWebKey(item.ToString()));
                        }
                        return l;
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
