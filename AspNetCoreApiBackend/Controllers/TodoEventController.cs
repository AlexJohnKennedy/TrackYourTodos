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
        private static readonly IEqualityComparer<GenericTodoEvent> eventComparer = new GenericTodoEventComparer();
        
        // Define functions to use to determine event log ordering. Timestamp, and break ties based on event type precedence. (I.e. Created always preceedes started)        
        private static readonly Func<GenericTodoEvent, EventOrderingKey> keySelector = e => new EventOrderingKey(e.Timestamp, e.EventType);
        private static readonly Comparer<EventOrderingKey> keyComparer = new EventOrderingKeyComparer();

        private ILogger logger;
        private TodoEventContext dbContext;

        public TodoEventController(TodoEventContext injectedContext, ILogger<TodoEventController> injectedLogger) {
            this.logger = injectedLogger;
            this.dbContext = injectedContext;
        }

        // A GET request to the todoevent endpoint will automatically fetch all of a user's events, matching a provided set of contexts.
        // If the provided set of contexts is empty, then we will simply return ALL of a user's events. This is how the client will ask
        // for the 'Global' context!
        [Authorize]
        [EnableCors("UserFacingApplications")]
        [HttpGet("/todoevents")]
        public async Task<IActionResult> FetchEntireEventLog([FromQuery] HashSet<string> contexts) {
            HashSet<string> userIdStrings = User.FindAll(googleSubjectClaimType).Select(claim => claim.Value.Trim()).ToHashSet();

            // For safety, convert all strings to lowercase before matching them against the saved database values
            contexts = contexts.Select(s => s.ToLower()).ToHashSet();

            IEnumerable<GenericTodoEvent> eventLog = await dbContext.TodoEvents.Where(e => userIdStrings.Contains(e.UserId.Trim())).ToListAsync();
            eventLog = eventLog.OrderBy(keySelector, keyComparer).ToList();
            
            // Get all of the user's current context information from the context mappings table
            List<ContextMapping> allContextsNoDups = await dbContext.ContextMappings.Where(e => userIdStrings.Contains(e.UserId.Trim())).ToListAsync();

            if (contexts.Count > 0) {
                eventLog = eventLog.Where(e => contexts.Contains(e.Context.Trim().ToLower())).OrderBy(keySelector, keyComparer).ToList();
            }

            // Return the context-specific event log(s) and the set of all available contexts
            return Ok(new {
                eventLog = eventLog,
                availableContexts = allContextsNoDups
            });
        }

        // A POST request to the todoevent endpoint will pass in a log of new events to use. Most often, this will just be
        // a single event, but the API will support an array of events, such that clients can implement batch-sending if needed.
        // After a successful save, this endpoint always returns the full, verified event log. I.e., exactly what will be returned
        // be the GET endpoint immediately after this POST completed. This allows the client POSTer to verify the results of the POST.
        [Authorize]
        [EnableCors("UserFacingApplications")]
        [HttpPost("/todoevents")]
        public async Task<IActionResult> PostNewEvents([FromBody] IList<GenericTodoEvent> newEvents) {
            // Populate the newEvents with the user's id string field, and make sure the eventId is null, so the DB is always responsible for populating it.
            string userId = User.FindFirst(googleSubjectClaimType).Value.Trim();
            foreach (GenericTodoEvent e in newEvents) {
                e.UserId = userId;
                e.EventId = 0;  // Manually set this to the 'default' value, so that the database can write to it instead.
                e.Context = e.Context.ToLower().Trim();
            }

            // Remove duplicate events from the incoming event list.
            newEvents = newEvents.OrderBy(e => e.Timestamp).ToHashSet(eventComparer).OrderBy(keySelector, keyComparer).ToList();

            // Detect duplicate events between those which have already been saved, and the new events.
            List<GenericTodoEvent> savedEvents = await dbContext.TodoEvents.Where(e => e.UserId.Equals(userId)).OrderBy(e => e.Timestamp).ToListAsync();
            HashSet<GenericTodoEvent> savedEventSet = savedEvents.ToHashSet(eventComparer); // Create a set of saved events, which uses our custom comparison logic as it's equality checker.
            var nonDups = newEvents.Where(e => !savedEventSet.Contains(e)).ToList();
            return await ValidateAndSave(nonDups, savedEvents, userId);
        }
        private async Task<IActionResult> ValidateAndSave(IList<GenericTodoEvent> newEvents, IList<GenericTodoEvent> savedEvents, string userId) {
            // Try to validate. If we fail, just save nothing and return a 409 to indicate the client's data is conflicting.
            EventLogReconciler logReconciler = new EventLogReconciler(savedEvents, keySelector, keyComparer, eventComparer);
            logReconciler.SimpleFullStateRebuildValidation(newEvents, out IList<GenericTodoEvent> acceptedEvents, out IList<GenericTodoEvent> skippedEvents, out bool eventsRejected, out bool shouldTriggerRefresh, out string err);

            if (eventsRejected) {
                return StatusCode(409, err);
            }
            else if (acceptedEvents.Count > 0) {
                IList<ContextMapping> newContexts = await DetectNewContexts(acceptedEvents, userId);
                if (newContexts.Count > 0) {
                    dbContext.ContextMappings.AddRange(newContexts);
                }
                dbContext.TodoEvents.AddRange(acceptedEvents);
                await dbContext.SaveChangesAsync();

                return ValidPostResponseData(skippedEvents, acceptedEvents, shouldTriggerRefresh);
            }
            else {
                return ValidPostResponseData(skippedEvents, acceptedEvents, shouldTriggerRefresh);
            }
        }
        private async Task<IList<ContextMapping>> DetectNewContexts(IList<GenericTodoEvent> events, string userId) {
            // Gather all of the current context data, in order to determine if we have any new contexts implied in the events we were just passed.
            List<ContextMapping> currentContexts = await dbContext.ContextMappings.Where(e => e.UserId.Equals(userId)).ToListAsync();
            HashSet<string> existingContextIds = currentContexts.Select(c => c.Id).ToHashSet();
            return events.Where(e => !existingContextIds.Contains(e.Context)).Select(e => e.Context).ToHashSet().Select(s => ContextMapping.BuildNewContext(s, userId)).ToList();
        }
        private IActionResult ValidPostResponseData(IList<GenericTodoEvent> skippedEvents, IList<GenericTodoEvent> savedEvents, bool shouldTriggerRefresh) {
            return Ok(new {
                triggerRefresh = shouldTriggerRefresh,
                eventsSaved = savedEvents.Select(e => new { e.Name, e.EventType }).ToArray(),
                eventsSkipped = skippedEvents.Select(e => new { e.Name, e.EventType }).ToArray()
            });
        }

        private void PrintClaimsPrincipal(ClaimsPrincipal userDetails) {
            logger.LogDebug(" ---> Logging User details <--- ");
            foreach (var claim in userDetails.Claims) {
                logger.LogDebug($"Claim from User.Claims collection: '{claim.Type}, {claim.Value}'");
            }
        }
    }
}
