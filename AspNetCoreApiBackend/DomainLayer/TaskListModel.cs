using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

// This name space replicates the business logic from the client side. It also has the ability to
// 'replay' data-events in order to rebuild the domain state. In so doing, we can verify if a given
// event is valid for the user.
namespace todo_app.DomainLayer.TaskListModel {

    // Define the valid event type strings.
    public static class EventTypes {
        public const string TaskAdded = "taskCreated";
        public const string ChildTaskAdded = "subtaskCreated";
        public const string TaskRevived = "taskRevived";
        public const string TaskDeleted = "taskDeleted";
        public const string TaskCompleted = "taskCompleted";
        public const string TaskFailed = "taskFailed";
        public const string TaskActivated = "taskActivated";
        public const string TaskStarted = "taskStarted";
        public const string TaskEdited = "taskEdited";

        public const string TaskAddedUndo = "taskCreatedUndo";
        public const string ChildTaskAddedUndo = "subtaskCreatedUndo";
        public const string TaskRevivedUndo = "taskRevivedUndo";
        public const string TaskDeletedUndo = "taskDeletedUndo";
        public const string TaskCompletedUndo = "taskCompletedUndo";
        public const string TaskActivatedUndo = "taskActivatedUndo";
        public const string TaskStartedUndo = "taskStartedUndo";
        public const string TaskEditedUndo = "taskEditedUndo";

        public static readonly HashSet<string> ValidEventStrings = new HashSet<string>() {
            TaskAdded, ChildTaskAdded, TaskRevived, TaskDeleted, TaskCompleted, TaskFailed, TaskActivated, TaskStarted, TaskEdited,
            TaskAddedUndo, ChildTaskAddedUndo, TaskRevivedUndo, TaskDeletedUndo, TaskCompletedUndo, TaskActivatedUndo, TaskStartedUndo, TaskEditedUndo
        };
        public static readonly Dictionary<string, int> PrecedenceOrderingValues = new Dictionary<string, int>() {
            // Task created events must occur before any other action can occur on that event, thus they are the 'earliest' precedence
            { TaskAdded, 0 },
            { ChildTaskAdded, 0 },
            { TaskRevived, 0 },
            { TaskAddedUndo, 1 },
            { ChildTaskAddedUndo, 1 },
            { TaskRevivedUndo, 1 },
            // Tasks cannot be activated after starting, thus activation comes next.
            { TaskEdited, 2 },
            { TaskActivated, 2 },
            { TaskEditedUndo, 3 },
            { TaskActivatedUndo, 3 },
            // Tasks cannot be started after are deletd, completed or failed, thus started comes next.
            { TaskStarted, 4 },
            { TaskStartedUndo, 5 },
            // Tasks cannot be deleted after being close, thus deletion comes next.
            { TaskDeleted, 6 },
            { TaskDeletedUndo, 7 },
            // Task closure comes next. Lets favour failure over completed, just to be mean.
            { TaskFailed, 8 },
            { TaskCompleted, 9 },
            { TaskCompletedUndo, 10 }
        };
    }

    // Define Progress status values to match Client application.
    public static class CategoryVals {
        public const int Goal = 0;
        public const int Weekly = 1;
        public const int Daily = 2;
        public const int Deferred = 3;

        public static readonly HashSet<int> ValidValues = new HashSet<int>() {Goal, Weekly, Daily, Deferred};
        public static readonly int MaxIndex = Enumerable.Max(ValidValues);
        public static readonly int MinIndex = Enumerable.Min(ValidValues);
    }

    // Define Category values to match Client application.
    public static class ProgressStatusVals {
        public const int NotStarted = 0;
        public const int Started = 1;
        public const int Completed = 2;
        public const int Aborted = 3;
        public const int Failed = 4;
        public const int Reattempted = 5;

        public static readonly HashSet<int> ValidValues = new HashSet<int>() {NotStarted, Started, Completed, Aborted, Failed, Reattempted};
        public static readonly HashSet<int> ActiveTaskValues = new HashSet<int>() {NotStarted, Started};
        public static readonly HashSet<int> ClosedTaskValues = new HashSet<int>() {Completed, Aborted, Failed, Reattempted};
        public static readonly int MaxIndex = Enumerable.Max(ValidValues);
        public static readonly int MinIndex = Enumerable.Min(ValidValues);
    }

    // Collection of tasks.
    public class TaskList {
        // Store all tasks, mapped by ID
        private Dictionary<Guid, Task> allTasks;
        private Dictionary<Guid, Task> activeTasks;    // Goals, Weekly, Daily, and Deferred.
        private Dictionary<Guid, Task> failedTasks;    // Graveyard.
        private Dictionary<Guid, Task> completedTasks; // Completed.

