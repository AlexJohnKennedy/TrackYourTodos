using System;
using System.Collections.Generic;
using System.Linq;

using todo_app.DomainLayer.TaskListModel;
using todo_app.DataTransferLayer.Entities;

namespace todo_app.DataTransferLayer.EventReconciliationSystem {
    
    public class EventLogReconciler {
        private IList<GenericTodoEvent> truthLog;   // Represents the 'official' event log, i.e., the log which is already saved in the database.

        public EventLogReconciler() {
            this.truthLog = new List<GenericTodoEvent>();
        }
        public EventLogReconciler(IList<GenericTodoEvent> truthLog) {
            this.truthLog = truthLog;   // Must be sorted.
        }

        // Method which reconciles incoming events (which are considered possibly invalid), with the current state
        // truth log. If new events create invalid states, it will reject them, except it will attempt to reconcile 
        // the logs such that it can keep as many of the new events as it can, whilst:
        //  a) Maintaining a valid state
        //  b) Keeping all of the original events
        //
        // Any new events which are successfully reconciled will subsequently become part of the truth log and update
        // this object's state, such that they are part of the truth log the next time this method is called.
        public void ReconcileNewEvents(IList<GenericTodoEvent> newEvents, out IList<GenericTodoEvent> acceptedEvents, out IList<GenericTodoEvent> rejectedEvents) {
            TaskList tasklist = new TaskList();
            IList<GenericTodoEvent> sorted = newEvents.OrderBy(e => e.Timestamp).ToList();
            
            // TODO: Recursive reconciliation algorithm. However, this requires UNDO operations to be implemented!

            acceptedEvents = new List<GenericTodoEvent>();
            rejectedEvents = new List<GenericTodoEvent>();
        }

        // This method is the simple solution: It will simply attempt to merge ALL the incoming events, and if any failures arise, at all, then
        // the entire set of incoming new events is rejected. This is more primitive than the search-reconcilitation solution, but is faster and
        // less complicated. So i'm going to implement it this way for now just to get fundamental event validation in place.
        // Returns TRUE if the new events are valid. Returns FALSE for any error case, regardless of which new events caused the error.
        public bool SimpleFullStateRebuildValidation(IList<GenericTodoEvent> newEvents, out string errorMsg) {
            TaskList tasklist = new TaskList();
            IList<GenericTodoEvent> sorted = newEvents.OrderBy(e => e.Timestamp).ToList();

            errorMsg = "";
            
            int i=0, j=0;   // i => index for truth log, j => index for new event log
            try {
                while (i < truthLog.Count || j < newEvents.Count) {
                    // Pick the oldest remaining event, and apply it
                    var nextEvent = (i == truthLog.Count || (j < newEvents.Count && newEvents[j].Timestamp < truthLog[i].Timestamp)) ? newEvents[j++] : truthLog[i++];
                    tasklist = EventReplayer.Replay(nextEvent, tasklist);
                }
            }
            // If any InvalidOperationExceptions are thrown, that means the event is invalid, and we should return false.
            catch (InvalidOperationException e) {
                errorMsg = e.Message;
                return false;
            }
            return true;
        }
    }

    public static class EventReplayer {
        // Define a function signature type which represents a function which can apply an event to a tasklist model object.
        public delegate TaskList EventReplayFunc(GenericTodoEvent e, TaskList tasklist);

        // Define a map of handler funcs.
        public static readonly Dictionary<string, EventReplayFunc> Handlers = new Dictionary<string, EventReplayFunc>() {
            { EventTypes.TaskAdded, (e, t) => {
                t.CreateNewIndependentTask(e.Name, e.Category, e.Timestamp, e.ColourId, e.Id);
                return t;
            }},
            { EventTypes.ChildTaskAdded, (e, t) => {
                if (!e.Parent.HasValue) throw new InvalidOperationException("You must specify a parent if you are adding a new subtask!");
                Task parent = t.AllTaskReader(e.Parent.Value);
                t.CreateNewSubtask(e.Name, parent, e.Category, e.Timestamp, e.Id);
                return t;
            }},
            { EventTypes.TaskActivated, (e, t) => {
                Task toActivate = t.AllTaskReader(e.Id);
                if (toActivate == null) throw new InvalidOperationException("Cannot activate a task we could not find");
                t.ActivateTask(toActivate, e.Category, e.Timestamp);
                return t;
            }},
            { EventTypes.TaskStarted, (e, t) => {
                Task toStart = t.ActiveTaskReader(e.Id);
                if (toStart == null) throw new InvalidOperationException("Cannot start a task we could not find in our active task collection");
                t.StartTask(toStart, e.Timestamp);
                return t;
            }},
            { EventTypes.TaskCompleted, (e, t) => {
                Task toComplete = t.ActiveTaskReader(e.Id);
                if (toComplete == null) throw new InvalidOperationException("Cannot complete a task we could not find in our active task collection");
                t.CompletedTask(toComplete, e.Timestamp);
                return t;
            }},
            { EventTypes.TaskFailed, (e, t) => {
                Task toFail = t.ActiveTaskReader(e.Id);
                if (toFail == null) throw new InvalidOperationException("Cannot fail a task we could not find in our active task collection");
                t.FailTask(toFail, e.Timestamp);
                return t;
            }},
            { EventTypes.TaskRevived, (e, t) => {
                Task original = t.FailedTaskReader(e.Original.Value);
                if (original == null) throw new InvalidOperationException("Cannot revive a task which was not found in the failed tasks collection!");
                if (e.Category == CategoryVals.Deferred) t.ReviveTaskAsClone(original, false, e.Timestamp, e.Id);
                else t.ReviveTaskAsClone(original, true, e.Timestamp, e.Id);
                return t;
            }},
            { EventTypes.TaskDeleted, (e, t) => {
                throw new NotImplementedException("Validation for Task Deletion events not currently supported, because Deleted Events are not part of app intention at this time.");
            }}
        };

        public static TaskList Replay(GenericTodoEvent e, TaskList tasklist) {
            // Should never not be present, since the ModelBinding validation should be only allowing correct event type strings to here!
            return Handlers[e.EventType](e, tasklist);
        } 
    }
}