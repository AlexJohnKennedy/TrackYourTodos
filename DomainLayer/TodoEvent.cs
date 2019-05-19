using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace todo_app.DomainLayer.Events {
    // This is the 'base type' for all data events pertaining to TODO mutations.
    // The reason for this base type is to facilitate easier listing and collection
    // of the events by listing them as a single base type.
    public abstract class TodoEvent {
        public Guid Id { get; }
        public TodoEventType EventType { get; }
    }

    public enum TodoEventType {
        TASK_CREATED, TASK_COMPLETED, SUBTASK_CREATED, TASK_REVIVED, TASK_STARTED, TASK_ACTIVATED, TASK_FAILED
    }
}