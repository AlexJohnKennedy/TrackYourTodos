using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

// This namespace contians the representation of possible todo events, at the logic layer level. Thus, these are defined
// as immutable data objects and are completely application and framework independent. Note that in our app, these are
// pretty much pointless as we could just work with the transfer-layer entity objects, which are designed to be 
// bound to by request-model-binding and by our Database ORM. However, in principle there is a distinction between
// pure logic layer, and data-transfer + persistence layer coupled data objects. 
//
// The DOMAIN layer is pure logic only, and will be wrapped by the data-transer layer, which will define entity objects
// which in turn define the communication-language between this server and external things; i.e., it will define them in
// such a way which matches the database schema and/or the client-app event schema.
namespace todo_app.DomainLayer.Events {

    // Identifies what kind of event a given TodoEvent object is.
    public enum TodoEventType {
        TASK_CREATED, TASK_COMPLETED, CHILD_TASK_CREATED, TASK_REVIVED, TASK_STARTED, TASK_ACTIVATED, TASK_FAILED, TASK_DELETED
    }

    // This is the 'base type' for all data events pertaining to TODO mutations.
    // The reason for this base type is to facilitate easier listing and collection
    // of the events by listing them as a single base type.
    public abstract class TodoEvent {
        public int EventId { get; }
        public TodoEventType EventType { get; }
        public long Timestamp { get; }

        protected TodoEvent(int eventId, TodoEventType type, long timestamp) {
            this.EventId = eventId;
            this.EventType = type;
            this.Timestamp = timestamp;
        }
    }

    public class TaskCreatedEvent : TodoEvent {
        public int TaskId { get; }
        public string TaskName { get; }
        public int Category { get; }
        public int ProgressStatus { get; }
        public int ColourId { get; }

        public TaskCreatedEvent(int eventId, long timestamp, int taskId, string taskname, int category, int progress, int colourid) : base(eventId, TodoEventType.TASK_CREATED, timestamp) {
            this.TaskId = taskId;
            this.TaskName = taskname;
            this.Category = category;
            this.ProgressStatus = progress;
            this.ColourId = colourid;
        }
    }

    public class ChildTaskAddedEvent : TodoEvent {
        public int ChildTaskId { get; }
        public int ParentTaskId { get; }
        public string ChildTaskName { get; }
        public int ChildCategory { get; }
        public int ChildProgressStatus { get; }
        public int ChildColourId { get; }

        public ChildTaskAddedEvent(int eventId, long timestamp, int childtaskid, int parenttaskid, string childName, int childCategory, int childProgress, int childColourId) : base(eventId, TodoEventType.CHILD_TASK_CREATED, timestamp) {
            this.ChildCategory = childCategory;
            this.ChildTaskId = childtaskid;
            this.ParentTaskId = parenttaskid;
            this.ChildTaskName = childName;
            this.ChildProgressStatus = childProgress;
            this.ChildColourId = childColourId;
        }
    }

    public class TaskRevivedEvent : TodoEvent {
        public int OriginalTaskId { get; }
        public int NewTaskId { get; }
        public string NewTaskName { get; }
        public int NewTaskCategory { get; }
        public int NewTaskProgressStatus { get; }
        public int NewTaskColourId { get; }
        
        public TaskRevivedEvent(int eventId, long timestamp, int originalTaskId, int newTaskId, string newTaskName, int newTaskCategory, int newTaskProgressStatus, int newTaskColourId) : base(eventId, TodoEventType.TASK_REVIVED, timestamp) {
            OriginalTaskId = originalTaskId;
            NewTaskId = newTaskId;
            NewTaskName = newTaskName;
            NewTaskCategory = newTaskCategory;
            NewTaskProgressStatus = newTaskProgressStatus;
            NewTaskColourId = newTaskColourId;
        }
    }

    public class TaskActivatedEvent : TodoEvent {
        public int TaskId { get; }
        public string TaskName { get; }
        public int Category { get; }
        public int ProgressStatus { get; }
        public int ColourId { get; }
        public int ParentTaskId { get; }
        public IEnumerable<int> ChildTaskIds { get; }

        public TaskActivatedEvent(int eventId, long timestamp, int taskId, string taskName, int category, int progressStatus, int colourId, int parentTaskId, IEnumerable<int> childTaskIds) : base(eventId, TodoEventType.TASK_ACTIVATED, timestamp) {
            TaskId = taskId;
            TaskName = taskName;
            Category = category;
            ProgressStatus = progressStatus;
            ColourId = colourId;
            ParentTaskId = parentTaskId;
            ChildTaskIds = childTaskIds;
        }
    }

    public class TaskDeletedEvent : TodoEvent {
        public int TaskId { get; }
        public string TaskName { get; }
        public int Category { get; }
        public int ProgressStatus { get; }
        public int ColourId { get; }
        public int ParentTaskId { get; }
        public IEnumerable<int> ChildTaskIds { get; }

        public TaskDeletedEvent(int eventId, long timestamp, int taskId, string taskName, int category, int progressStatus, int colourId, int parentTaskId, IEnumerable<int> childTaskIds) : base(eventId, TodoEventType.TASK_DELETED, timestamp) {
            TaskId = taskId;
            TaskName = taskName;
            Category = category;
            ProgressStatus = progressStatus;
            ColourId = colourId;
            ParentTaskId = parentTaskId;
            ChildTaskIds = childTaskIds;
        }
    }

    public class TaskStartedEvent : TodoEvent {
        public int TaskId { get; }
        public string TaskName { get; }
        public int Category { get; }
        public int ColourId { get; }
        public int ParentTaskId { get; }
        public IEnumerable<int> ChildTaskIds { get; }

        public TaskStartedEvent(int eventId, long timestamp, int taskId, string taskName, int category, int colourId, int parentTaskId, IEnumerable<int> childTaskIds) : base(eventId, TodoEventType.TASK_STARTED, timestamp) {
            TaskId = taskId;
            TaskName = taskName;
            Category = category;
            ColourId = colourId;
            ParentTaskId = parentTaskId;
            ChildTaskIds = childTaskIds;
        }
    }

    public class TaskCompletedEvent : TodoEvent {
        public int TaskId { get; }
        public string TaskName { get; }
        public int Category { get; }
        public int ColourId { get; }
        public int ParentTaskId { get; }
        public IEnumerable<int> ChildTaskIds { get; }

        public TaskCompletedEvent(int eventId, long timestamp, int taskId, string taskName, int category, int colourId, int parentTaskId, IEnumerable<int> childTaskIds) : base(eventId, TodoEventType.TASK_COMPLETED, timestamp) {
            TaskId = taskId;
            TaskName = taskName;
            Category = category;
            ColourId = colourId;
            ParentTaskId = parentTaskId;
            ChildTaskIds = childTaskIds;
        }
    }

    public class TaskFailedEvent : TodoEvent {
        public int TaskId { get; }
        public string TaskName { get; }
        public int Category { get; }
        public int ColourId { get; }
        public int ParentTaskId { get; }
        public IEnumerable<int> ChildTaskIds { get; }

        public TaskFailedEvent(int eventId, long timestamp, int taskId, string taskName, int category, int colourId, int parentTaskId, IEnumerable<int> childTaskIds) : base(eventId, TodoEventType.TASK_FAILED, timestamp) {
            TaskId = taskId;
            TaskName = taskName;
            Category = category;
            ColourId = colourId;
            ParentTaskId = parentTaskId;
            ChildTaskIds = childTaskIds;
        }
    }
}