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
        public void SimpleFullStateRebuildValidation(IList<GenericTodoEvent> newEvents, out IList<GenericTodoEvent> acceptedEvents, out IList<GenericTodoEvent> skippedEvents, out bool rejected, out bool shouldTriggerRefresh, out string errorMsg) {
            TaskList tasklist = new TaskList();
            Stack<UndoAction> undoStack = new Stack<UndoAction>();
            ISet<GenericTodoEvent> newEventSet = newEvents.ToHashSet(eventComparer);
            errorMsg = "";
            acceptedEvents = new List<GenericTodoEvent>(newEvents.Count);
            skippedEvents = new List<GenericTodoEvent>(newEvents.Count);
            shouldTriggerRefresh = false;
            rejected = false;
            GenericTodoEvent eventUnderQuestion = null;     // Used in catch scenarios.
            int eventNum = 0;                               // Used in catch scenarios.

            // Create the full event log. We will attempt to execute these events in order, validating the state each time.
            IList<GenericTodoEvent> fullEventLog = truthLog.Concat(newEvents).OrderBy(keySelector, keyComparer).ToList();

            try {
                foreach (GenericTodoEvent currEvent in fullEventLog) {
                    eventUnderQuestion = currEvent;
                    eventNum++;

                    // Try to apply the event, and examine the validation results.
                    tasklist = EventReplayer.Replay(currEvent, tasklist, undoStack, out bool saveIfNewEvent, out bool demandsRefresh);
                    
                    // Only save the event if the event replay does not want to skip it, AND the event has not already been saved (i.e. is 'new')
                    if (saveIfNewEvent && newEventSet.Contains(currEvent)) { acceptedEvents.Add(currEvent); }
                    else if (!saveIfNewEvent && newEventSet.Contains(currEvent)) { skippedEvents.Add(currEvent); }

                    // Signal if validating this particular event means that the client should probably refresh their data. (E.g. they are clearly out of date).
                    if (demandsRefresh) { shouldTriggerRefresh = true; }
                }
            }
            // If any InvalidOperationExceptions are thrown, that means the eventlog as a whole is invalid, and nothing should be saved.
            // This is our response if we deem that the posted events are so out-of-sync and inherently incompatible with the truth log, that
            // it would be dangerous to attempt any kind of saving from these events.
            catch (InvalidOperationException e) {
                errorMsg = "The following error occurred when trying to replay event { " + eventUnderQuestion.EventType + ", " + eventUnderQuestion.Name + " }. The event was event " + eventNum + " out of " + fullEventLog.Count + " events in the event log. Error message: " + e.Message;
                errorMsg = errorMsg + buildFullEventLogErrorMessage(fullEventLog);
                rejected = true;
                shouldTriggerRefresh = true;
            }
        }

        private string buildFullEventLogErrorMessage(IList<GenericTodoEvent> log) {
            string s = "\nFull Event Log which was validated against during error:\n";
            int i=1;
            foreach (GenericTodoEvent e in log) {
                s = s + $"Event {i} => Time: {e.Timestamp} - {{  {e.EventType}, {e.Name} }}\n";
                i++;
            }
            return s;
        }
    }

    public class UndoAction {
        public string EventType { get; }
        public Guid Id { get; }
        public UndoAction(string eventType, Guid id) {
            EventType = eventType;
            Id = id;
        }
    }
    public class UndoDeletionAction : UndoAction {
        public Task Task { get; }
        public UndoDeletionAction(Guid id, Task task) : base(EventTypes.TaskDeleted, id) {
            Task = task;
        }
    }

    public static class EventReplayer {
        // Define a function signature type which represents a function which can apply an event to a tasklist model object.
        public delegate TaskList EventReplayFunc(GenericTodoEvent e, TaskList tasklist, Stack<UndoAction> undoStack);

        // Define a map of handler funcs.
        private static readonly Dictionary<string, EventReplayFunc> Handlers = new Dictionary<string, EventReplayFunc>() {
            { EventTypes.TaskAdded, (e, t, undoStack) => {
                t.CreateNewIndependentTask(e.Name, e.Category, e.Timestamp, e.ColourId, e.Id);
                undoStack.Push(new UndoAction(EventTypes.TaskAdded, e.Id));
                return t;
            }},
            { EventTypes.ChildTaskAdded, (e, t, undoStack) => {
                if (!e.Parent.HasValue) throw new InvalidOperationException("You must specify a parent if you are adding a new subtask!");
                Task parent = t.AllTaskReader(e.Parent.Value);
                t.CreateNewSubtask(e.Name, parent, e.Category, e.Timestamp, e.Id);
                undoStack.Push(new UndoAction(EventTypes.ChildTaskAdded, e.Id));
                return t;
            }},
            { EventTypes.TaskActivated, (e, t, undoStack) => {
                Task toActivate = t.AllTaskReader(e.Id);
                t.ActivateTask(toActivate, e.Category, e.Timestamp);
                undoStack.Push(new UndoAction(EventTypes.TaskActivated, e.Id));
                return t;
            }},
            { EventTypes.TaskStarted, (e, t, undoStack) => {
                Task toStart = t.ActiveTaskReader(e.Id);
                if (toStart == null) throw new InvalidOperationException("Cannot start a task we could not find in our active task collection");
                t.StartTask(toStart, e.Timestamp);
                undoStack.Push(new UndoAction(EventTypes.TaskStarted, e.Id));
                return t;
            }},
            { EventTypes.TaskCompleted, (e, t, undoStack) => {
                Task toComplete = t.ActiveTaskReader(e.Id);
                if (toComplete == null) throw new InvalidOperationException("Cannot complete a task we could not find in our active task collection");
                t.CompletedTask(toComplete, e.Timestamp);
                undoStack.Push(new UndoAction(EventTypes.TaskCompleted, e.Id));
                return t;
            }},
            { EventTypes.TaskFailed, (e, t, undoStack) => {
                Task toFail = t.ActiveTaskReader(e.Id);
                if (toFail == null) throw new InvalidOperationException("Cannot fail a task we could not find in our active task collection");
                t.FailTask(toFail, e.Timestamp);
                undoStack.Clear();
                return t;
            }},
            { EventTypes.TaskRevived, (e, t, undoStack) => {
                Task original = t.FailedTaskReader(e.Original.Value);
                if (original == null) throw new InvalidOperationException("Cannot revive a task which was not found in the failed tasks collection!");
                if (e.Category == CategoryVals.Deferred) t.ReviveTaskAsClone(original, false, e.Timestamp, e.Id);
                else t.ReviveTaskAsClone(original, true, e.Timestamp, e.Id);
                undoStack.Push(new UndoAction(EventTypes.TaskRevived, e.Id));
                return t;
            }},
            { EventTypes.TaskEdited, (e, t, undoStack) => {
                Task task = t.AllTaskReader(e.Id);
                if (task == null) throw new InvalidOperationException("Cannot rename a task we could not find in our task collection");
                t.EditTaskText(task, e.Name, e.Timestamp);
                undoStack.Push(new UndoAction(EventTypes.TaskEdited, e.Id));
                return t;
            }},
            { EventTypes.TaskDeleted, (e, t, undoStack) => {
                Task task = t.AllTaskReader(e.Id);
                if (task == null) throw new InvalidOperationException("Cannot delete a task we could not find in our task collection");
                t.AbandonTask(task);
                undoStack.Push(new UndoDeletionAction(e.Id, task));
                return t;
            }},
            { EventTypes.TaskAddedUndo, (e, t, undoStack) => {
                Task task = t.ActiveTaskReader(e.Id);
                if (task == null) throw new InvalidOperationException("Cannot undo-create a task we could not find in our active task collection");
                if (undoStack.Count == 0 || undoStack.Peek().EventType != EventTypes.TaskAdded || undoStack.Peek().Id != e.Id) throw new InvalidOperationException("Invalid undo: Undo event wanted to undo an action which was not the latest ocurring action");
                undoStack.Pop();
                t.UndoCreateNewIndependentTask(task);
                return t;
            }},
            { EventTypes.ChildTaskAddedUndo, (e, t, undoStack) => {
                Task task = t.ActiveTaskReader(e.Id);
                if (task == null) throw new InvalidOperationException("Cannot undo-create a task we could not find in our active task collection");
                if (undoStack.Count == 0 || undoStack.Peek().EventType != EventTypes.ChildTaskAdded || undoStack.Peek().Id != e.Id) throw new InvalidOperationException("Invalid undo: Undo event wanted to undo an action which was not the latest ocurring action");
                undoStack.Pop();
                t.UndoCreateNewSubtask(task);
                return t;
            }},
            { EventTypes.TaskRevivedUndo, (e, t, undoStack) => {
                Task originalTask = t.FailedTaskReader(e.Original.Value);
                Task newTask = t.ActiveTaskReader(e.Id);
                if (originalTask == null || newTask == null) throw new InvalidOperationException("Cannot undo revival of tasks we could not find");
                if (undoStack.Count == 0 || undoStack.Peek().EventType != EventTypes.TaskRevived || undoStack.Peek().Id != e.Id) throw new InvalidOperationException("Invalid undo: Undo event wanted to undo an action which was not the latest ocurring action");
                undoStack.Pop();
                t.UndoReviveTaskAsClone(newTask, originalTask);
                return t;
            }},
            { EventTypes.TaskDeletedUndo, (e, t, undoStack) => {
                if (undoStack.Count == 0 || undoStack.Peek().EventType != EventTypes.TaskDeleted || undoStack.Peek().Id != e.Id) throw new InvalidOperationException("Invalid undo: Undo event wanted to undo an action which was not the latest ocurring action");
                if (!(undoStack.Peek() is UndoDeletionAction)) throw new InvalidCastException("UndoAction with TaskDeleted type should always be an UndoDeletionAction sub-type!!");
                Task task = ((UndoDeletionAction)undoStack.Pop()).Task;
                if (task == null) throw new InvalidOperationException("Cannot undo deletion of task which was not created to begin with");
                t.UndoAbandonTask(task);
                return t;
            }},
            { EventTypes.TaskCompletedUndo, (e, t, undoStack) => {
                Task task = t.CompletedTaskReader(e.Id);
                if (task == null) throw new InvalidOperationException("Cannot undo completion, could not find task in completed list");
                if (undoStack.Count == 0 || undoStack.Peek().EventType != EventTypes.TaskCompleted || undoStack.Peek().Id != e.Id) throw new InvalidOperationException("Invalid undo: Undo event wanted to undo an action which was not the latest ocurring action");
                undoStack.Pop();
                t.UndoCompleteTask(task);
                return t;
            }},
            { EventTypes.TaskActivatedUndo, (e, t, undoStack) => {
                Task task = t.ActiveTaskReader(e.Id);
                if (task == null) throw new InvalidOperationException("Cannot undo activation, could not find task");
                if (undoStack.Count == 0 || undoStack.Peek().EventType != EventTypes.TaskActivated || undoStack.Peek().Id != e.Id) throw new InvalidOperationException("Invalid undo: Undo event wanted to undo an action which was not the latest ocurring action");
                undoStack.Pop();
                t.UndoActivateTask(task);
                return t;
            }},
            { EventTypes.TaskStartedUndo, (e, t, undoStack) => {
                Task task = t.ActiveTaskReader(e.Id);
                if (task == null) throw new InvalidOperationException("Cannot undo start task, task was not in active task list");
                if (undoStack.Count == 0 || undoStack.Peek().EventType != EventTypes.TaskStarted || undoStack.Peek().Id != e.Id) throw new InvalidOperationException("Invalid undo: Undo event wanted to undo an action which was not the latest ocurring action");
                undoStack.Pop();
                t.UndoStartTask(task);
                return t;
            }},
            { EventTypes.TaskEditedUndo, (e, t, undoStack) => {
                Task task = t.ActiveTaskReader(e.Id);
                if (task == null) throw new InvalidOperationException("Cannot undo edit of task we could not find in our collection");
                if (undoStack.Count == 0 || undoStack.Peek().EventType != EventTypes.TaskEdited || undoStack.Peek().Id != e.Id) throw new InvalidOperationException("Invalid undo: Undo event wanted to undo an action which was not the latest ocurring action");
                undoStack.Pop();
                t.UndoEditTaskText(task, e.Name, e.RevertedEventTimestamp.Value);
                return t;
            }}
        };

        // WARNING! ONLY APPLICABLE IF NOT DEFERRED!
        private static readonly Dictionary<int, HashSet<string>> IncomingEventsToIgnoreForProgressStatusMappings = new Dictionary<int, HashSet<string>>() {
            { ProgressStatusVals.NotStarted, new HashSet<string>() {
                EventTypes.TaskAdded, EventTypes.ChildTaskAdded, EventTypes.TaskActivated
            }},
            { ProgressStatusVals.Started, new HashSet<string>() {
                EventTypes.TaskAdded, EventTypes.ChildTaskAdded, EventTypes.TaskActivated, EventTypes.TaskStarted
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
        private static readonly Dictionary<int, HashSet<string>> IncomingEventsToSaveButNotExecuteForProgressStatusMappings = new Dictionary<int, HashSet<string>>() {
            { ProgressStatusVals.NotStarted, new HashSet<string>() {
                EventTypes.TaskStartedUndo
            }},
            { ProgressStatusVals.Started, new HashSet<string>() {
                EventTypes.TaskCompletedUndo
            }},
            { ProgressStatusVals.Completed, new HashSet<string>() {
                /* None */
            }},
            { ProgressStatusVals.Failed, new HashSet<string>() {
                EventTypes.TaskRevivedUndo
            }},
            { ProgressStatusVals.Reattempted, new HashSet<string>() {
                /* None */
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

        // Mappings which denotes incoming events, per progress state, which are valid with 1 'missing' event link. The returned dictionary
        // denotes which linking events link to the incoming event.
        // (ProgressStatus, (IncomingEventType, LinkingEventType which makes the incoming event valid))
        private static readonly Dictionary<int, Dictionary<string, string>> IncomingEventsWithLinkingEventProgressStatusMappings = new Dictionary<int, Dictionary<string, string>>() {
            { ProgressStatusVals.NotStarted, new Dictionary<string, string>() {
                { EventTypes.TaskCompleted, EventTypes.TaskStarted },
                { EventTypes.TaskRevived, EventTypes.TaskFailed }
            }},
            { ProgressStatusVals.Started, new Dictionary<string, string>() {
                { EventTypes.TaskRevived, EventTypes.TaskFailed }
            }},
            { ProgressStatusVals.Completed, new Dictionary<string, string>() { /* None */ } },
            { ProgressStatusVals.Failed, new Dictionary<string, string>() { /* None */ } },
            { ProgressStatusVals.Reattempted, new Dictionary<string, string>() { /* None */ } }
        };

        public static TaskList Replay(GenericTodoEvent e, TaskList tasklist, Stack<UndoAction> undoStack, out bool saveEvent, out bool triggerRefresh) {
            saveEvent = true;
            triggerRefresh = false;

            // Acquire the task from the global task list, to determine it's current state.
            Task task = tasklist.AllTaskReader(e.Id);
           
            try {

                // Handle cases where the task does not yet exist. If the event is a creation event, (or undo deletion event) then this is obviously expected.
                // If the event is an 'undo' of a creation event, then we can safely dispose of the event, since it would just erase the expected task anyway. We will still save it though, in case of an out-or-order arrival
                // If the event is a 'Task activated' or 'Task Started' or 'Task Edited' event, then we will create the event implicitly, since we can do so with no harm done.
                if (task == null) {
                    if (e.EventType == EventTypes.TaskAdded || e.EventType == EventTypes.ChildTaskAdded || e.EventType == EventTypes.TaskRevived || e.EventType == EventTypes.TaskDeletedUndo) {
                        return Handlers[e.EventType](e, tasklist, undoStack);
                    }
                    else if (e.EventType == EventTypes.TaskAddedUndo || e.EventType == EventTypes.ChildTaskAddedUndo || e.EventType == EventTypes.TaskEdited || e.EventType == EventTypes.TaskDeleted) {
                        // Save the event, but do not actually do anything. We will still save this event incase a subsequent request 'fills in the gap' so to speak (I.e. out of order arrival).
                        saveEvent = true;
                        triggerRefresh = false;
                        return tasklist;
                    }
                    else if (e.EventType == EventTypes.TaskActivated || e.EventType == EventTypes.TaskStarted) {
                        // If the task does not exist yet, we are happy to create it implicitly.
                        if (e.Parent.HasValue) { tasklist.CreateNewSubtask(e.Name, tasklist.AllTaskReader(e.Parent.Value), e.Category, e.Timestamp, e.Id); }
                        else { tasklist.CreateNewIndependentTask(e.Name, e.Category, e.Timestamp, e.ColourId, e.Id); }
                        return Handlers[e.EventType](e, tasklist, undoStack);
                    }
                    else {
                        throw new InvalidOperationException("Illegal event applied to a task id with no-corresponding-existing task. Eventtype: " + e.EventType);
                    }
                }
                // Handle cases where the task is deferred.
                // If the event is a creation event, we can safely dispose of the event without saving it, because the task has already progressed to a state beyond the state that those incoming events cause.
                // If the event is an undo-activation event, or undo-deletion event, we can skip execution of the event, but it must still be saved in order to handle out-of-order arrival; for example an activation event could 'fill the gap'.
                // If the event is a 'start task' or 'fail task', we are happy to fill in the implicit activation action.
                else if (task.Category == CategoryVals.Deferred) {
                    if (e.EventType == EventTypes.TaskAdded || e.EventType == EventTypes.ChildTaskAdded) {
                        // Throw this event away, it is harmless and uneeded in this case.
                        saveEvent = false;
                        triggerRefresh = false;
                        return tasklist;
                    }
                    else if (e.EventType == EventTypes.TaskActivatedUndo || e.EventType == EventTypes.TaskDeletedUndo) {
                        // Save this event, but do not execute the replay of this event, since it would have no effect. We still save it to handle out of order arrival.
                        saveEvent = true;
                        triggerRefresh = false;
                        return tasklist;
                    }
                    else if (e.EventType == EventTypes.TaskStarted || e.EventType == EventTypes.TaskFailed) {
                        tasklist.ActivateTask(task, e.Category, e.Timestamp);
                        return Handlers[e.EventType](e, tasklist, undoStack);
                    }
                    else {
                        return Handlers[e.EventType](e, tasklist, undoStack);
                    }
                }
                // Handle the cases where the state is denoted by progress status of the task (the only remaining option)
                else {
                    if (IncomingEventsWhichTriggerRefreshForProgressStatusMappings[task.ProgressStatus].Contains(e.EventType)) {
                        triggerRefresh = true;
                    }
                    if (IncomingEventsToIgnoreForProgressStatusMappings[task.ProgressStatus].Contains(e.EventType)) {
                        saveEvent = false;
                        return tasklist;
                    }
                    if (IncomingEventsToSaveButNotExecuteForProgressStatusMappings[task.ProgressStatus].Contains(e.EventType)) {
                        saveEvent = true;
                        return tasklist;
                    }
                    if (IncomingEventsWithLinkingEventProgressStatusMappings[task.ProgressStatus].ContainsKey(e.EventType)) {
                        // This is a valid incoming event type, but we must 'link' it by executing the implicit event which is currently missing.
                        Handlers[IncomingEventsWithLinkingEventProgressStatusMappings[task.ProgressStatus][e.EventType]](e, tasklist, undoStack);
                    }

                    return Handlers[e.EventType](e, tasklist, undoStack);
                }
            }
            catch (InvalidOperationException exception) {
                // Add additional loggable information about the error that was thrown.
                throw new InvalidOperationException(exception.Message + ". When this error was thrown, the task was in state: " + 
                ((task == null) ? "NON-EXISTENT (NULL)" : (task.Category == CategoryVals.Deferred) ? "Deferred" : ProgressStatusVals.getString(task.ProgressStatus)),
                exception);
            }
        }


    }
}