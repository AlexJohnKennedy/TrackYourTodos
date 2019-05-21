using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using todo_app.DataTransferLayer.DatabaseContext;

namespace todo_app {

    public class Program {
        
        public static void Main(string[] args) {
            // Create the web host with the correct configurations.
            // This build() operation will trigger the StartUp class configs, I.e. Configure the DI Services and Middleware pipeline.
            IWebHost hostObj = CreateWebHostBuilder(args).Build();

            // TEMPORARY: Initialise the in-memory database by accessing the DBContext we registered.
            // We will do this here, before we actually 'run' the webhost, in order to pre-setup our test database provider with 
            // our hardcoded data.
            using (IServiceScope serviceScope = hostObj.Services.CreateScope()) {
                // Try and gain access to our TodoEvent database context
                try {
                    TodoEventContext dbContext = serviceScope.ServiceProvider.GetRequiredService<TodoEventContext>();
                    SaveHardcodedEventLogToDatabase(dbContext);
                }
                catch (Exception ex) {
                    var logger = serviceScope.ServiceProvider.GetRequiredService<ILogger<Program>>();
                    logger.LogError(ex, "An error occurred.");
                }
            }

            // Okay, now that we have setup our hardcoded bullshit, we can run the host!
            hostObj.Run();
        }

        public static IWebHostBuilder CreateWebHostBuilder(string[] args) => WebHost.CreateDefaultBuilder(args).UseStartup<Startup>();

        private static void SaveHardcodedEventLogToDatabase(TodoEventContext context) {

        }
    }
}
