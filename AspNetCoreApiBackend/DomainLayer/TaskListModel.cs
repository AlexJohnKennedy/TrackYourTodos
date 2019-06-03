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
    public static class Category {
        public const int Goal = 0;
        public const int Weekly = 1;
        public const int Daily = 2;
        public const int Deferred = 3;

        public static readonly HashSet<int> ValidValues = new HashSet<int>() {Goal, Weekly, Daily, Deferred};
        public static readonly int MaxIndex = Enumerable.Max(ValidValues);
        public static readonly int MinIndex = Enumerable.Min(ValidValues);
    }

    // Define Category values to match Client application.
    public static class ProgressStatus {
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
        
    }

    // A Task object containing data.
    public class Task {

    }

}