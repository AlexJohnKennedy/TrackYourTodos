using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Threading.Tasks;
using System.Security.Claims;
using System.IdentityModel.Tokens.Jwt;

using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;

using todo_app.DataTransferLayer.DatabaseContext;
using todo_app.JwtAuthenticationHelperMiddlewares;
using todo_app.Services.AuthenticationHelpers;
using todo_app.CustomAuthenticationOptions;

namespace todo_app {

    public class Startup {
        
        public IConfiguration Configuration { get; }
        private ILogger logger;

        public Startup(IConfiguration configuration, ILoggerFactory loggerFactory) {
            Configuration = configuration;
            this.logger = loggerFactory.CreateLogger<Startup>();
        }

        // This method gets called by the runtime. Use this method to add services to the container.
        public void ConfigureServices(IServiceCollection services) {
            logger.LogInformation($"Configuring services with ASPNETCORE_ENVIRONMENT={Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT")}");

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
                if (Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Production") {
                    corsOptions.AddPolicy("UserFacingApplications", builder => {    // TODO: Move CORS policy names to a Configurations Service binding.
                        builder.WithOrigins("https://tytodosreactapp.z26.web.core.windows.net").AllowAnyHeader().AllowAnyMethod();
                    });
                }
                else if (Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "DockerDevelopment") {
                    corsOptions.AddPolicy("UserFacingApplications", builder => {
                        builder.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod();
                    });
                }
                else {
                    corsOptions.AddPolicy("UserFacingApplications", builder => {
                        builder.WithOrigins("http://localhost:3000", "https://localhost:3000", "https://tytodosreactapp.z26.web.core.windows.net").AllowAnyHeader().AllowAnyMethod();
                    });
                }
                corsOptions.AddPolicy("AdminApplications", builder => {
                    builder.WithOrigins("https://some-admin-domain.com").AllowAnyHeader().AllowAnyMethod();
                });
            });

            // Register our singleton 'public key provider' service which will be used by our middleware to supply google PK's.
            services.AddHttpClient();
            services.AddSingleton<IRemotePublicKeyProvider, GooglePublicKeyProviderFetchAndCache>();

            // Configure Authentication.
            MutateTokenValidationParametersOptionSet o = new MutateTokenValidationParametersOptionSet();
            services.AddAuthentication(authOptions => {
                authOptions.DefaultScheme = JwtBearerDefaults.AuthenticationScheme;
                authOptions.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
                authOptions.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
            })
            .AddJwtBearer(o.OptionsFunc);

            // Configure EFCore Database settings. If we are in production (Azure), then use Azure SQL Database. Otherwise, just use a test
            // in-memory database for now.
            // NOTE: This environment variable must be set in the Azure target environment, in Azure App Services!
            // The Connection string must ALSO be configured in Azure, which contains the secret details of how to connect to the database.
            if (Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Production") {
                logger.LogInformation("Connecting to Azure SQL Database");
                services.AddDbContext<TodoEventContext>(optionsObj => {
                    optionsObj.UseSqlServer(Configuration.GetConnectionString("AzureSqlConnectionString"));
                });
            }
            else if (Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "DockerDevelopment") {
                logger.LogInformation("Connecting to Dockerised Postgres Database");
                services.AddDbContext<TodoEventContext>(optionsObj => {
                    optionsObj.UseNpgsql(Configuration.GetConnectionString("PostgresConnectionString"));
                });
            }
            else {
                logger.LogInformation("Using an In Memory Database");
                services.AddDbContext<TodoEventContext>(optionsObj => {
                    optionsObj.UseInMemoryDatabase("TestTodoEventStorage");
                });
            }
            
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
            
            // Don't use https redirection for the docker-container environment, as a temp measure just to get the docker-compose.yml working..
            if (Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") != "DockerDevelopment") {
                app.UseHttpsRedirection();
            }

            // Custom middleware to fetch public keys for auth.
            app.UsePublicKeyFetchingMiddleware();

            app.UseAuthentication();
            app.UseMvc();
        }
    }
}
