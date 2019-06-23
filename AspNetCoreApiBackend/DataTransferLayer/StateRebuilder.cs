using System;
using System.Collections.Generic;
using System.Linq;

using todo_app.DomainLayer.TaskListModel;
using todo_app.DataTransferLayer.Entities;

namespace todo_app.DataTransferLayer.EventReconciliationSystem {
    
    public class EventLogReconciler {
        // Define functions to use to determine event log ordering. Timestamp, and break ties based on event type precedence. (I.e. Created always preceedes started)        
        private readonly Func<GenericTodoEvent, EventOrderingKey> keySelector;
        private readonly Comparer<EventOrderingKey> keyComparer;
        private readonly IEqualityComparer<GenericTodoEvent> eventComparer;

        private IList<GenericTodoEvent> truthLog;   // Represents the 'official' event log, i.e., the log which is already saved in the database.

        public EventLogReconciler(IList<GenericTodoEvent> truthLog, Func<GenericTodoEvent, EventOrderingKey> keySelector, Comparer<EventOrderingKey> keyComparer, IEqualityComparer<GenericTodoEvent> eventComparer) {
            this.keyComparer = keyComparer;
            this.keySelector = keySelector;
            this.eventComparer = eventComparer;
            this.truthLog = truthLog;
        }

        // Validation algorithm. Replays events, and depending on circumstances, sets flags which inform the caller how to save/reject/respond to the incoming
        // events.
        public void SimpleFullStateRebuildValidation(IList<GenericTodoEvent> newEvents, out IList<GenericTodoEvent> acceptedEvents, out bool rejected, out bool shouldTriggerRefresh, out string errorMsg) {
            TaskList tasklist = new TaskList();
            ISet<GenericTodoEvent> newEventSet = newEvents.ToHashSet(eventComparer);
            errorMsg = "";
            acceptedEvents = new List<GenericTodoEvent>(newEvents.Count);
            shouldTriggerRefresh = false;
            rejected = false;

            // Create the full event log. We will attempt to execute these events in order, validating the state each time.
            IList<GenericTodoEvent> fullEventLog = truthLog.Concat(newEvents).OrderBy(keySelector, keyComparer).ToList();

            try {
                foreach (GenericTodoEvent currEvent in fullEventLog) {
                    // Try to apply the event, and examine the validation results.
                    tasklist = EventReplayer.Replay(currEvent, tasklist, out bool saveIfNewEvent, out bool demandsRefresh);
                    
                    // Only save the event if the event replay does not want to skip it, AND the event has not already been saved (i.e. is 'new')
                    if (saveIfNewEvent && newEventSet.Contains(currEvent)) { acceptedEvents.Add(currEvent); }
                    if (demandsRefresh) { shouldTriggerRefresh = true; }
                }
            }
            // If any InvalidOperationExceptions are thrown, that means the eventlog as a whole is invalid, and nothing should be saved.
            // This is our response if we deem that the posted events are so out-of-sync and inherently incompatible with the truth log, that
            // it would be dangerous to attempt any kind of saving from these events.
            catch (InvalidOperationException e) {
                errorMsg = e.Message;
                rejected = true;
                shouldTriggerRefresh = true;
            }
        }
    }

    public static class EventReplayer {
        // Define a function signature type which represents a function which can apply an event to a tasklist model object.
        public delegate TaskList EventReplayFunc(GenericTodoEvent e, TaskList tasklist);

        private static bool save;
        private static bool refresh;

