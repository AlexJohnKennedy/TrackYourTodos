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
        public static readonly HashSet<string> ValidEventStrings = new HashSet<string>() {
            TaskAdded, ChildTaskAdded, TaskRevived, TaskDeleted, TaskCompleted, TaskFailed, TaskActivated, TaskStarted
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
        public static readonly int MaxIndex = Enumerable.Max(ValidValues);
        public static readonly int MinIndex = Enumerable.Min(ValidValues);
    }

    // Collection of tasks.
    public class TaskList {
        // Store all tasks, mapped by ID
        private Dictionary<int, Task> allTasks;
        private Dictionary<int, Task> activeTasks;    // Goals, Weekly, Daily, and Deferred.
        private Dictionary<int, Task> failedTasks;    // Graveyard.
        private Dictionary<int, Task> completedTasks; // Completed.

        // Constructor for creating an empty, blank task-state. From here we can rebuild the state by
        // 'playing' the entire event log. Note in future we will have a constructor allowing snap-shot
        // rebuilds.
        public TaskList() {
            allTasks       = new Dictionary<int, Task>();
            activeTasks    = new Dictionary<int, Task>();
            failedTasks    = new Dictionary<int, Task>();
            completedTasks = new Dictionary<int, Task>();
        }
        
        public Task CreateNewIndependentTask(string name, int category, long timeCreatedUnix, int coulourId, int id) {
            TaskParamValidationHelpers.BasicNewTaskParameterValidation(name, category, timeCreatedUnix, id, allTasks.Keys.ToHashSet());
            Task t = new Task(id, name, category, null, timeCreatedUnix);
            allTasks.Add(id, t);
            activeTasks.Add(id, t);
            return t;
        }
        public Task CreateNewSubtask(string name, Task parent, int category, long timeCreatedUnix, int id) {
            TaskParamValidationHelpers.BasicNewTaskParameterValidation(name, category, timeCreatedUnix, id, allTasks.Keys.ToHashSet());
            Task t = new Task(id, name, category, parent, timeCreatedUnix);
            allTasks.Add(id, t);
            activeTasks.Add(id, t);
            return t;
        }
        public void ActivateTask(Task toActivate, int newCategory, long timeStamp) {
            if (toActivate.Category != CategoryVals.Deferred) throw new InvalidOperationException("Cannot activate a task which is not currently deferred. Task ID: " + toActivate.Id);
            if (newCategory != CategoryVals.Daily || newCategory != CategoryVals.Weekly || newCategory != CategoryVals.Goal) throw new InvalidOperationException("Invalid target category for task-activation: " + newCategory);
            if (timeStamp < toActivate.EventTimeStamps.TimeCreated) throw new InvalidOperationException("Cannot activate a task before it was created");
            toActivate.EventTimeStamps.TimeActivated = timeStamp;
            toActivate.Category = newCategory;
        }
        public void CompletedTask(Task t, long timeStamp) {
            if (t.ProgressStatus != ProgressStatusVals.Started) throw new InvalidOperationException("Cannot call 'complete' on root task which is not started. Task id: " + t.Id);
            if (t.Category == CategoryVals.Deferred) throw new InvalidOperationException("Cannot call 'complete' on root task which is not activated. Task id: " + t.Id);
            if (timeStamp < t.EventTimeStamps.TimeStarted) throw new InvalidOperationException("Cannot complete a task before it was started! Task id: " + t.Id);
        }
        public void FailTask(Task t, long timeStamp) {
            if (t.ProgressStatus != ProgressStatusVals.Started && t.ProgressStatus != ProgressStatusVals.NotStarted) throw new InvalidOperationException("Cannot call 'fail' on root task which is already closed. Task id: " + t.Id);
            if (t.Category == CategoryVals.Deferred) throw new InvalidOperationException("Cannot call 'fail' on root task which is not activated. Task id: " + t.Id);
            if (timeStamp < t.EventTimeStamps.TimeCreated) throw new InvalidOperationException("Cannot fail a task before it was created! Task id: " + t.Id);

        }
        private void CloseTaskAndChildren(Task t, long timeStamp, bool completed) {
            
        }
    }

    // A Task object containing data.
    public class Task {
        public int Id { get; }
        public string Name { get; }
        public int Category { get; set; }
        public int ProgressStatus { get; set; }
        public int ColourId { get; }
        public Task Parent { get; set; }
        public IList<Task> Children { get; set; }
        public EventTimeStamps EventTimeStamps { get; }
        
        public Task(int id, string name, int category, Task parent, long timeCreatedUnix) {
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
        public EventTimeStamps() {
            TimeCreated = null;
            TimeActivated = null;
            TimeStarted = null;
            TimeClosed = null;
            TimeRevived = null;
        }
    }

    internal static class TaskParamValidationHelpers {
        public static void BasicNewTaskParameterValidation(string name, int category, long timeCreatedUnix, int id, ISet<int> existingIds) {
            if (!CategoryVals.ValidValues.Contains(category) || string.IsNullOrWhiteSpace(name) || timeCreatedUnix < 0) {
                throw new InvalidOperationException("Invalid data passed for a New Independent Task. Come on, this is easy to validate mate.");
            }
            if (existingIds.Contains(id)) {
                throw new InvalidOperationException("Invalid id for new task. This ID is already present!");
            }
        }
    }
}