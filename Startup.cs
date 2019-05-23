using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.HttpsPolicy;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SpaServices.ReactDevelopmentServer;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using todo_app.DataTransferLayer.DatabaseContext;
using Microsoft.EntityFrameworkCore;

namespace todo_app {

    public class Startup {

        // Keeping Google OAuth Client credentials here temporarily while I figure this shit out.
        // If you're seeing this on a public github, don't worry, these creds aren't used for anything real.
        private const string ClientSecret = "vy17V2EITVOXnTtryQHzgAEI";
        private const string ClientId = "918054703402-ro3vekrnadnoc4e00timiuei0bk44lcq.apps.googleusercontent.com";

        public Startup(IConfiguration configuration) {
            Configuration = configuration;
        }

        public IConfiguration Configuration { get; }

        // This method gets called by the runtime. Use this method to add services to the container.
        public void ConfigureServices(IServiceCollection services) {
            
            // Register an OpenIdConnect authentication service, configured to use Google as the authentication server.
            // By default, this will use the implicit flow, and thus we do not need the client secret token in our options.
            services.AddAuthentication(
                options => {
                    options.DefaultScheme = "Cookies";
                    options.DefaultChallengeScheme = "GoogleOpenIdConnect";
                }
            )
            .AddCookie("Cookies")
            .AddOpenIdConnect(
                authenticationScheme: "GoogleOpenIdConnect",
                displayName: "GoogleOpenIdConnect",
                options => {
                    options.Authority = "https://accounts.google.com/";
                    options.ClientId = ClientId;
                    options.CallbackPath = "/memes";
                    options.Scope.Add("email");     // Ask Google for email address of the user
                    options.SignedOutCallbackPath = "/";
                }
            );

            // Register our EFCore database context with DI, and configure it to be backed by an in-memory database provider.
            // Later, we can replace this with a PostGres provider and hopefully not have to change much/any logic.
            services.AddDbContext<TodoEventContext>(optionsObj => {
                optionsObj.UseInMemoryDatabase("TestTodoEventStorage");
            });
            
            services.AddMvc().SetCompatibilityVersion(CompatibilityVersion.Version_2_2);

            // In production, the React files will be served from this directory
            services.AddSpaStaticFiles(configuration => {
                configuration.RootPath = "ClientApp/build";
            });
        }

        // This method gets called by the runtime. Use this method to configure the HTTP request pipeline middleware.
        public void Configure(IApplicationBuilder app, IHostingEnvironment env) {
            if (env.IsDevelopment()) {
                app.UseDeveloperExceptionPage();
            }
            else {
                app.UseExceptionHandler("/Error");
                // The default HSTS value is 30 days. You may want to change this for production scenarios, see https://aka.ms/aspnetcore-hsts.
                app.UseHsts();
            }

            app.UseHttpsRedirection();
            app.UseStaticFiles();
            app.UseSpaStaticFiles();

            app.UseAuthentication();
            app.UseMvc();

            app.UseSpa(spa => {
                spa.Options.SourcePath = "ClientApp";
                spa.Options.DefaultPage = "/app";

                if (env.IsDevelopment())
                {
                    spa.UseReactDevelopmentServer(npmScript: "start");
                }
            });
        }
    }
}