        // Reader funcs
        public Func<Guid, Task> AllTaskReader { get { return i => allTasks.ContainsKey(i) ? allTasks[i] : null; } }
        public Func<Guid, Task> ActiveTaskReader { get { return i => activeTasks.ContainsKey(i) ? activeTasks[i] : null; } }
        public Func<Guid, Task> FailedTaskReader { get { return i => failedTasks.ContainsKey(i) ? failedTasks[i] : null; } }
        public Func<Guid, Task> CompletedTaskReader { get { return i => completedTasks.ContainsKey(i) ? completedTasks[i] : null; } }
        public IEnumerable<Task> AllTasks { get { return allTasks.Values; } }
        public IEnumerable<Task> ActiveTasks { get { return activeTasks.Values; } }
        public IEnumerable<Task> FailedTasks { get { return failedTasks.Values; } }
        public IEnumerable<Task> CompletedTasks { get { return completedTasks.Values; } }

        // Constructor for creating an empty, blank task-state. From here we can rebuild the state by
        // 'playing' the entire event log. Note in future we will have a constructor allowing snap-shot
        // rebuilds.
        public TaskList() {
            allTasks       = new Dictionary<Guid, Task>();
            activeTasks    = new Dictionary<Guid, Task>();
            failedTasks    = new Dictionary<Guid, Task>();
            completedTasks = new Dictionary<Guid, Task>();
        }
        
        public Task CreateNewIndependentTask(string name, int category, long timeCreatedUnix, int coulourId, Guid id) {
            TaskParamValidationHelpers.BasicNewTaskParameterValidation(name, category, timeCreatedUnix, id, allTasks.Keys.ToHashSet());
            Task t = new Task(id, name, category, null, timeCreatedUnix);
            allTasks.Add(id, t);
            activeTasks.Add(id, t);
            return t;
        }
        public Task CreateNewSubtask(string name, Task parent, int category, long timeCreatedUnix, Guid id) {
            TaskParamValidationHelpers.BasicNewTaskParameterValidation(name, category, timeCreatedUnix, id, allTasks.Keys.ToHashSet());
            Task t = new Task(id, name, category, parent, timeCreatedUnix);
            parent.AddChild(t);
            allTasks.Add(id, t);
            activeTasks.Add(id, t);
            return t;
        }
        public void ActivateTask(Task toActivate, int newCategory, long timeStamp) {
            if (toActivate.Category != CategoryVals.Deferred) throw new InvalidOperationException("Cannot activate a task which is not currently deferred. Task ID: " + toActivate.Id);
            if (newCategory != CategoryVals.Daily && newCategory != CategoryVals.Weekly && newCategory != CategoryVals.Goal) throw new InvalidOperationException("Invalid target category for task-activation: " + newCategory);
            if (timeStamp < toActivate.EventTimeStamps.TimeCreated) throw new InvalidOperationException("Cannot activate a task before it was created");
            toActivate.EventTimeStamps.TimeActivated = timeStamp;
            toActivate.Category = newCategory;
        }
        public void CompletedTask(Task t, long timeStamp) {
            if (t.ProgressStatus != ProgressStatusVals.Started) throw new InvalidOperationException("Cannot call 'complete' on root task which is not started. Task id: " + t.Id);
            if (t.Category == CategoryVals.Deferred) throw new InvalidOperationException("Cannot call 'complete' on root task which is not activated. Task id: " + t.Id);
            if (timeStamp < t.EventTimeStamps.TimeStarted) throw new InvalidOperationException("Cannot complete a task before it was started! Task id: " + t.Id);
            CloseTaskAndChildren(t, timeStamp, true);
        }
        public void FailTask(Task t, long timeStamp) {
            if (!ProgressStatusVals.ActiveTaskValues.Contains(t.ProgressStatus)) throw new InvalidOperationException("Cannot call 'fail' on root task which is already closed. Task id: " + t.Id);
            if (t.Category == CategoryVals.Deferred) throw new InvalidOperationException("Cannot call 'fail' on root task which is not activated. Task id: " + t.Id);
            if (timeStamp < t.EventTimeStamps.TimeCreated) throw new InvalidOperationException("Cannot fail a task before it was created! Task id: " + t.Id);
            CloseTaskAndChildren(t, timeStamp, false);
        }
        private void CloseTaskAndChildren(Task t, long timeStamp, bool completed) {
            // Can only close active tasks. If a child is deferred we will stop.
            if (t.Category == CategoryVals.Deferred || ProgressStatusVals.ClosedTaskValues.Contains(t.ProgressStatus)) return;  // Cease recursion
            
            // Check for state consistency.
            if (!activeTasks.ContainsKey(t.Id)) { throw new InvalidOperationException("Tried to close a task which was not in the active task collection! Task Id: " + t.Id); }
            activeTasks.Remove(t.Id);

            if (completed) completedTasks.Add(t.Id, t);
            else failedTasks.Add(t.Id, t);

            // Update state.
            t.ProgressStatus = completed ? ProgressStatusVals.Completed : ProgressStatusVals.Failed;
            t.EventTimeStamps.TimeClosed = timeStamp;
            
            // Recurse to children.
            foreach (Task child in t.Children) { CloseTaskAndChildren(child, timeStamp, completed); }
        }
        public void StartTask(Task t, long timeStamp) {
            if (t.Category == CategoryVals.Deferred) { throw new InvalidOperationException("Cannot start a task which is currently deferred. Task Id: " + t.Id); }
            if (t.ProgressStatus == ProgressStatusVals.Started) return; // Do nothing.
            if (t.ProgressStatus != ProgressStatusVals.NotStarted) { throw new InvalidOperationException("Cannot start a task which is already starts or closed. Task Id: " + t.Id); }
            t.ProgressStatus = ProgressStatusVals.Started;
            t.EventTimeStamps.TimeStarted = timeStamp;
        }
        public void ReviveTaskAsClone(Task original, bool reviveAsActive, long timeStamp, Guid id) {
            if (original.ProgressStatus != ProgressStatusVals.Failed) throw new InvalidOperationException("Cannot revive a task which is not failed! Task.Id: " + original.Id);
            original.ProgressStatus = ProgressStatusVals.Reattempted;
            original.EventTimeStamps.TimeRevived = timeStamp;

            int newCategory = reviveAsActive ? original.Category : CategoryVals.Deferred;
            CreateNewIndependentTask(original.Name, newCategory, timeStamp, original.ColourId, id);
        }
        public void EditTaskText(Task task, string newText, long timestamp) {
            if (string.IsNullOrWhiteSpace(newText) || timestamp < 0) throw new InvalidOperationException("Illegal renaming arguments: " + newText);
            task.Name = newText;
        }
    }

