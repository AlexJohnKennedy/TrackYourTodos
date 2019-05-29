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
            // This build() operation will trigger the StartUp class configs, I.e. Configure the DI Services and Middleware pipeline.
            IWebHost hostObj = CreateWebHostBuilder(args).Build();

            // TEMPORARY: Initialise the in-memory database by accessing the DBContext we registered.
            // We will do this here, before we actually 'run' the webhost, in order to pre-setup our test database provider with 
            // our hardcoded data.
            using (IServiceScope serviceScope = hostObj.Services.CreateScope()) {
                // Try and gain access to our TodoEvent database context
                try {
                    TodoEventContext dbContext = serviceScope.ServiceProvider.GetRequiredService<TodoEventContext>();
                    //SaveHardcodedEventLogToDatabase(dbContext);
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


        // ----------------------------------------------------------------------------------------------------------------------------
        // ----- HARD CODED TEST CRAP BELOW -------------------------------------------------------------------------------------------
        // ----------------------------------------------------------------------------------------------------------------------------

        private static void SaveHardcodedEventLogToDatabase(TodoEventContext context) {
            List<GenericTodoEvent> hardCodedEventLog = GetHardCodedEventLog();

            context.TodoEvents.AddRange(hardCodedEventLog);
            context.SaveChanges();
        }

        private static GenericTodoEvent BuildEvent(string type, long time, int id, string name, int category, int progressStatus, int? parent, int colourid, int? original, List<int> children) {
            GenericTodoEvent e = new GenericTodoEvent();
            e.Id = id;
            e.EventType = type;
            e.Name = name;
            e.Category = category;
            e.ProgressStatus = progressStatus;
            e.Parent = parent;
            e.ColourId = colourid;
            e.Original = original;
            e.Children = children == null ? null : children.ToArray();
            e.Timestamp = time;
            
            return e;
        }
        private static List<GenericTodoEvent> GetHardCodedEventLog() {            
            // Hacky hard coding incoming:
            List<GenericTodoEvent> hardCodedEventLog = new List<GenericTodoEvent>() {
                BuildEvent(
                    "taskCreated",
                    1556062589404,
                    13,
                    "goal task numero uno",
                    0,
                    0,
                    null,
                    0,
                    null,
                    null
                ),
                BuildEvent(
                    "taskCreated",
                    1556062589404,
                    14,
                    "different goal with child",
                    0,
                    0,
                    null,
                    1,
                    null,
                    null
                ),
                BuildEvent(
                    "subtaskCreated",
                    1556062589405,
                    15,
                    "weekly subtask",
                    1,
                    0,
                    14,
                    1,
                    null,
                    null
                ),
                BuildEvent(
                    "subtaskCreated",
                    1556062589405,
                    16,
                    "daily sub subby boi",
                    2,
                    0,
                    15,
                    1,
                    null,
                    null
                ),
                BuildEvent(
                    "subtaskCreated",
                    1556062589405,
                    17,
                    "This is a skipped subtask",
                    2,
                    0,
                    13,
                    0,
                    null,
                    null
                ),
                BuildEvent(
                    "taskCreated",
                    1556062589406,
                    18,
                    "independent weekly task",
                    1,
                    0,
                    null,
                    2,
                    null,
                    null
                ),
                BuildEvent(
                    "subtaskCreated",
                    1556062589406,
                    19,
                    "daily subtask",
                    2,
                    0,
                    18,
                    2,
                    null,
                    null
                ),
                BuildEvent(
                    "taskCreated",
                    1556062589407,
                    20,
                    "solo daily boy",
                    2,
                    0,
                    null,
                    3,
                    null,
                    null
                ),
                BuildEvent(
                    "taskCreated",
                    1556062589407,
                    21,
                    "eeeh later",
                    3,
                    0,
                    null,
                    0,
                    null,
                    null
                )
            };

            return hardCodedEventLog;
        }
    }
}
