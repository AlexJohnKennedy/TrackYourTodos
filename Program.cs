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
            e.EventId = Guid.Empty; // TODO: Replace this!
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
                    "taskCreatevoidd",
                    1556062589407,
                    21,
                    "eeeh later",
                    3,
                    0,
                    null,
                    0,
                    null,
                    null
                ),
                BuildEvent(
                    "taskCreated",
                    1556062589407,
                    22,
                    "ill do it soon, for real this time",
                    3,
                    0,
                    null,
                    1,
                    null,
                    null
                ),
                BuildEvent(
                    "taskCreated",
                    1556062589407,
                    23,
                    "oompa loompa",
                    2,
                    0,
                    null,
                    2,
                    null,
                    null
                ),
                BuildEvent(
                    "taskCompleted",
                    1556062589408,
                    23,
                    "oompa loompa",
                    2,
                    2,
                    null,
                    2,
                    null,
                    new List<int>()
                ),
                BuildEvent(
                    "subtaskCreated",
                    1556062589408,
                    24,
                    "this is a separate subboi!! :)",
                    2,
                    0,
                    15,
                    1,
                    null,
                    null
                ),
                BuildEvent(
                    "taskCompleted",
                    1556062589409,
                    24,
                    "this is a separate subboi!! :)",
                    2,
                    2,
                    15,
                    1,
                    null,
                    new List<int>()
                ),
                BuildEvent(
                    "taskCreated",
                    1556062589409,
                    25,
                    "memes",
                    2,
                    0,
                    null,
                    3,
                    null,
                    null
                ),
                BuildEvent(
                    "taskFailed",
                    1556062589410,
                    25,
                    "memes",
                    2,
                    4,
                    null,
                    3,
                    null,
                    new List<int>()
                ),
                BuildEvent(
                    "taskCreated",
                    1556106767782,
                    26,
                    "aaa",
                    3,
                    0,
                    null,
                    0,
                    null,
                    null
                ),
                BuildEvent(
                    "taskCreated",
                    1556618710000,
                    27,
                    "lol at this lame shit",
                    2,
                    0,
                    null,
                    1,
                    null,
                    null
                ),
                BuildEvent(
                    "taskCreated",
                    1556106938064,
                    28,
                    "asda",
                    1,
                    0,
                    null,
                    2,
                    null,
                    null
                ),
                BuildEvent(
                    "taskCreated",
                    1556106941746,
                    29,
                    "qwert",
                    0,
                    0,
                    null,
                    3,
                    null,
                    null
                ),
                BuildEvent(
                    "taskCreated",
                    1556106943560,
                    30,
                    "wqweqwe",
                    0,
                    0,
                    null,
                    0,
                    null,
                    null
                ),
                BuildEvent(
                    "subtaskCreated",
                    1556106951061,
                    31,
                    "aaaaqqqqqqaaoppsodjcn",
                    1,
                    0,
                    30,
                    0,
                    null,
                    null
                ),
                BuildEvent(
                    "taskStarted",
                    1556106958129,
                    31,
                    "aaaaqqqqqqaaoppsodjcn",
                    1,
                    1,
                    30,
                    0,
                    null,
                    new List<int>()
                ),
                BuildEvent(
                    "taskCompleted",
                    1556106958387,
                    31,
                    "aaaaqqqqqqaaoppsodjcn",
                    1,
                    2,
                    30,
                    0,
                    null,
                    new List<int>()
                ),
                BuildEvent(
                    "taskStarted",
                    1556106960219,
                    19,
                    "daily subtask",
                    2,
                    1,
                    18,
                    2,
                    null,
                    new List<int>()
                ),
                BuildEvent(
                    "taskStarted",
                    1556106962849,
                    28,
                    "asda",
                    1,
                    1,
                    null,
                    2,
                    null,
                    new List<int>()
                ),
                BuildEvent(
                    "taskCompleted",
                    1556106963697,
                    28,
                    "asda",
                    1,
                    2,
                    null,
                    2,
                    null,
                    new List<int>()
                ),
                BuildEvent(
                    "taskStarted",
                    1556106965175,
                    18,
                    "independent weekly task",
                    1,
                    1,
                    null,
                    2,
                    null,
                    new List<int>() { 19 }
                ),
                BuildEvent(
                    "taskCompleted",
                    1556106966517,
                    19,
                    "daily subtask",
                    2,
                    2,
                    18,
                    2,
                    null,
                    new List<int>()
                ),
                BuildEvent(
                    "taskStarted",
                    1556106968407,
                    15,
                    "weekly subtask",
                    1,
                    1,
                    14,
                    1,
                    null,
                    new List<int>() { 16, 24 }
                ),
                BuildEvent(
                    "taskStarted",
                    1556106970113,
                    14,
                    "different goal with child",
                    0,
                    1,
                    null,
                    1,
                    null,
                    new List<int>() { 15 }
                ),
                BuildEvent(
                    "taskCompleted",
                    1556106970691,
                    14,
                    "different goal with child",
                    0,
                    2,
                    null,
                    1,
                    null,
                    new List<int>() { 15 }
                ),
                BuildEvent(
                    "taskRevived",
                    1556106970695,
                    32,
                    "memes",
                    3,
                    0,
                    null,
                    3,
                    25,
                    null
                ),
                BuildEvent(
                    "taskActivated",
                    1556577407000,
                    32,
                    "memes",
                    1,
                    0,
                    null,
                    3,
                    null,
                    new List<int>()
                ),
                BuildEvent(
                    "taskStarted",
                    1556168848972,
                    29,
                    "qwert",
                    0,
                    1,
                    null,
                    3,
                    null,
                    new List<int>() 
                ),
                BuildEvent(
                    "taskStarted",
                    1556168850373,
                    32,
                    "memes",
                    1,
                    1,
                    null,
                    3,
                    null,
                    new List<int>() 
                ),
                BuildEvent(
                    "taskStarted",
                    1556106965175,
                    18,
                    "independent weekly task",
                    1,
                    1,
                    null,
                    2,
                    null,
                    new List<int>() { 19 }
                )
            };

            return hardCodedEventLog;
        }
    }
}