    // A Task object containing data.
    public class Task {
        public Guid Id { get; }
        public string Name { get; set; }
        public int Category { get; set; }
        public int ProgressStatus { get; set; }
        public int ColourId { get; }
        public Task Parent { get; set; }
        public IList<Task> Children { get; set; }
        public EventTimeStamps EventTimeStamps { get; }
        
        public Task(Guid id, string name, int category, Task parent, long timeCreatedUnix) {
            this.Id = id;
            this.Name = name;
            this.Category = category;
            this.ProgressStatus = ProgressStatusVals.NotStarted;
            this.Parent = parent;
            this.Children = new List<Task>();
            this.EventTimeStamps = new EventTimeStamps();
            this.EventTimeStamps.TimeCreated = timeCreatedUnix;
        }

        public void AddChild(Task child) {
            this.Children.Add(child);
            child.Parent = this;
        }
        public void RemoveChild(Task task) {
            this.Children.Remove(task);
            task.Parent = null;
        }
    }

    // Mutable data object allowing us to set when things happen.
    // All times are stored as Unix Epoch Milliseconds.
    public class EventTimeStamps {
        public long? TimeCreated { get; set; }
        public long? TimeActivated { get; set; }
        public long? TimeStarted { get; set; }
        public long? TimeClosed { get; set; }
        public long? TimeRevived { get; set; }
        public long? TimeEdited { get; set; }
        public EventTimeStamps() {
            TimeCreated = null;
            TimeActivated = null;
            TimeStarted = null;
            TimeClosed = null;
            TimeRevived = null;
            TimeEdited = null;
        }
    }

    internal static class TaskParamValidationHelpers {
        public static void BasicNewTaskParameterValidation(string name, int category, long timeCreatedUnix, Guid id, ISet<Guid> existingIds) {
            TaskIdUniquenessCheck(id, existingIds);
            if (!CategoryVals.ValidValues.Contains(category) || string.IsNullOrWhiteSpace(name) || timeCreatedUnix < 0) {
                throw new InvalidOperationException("Invalid data passed for a New Independent Task. Come on, this is easy to validate mate.");
            }
        }
        public static void TaskIdUniquenessCheck(Guid id, ISet<Guid> existingIds) {
            if (existingIds.Contains(id)) {
                throw new InvalidOperationException("Invalid id for new task. This ID is already present!");
            }
        }
    }
}