        // Define a map of handler funcs.
        private static readonly Dictionary<string, EventReplayFunc> Handlers = new Dictionary<string, EventReplayFunc>() {
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
                // If the task does not exist yet, we are happy to create it implicitly.
                if (toActivate == null) {
                    if (e.Parent.HasValue) {  toActivate = t.CreateNewSubtask(e.Name, t.AllTaskReader(e.Parent.Value), e.Category, e.Timestamp, e.Id); }
                    else { toActivate = t.CreateNewIndependentTask(e.Name, e.Category, e.Timestamp, e.ColourId, e.Id); }
                }
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
            { EventTypes.TaskEdited, (e, t) => {
                Task task = t.AllTaskReader(e.Id);
                if (task == null) throw new InvalidOperationException("Cannot rename a task we could not find in our task collection");
                t.EditTaskText(task, e.Name, e.Timestamp);
                return t;
            }},
            { EventTypes.TaskDeleted, (e, t) => {
                throw new NotImplementedException("Validation for Task Deletion events not currently supported, because Deleted Events are not part of app intention at this time.");
            }},
            { EventTypes.TaskAddedUndo, (e, t) => {
                Task task = t.ActiveTaskReader(e.Id);
                if (task == null) throw new InvalidOperationException("Cannot undo-create a task we could not find in our active task collection");
                t.UndoCreateNewIndependentTask(task);
                return t;
            }},
            { EventTypes.ChildTaskAddedUndo, (e, t) => {
                Task task = t.ActiveTaskReader(e.Id);
                if (task == null) throw new InvalidOperationException("Cannot undo-create a task we could not find in our active task collection");
                t.UndoCreateNewSubtask(task);
                return t;
            }},
            { EventTypes.TaskRevivedUndo, (e, t) => {
                Task originalTask = t.FailedTaskReader(e.Id);
                Task newTask = t.ActiveTaskReader(e.Id);
                if (originalTask == null || newTask == null) throw new InvalidOperationException("Cannot undo revival of tasks we could not find");
                t.UndoReviveTaskAsClone(newTask, originalTask);
                return t;
            }},
            { EventTypes.TaskDeletedUndo, (e, t) => {
                throw new NotImplementedException("Validation for Undo-TaskDeletion events not currently supported, because Deleted Events are not part of app intention at this time.");
            }},
            { EventTypes.TaskCompletedUndo, (e, t) => {
                Task task = t.CompletedTaskReader(e.Id);
                if (task == null) throw new InvalidOperationException("Cannot undo completion, could not find task in completed list");
                t.UndoCompleteTask(task);
                return t;
            }},
            { EventTypes.TaskActivatedUndo, (e, t) => {
                Task task = t.ActiveTaskReader(e.Id);
                if (task == null) throw new InvalidOperationException("Cannot undo activation, could not find task");
                t.UndoActivateTask(task);
                return t;
            }},
            { EventTypes.TaskStartedUndo, (e, t) => {
                Task task = t.ActiveTaskReader(e.Id);
                if (task == null) throw new InvalidOperationException("Cannot undo start task, task was not in active task list");
                t.UndoStartTask(task);
                return t;
            }},
            { EventTypes.TaskEditedUndo, (e, t) => {
                Task task = t.AllTaskReader(e.Id);
                if (task == null) throw new InvalidOperationException("Cannot undo edit of task we could not find in our collection");
                t.UndoEditTaskText(task, e.Name, e.RevertedEventTimestamp.Value);
                return t;
            }}
        };

        // WARNING! ONLY APPLICABLE IF NOT DEFERRED!
        private static readonly Dictionary<int, HashSet<string>> IncomingEventsToIgnoreForProgressStatusMappings = new Dictionary<int, HashSet<string>>() {
            { ProgressStatusVals.NotStarted, new HashSet<string>() {
                EventTypes.TaskAdded, EventTypes.ChildTaskAdded, EventTypes.TaskActivated, EventTypes.TaskStartedUndo
            }},
            { ProgressStatusVals.Started, new HashSet<string>() {
                EventTypes.TaskAdded, EventTypes.ChildTaskAdded, EventTypes.TaskActivated, EventTypes.TaskStarted, EventTypes.TaskCompletedUndo
            }},
            { ProgressStatusVals.Completed, new HashSet<string>() {
                EventTypes.TaskAdded, EventTypes.ChildTaskAdded, EventTypes.TaskActivated, EventTypes.TaskStarted, EventTypes.TaskCompleted
            }},
            { ProgressStatusVals.Failed, new HashSet<string>() {
                EventTypes.TaskAdded, EventTypes.ChildTaskAdded, EventTypes.TaskActivated, EventTypes.TaskStarted, EventTypes.TaskFailed, EventTypes.TaskRevivedUndo
            }},
            { ProgressStatusVals.Reattempted, new HashSet<string>() {
                EventTypes.TaskAdded, EventTypes.ChildTaskAdded, EventTypes.TaskActivated, EventTypes.TaskStarted, EventTypes.TaskFailed, EventTypes.TaskRevived
            }}
        };

        // WARNING! ONLY APPLICABLE IF NOT DEFERRED!
        private static readonly Dictionary<int, HashSet<string>> IncomingEventsWhichTriggerRefreshForProgressStatusMappings = new Dictionary<int, HashSet<string>>() {
            { ProgressStatusVals.NotStarted, new HashSet<string>() {
                /* None */
            }},
            { ProgressStatusVals.Started, new HashSet<string>() {
                EventTypes.TaskAdded, EventTypes.ChildTaskAdded, EventTypes.TaskActivated
            }},
            { ProgressStatusVals.Completed, new HashSet<string>() {
                EventTypes.TaskAdded, EventTypes.ChildTaskAdded, EventTypes.TaskActivated, EventTypes.TaskStarted
            }},
            { ProgressStatusVals.Failed, new HashSet<string>() {
                EventTypes.TaskAdded, EventTypes.ChildTaskAdded, EventTypes.TaskActivated, EventTypes.TaskStarted
            }},
            { ProgressStatusVals.Reattempted, new HashSet<string>() {
                EventTypes.TaskAdded, EventTypes.ChildTaskAdded, EventTypes.TaskActivated, EventTypes.TaskStarted, EventTypes.TaskFailed
            }}
        };

        public static TaskList Replay(GenericTodoEvent e, TaskList tasklist, out bool saveEvent, out bool triggerRefresh) {
            saveEvent = true;
            triggerRefresh = false;

            var toRet = Handlers[e.EventType](e, tasklist);
            
            saveEvent = save;
            triggerRefresh = refresh;
            
            return toRet;
        } 
    }
}