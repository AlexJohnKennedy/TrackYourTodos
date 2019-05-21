using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using todo_app.DataTransferLayer.Entities;
using todo_app.DataTransferLayer.DatabaseContext;
using Microsoft.Extensions.Logging;
using Microsoft.EntityFrameworkCore;

namespace todo_app.Controllers {

    // This class will act as the main API controller. It will essentially be responsible for receiving and handling
    // any incoming HTTP request which is related to saving and loading 'todo events'; which encompass any action
    // taken by the client. Consequently, until more complex server-side features are developed, this will be the only
    // controller on the server.
    // The only two API endpoints we currently offer are essentially one get, and one post.
    //
    // The client may request all of their saved events of all time, in a giant data log, as an array of events.
    // --- Later, we may implement a feature which 'snapshots' a given todo state to improve performance, instead of having
    // --- to load events for all time, which might start getting costly if the number of Todo events grows.
    // The client may send a POST request which essentially posts one or more todo events, with client-side generated UUIDs,
    // in order for them to be saved into the database. Later, the Server will perform validation operations against the
    // incoming events, and ensure that duplicates are correctly handled, etc.
    [ApiController]
    public class TodoEventController : ControllerBase {

        private ILogger logger;
        private TodoEventContext dbContext;

        public TodoEventController(TodoEventContext injectedContext, ILogger<TodoEventController> injectedLogger) {
            this.logger = injectedLogger;
            this.dbContext = injectedContext;
        }


        // A GET request to the todoevent endpoint will automatically fetch all of a user's events.
        [HttpGet("/todoevents")]
        public async Task<IActionResult> FetchEntireEventLog() {
            IEnumerable<GenericTodoEvent> eventLog = await dbContext.TodoEvents.Where(e => true).OrderBy(e => e.Timestamp).ToListAsync();
            return Ok(eventLog);
        }

        // A POST request to the todoevent endpoint will pass in a log of new events to use. Most often, this will just be
        // a single event, but the API will support an array of events, such that clients can implement batch-sending if needed.
        [HttpPost("/todoevents")]
        public async Task<IActionResult> PostNewEvents([FromBody] IList<GenericTodoEvent> newEvents) {
            // Detect duplicate events, and notify the client of duplicates by returning a different status code.
            var compositeKeyset = newEvents.Select(e => new { e.Id, e.Timestamp, e.EventType }).ToHashSet();
            List<GenericTodoEvent> duplicates = await dbContext.TodoEvents.Where(e => compositeKeyset.Contains(new { e.Id, e.Timestamp, e.EventType })).ToListAsync();

            // If there are not duplicates, do a save. We are assuming that they are not causing an invalid state. Later on, I will
            // simulate the state
            if (duplicates.Count == 0) {
                dbContext.TodoEvents.AddRange(newEvents);
                await dbContext.SaveChangesAsync();
                return Ok(newEvents);
            }
            else {
                var duplicateSet = duplicates.Select(e => new { e.Id, e.Timestamp, e.EventType }).ToHashSet();
                var nonDups = newEvents.Where(e => !duplicateSet.Contains(new { e.Id, e.Timestamp, e.EventType }));
                dbContext.TodoEvents.AddRange(nonDups);
                await dbContext.SaveChangesAsync();
                return Ok(nonDups);
            }
        }
    }
}
