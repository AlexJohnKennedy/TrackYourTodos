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
using todo_app.DataTransferLayer.Entities;

namespace todo_app {

    public class Program {
        
        public static void Main(string[] args) {
            // Create the web host with the correct configurations.
            // The build() operation will trigger the StartUp class configs, I.e. Configure the DI Services and Middleware pipeline.
            CreateWebHostBuilder(args).Build().Run();
        }

        public static IWebHostBuilder CreateWebHostBuilder(string[] args) => WebHost.CreateDefaultBuilder(args).UseStartup<Startup>();
    }
}