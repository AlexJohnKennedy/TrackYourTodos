using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;

using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Cors;

using todo_app.DataTransferLayer.Entities;
using todo_app.DataTransferLayer.DatabaseContext;
using todo_app.DataTransferLayer.EventReconciliationSystem;


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

        private const string googleSubjectClaimType = "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier";

        private ILogger logger;
        private TodoEventContext dbContext;

        public TodoEventController(TodoEventContext injectedContext, ILogger<TodoEventController> injectedLogger) {
            this.logger = injectedLogger;
            this.dbContext = injectedContext;
        }

        // A GET request to the todoevent endpoint will automatically fetch all of a user's events.
        [Authorize]
        [EnableCors("UserFacingApplications")]
        [HttpGet("/todoevents")]
        public async Task<IActionResult> FetchEntireEventLog() {
            HashSet<string> userIdStrings = User.FindAll(googleSubjectClaimType).Select(claim => claim.Value.Trim()).ToHashSet();

            IEnumerable<GenericTodoEvent> eventLog = await dbContext.TodoEvents.Where(e => userIdStrings.Contains(e.UserId.Trim())).OrderBy(e => e.Timestamp).ToListAsync();
            return Ok(eventLog);
        }

        // A POST request to the todoevent endpoint will pass in a log of new events to use. Most often, this will just be
        // a single event, but the API will support an array of events, such that clients can implement batch-sending if needed.
        [Authorize]
        [EnableCors("UserFacingApplications")]
        [HttpPost("/todoevents")]
        public async Task<IActionResult> PostNewEvents([FromBody] IList<GenericTodoEvent> newEvents) {
            // Populate the newEvents with the user's id string field, and make sure the eventId is null, so the DB is always responsible for populating it.
            string userId = User.FindFirst(googleSubjectClaimType).Value.Trim();
            foreach (GenericTodoEvent e in newEvents) {
                e.UserId = userId;
                e.EventId = 0;  // Manually set this to the 'default' value, so that the database can write to it instead.
            }

            // Detect duplicate events.
            var compositeKeyset = newEvents.Select(e => new { e.Id, e.Timestamp, e.EventType }).ToHashSet();
            List<GenericTodoEvent> savedEvents = await dbContext.TodoEvents.Where(e => e.UserId.Equals(userId)).OrderBy(e => e.Timestamp).ToListAsync();
            IEnumerable<GenericTodoEvent> duplicates = savedEvents.Where(e => compositeKeyset.Contains(new { e.Id, e.Timestamp, e.EventType }));

            if (duplicates.Count() == 0) {
                return await ValidateAndSave(newEvents, savedEvents);
            }
            else {
                var duplicateSet = duplicates.Select(e => new { e.Id, e.Timestamp, e.EventType }).ToHashSet();
                var nonDups = newEvents.Where(e => !duplicateSet.Contains(new { e.Id, e.Timestamp, e.EventType })).ToList();
                return await ValidateAndSave(nonDups, savedEvents);
            }
        }
        private async Task<IActionResult> ValidateAndSave(IList<GenericTodoEvent> newEvents, IList<GenericTodoEvent> savedEvents) {
            // Try to validate. If we fail, just save nothing and return a 409 to indicate the client's data is conflicting.
            EventLogReconciler logReconciler = new EventLogReconciler(savedEvents);
            
            if (!logReconciler.SimpleFullStateRebuildValidation(newEvents, out string err)) {
                // 409 Code indicates to the client that their events are 'in conflict' with the server's state, i.e., these events are not valid.
                return StatusCode(409, err);
            }
            
            dbContext.TodoEvents.AddRange(newEvents);
            await dbContext.SaveChangesAsync();
            return Ok(newEvents);
        }


        private void PrintClaimsPrincipal(ClaimsPrincipal userDetails) {
            logger.LogDebug(" ---> Logging User details <--- ");
            foreach (var claim in userDetails.Claims) {
                logger.LogDebug($"Claim from User.Claims collection: '{claim.Type}, {claim.Value}'");
            }
        }
    }
}
