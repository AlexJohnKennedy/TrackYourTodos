using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using todo_app.DomainLayer.Events;

// Classes in this namespace are inherently coupled to BOTH the Database ORM model, and 
// the JSON Schema which is used to communicate with the client application. In other
// words, this namespace defines the Model entities which ASP will bind to when interpreting
// an HTTP POST request, and which ASP will serialise into JSON when responding to a GET 
// request. 
//
// For simplicity, we will use the SAME entity objects to map to our Database records, 
// using Entity Framework Core (ASP's native ORM).
//
// These classes are NOT framework independent, and will WRAP the domain layer objects if 
// need be! (For now, the domain layer objects are somewhat useless, since there is no real
// business logic ocurring inside the server itself.. But there might be later!)
namespace todo_app.DataTransferLayer.Entities {

    // WARNING: THESE EVENT TYPE STRINGS MUST MATCH THOSE THAT ARE SENT AND RECEIVED BY THE CLIENT!
    public static class EventTypes {
        public const string TaskAdded = "taskCreated";
        public const string ChildTaskAdded = "subtaskCreated";
        public const string TaskRevived = "taskRevived";
        public const string TaskDeleted = "taskDeleted";
        public const string TaskCompleted = "taskCompleted";
        public const string TaskFailed = "taskFailed";
        public const string TaskActivated = "taskActivated";
        public const string TaskStarted = "taskStarted";
    }

    // Define a Model-bindable entity object; this must have public getters and setters for their properties.
    // The Generic event entity defines a type capable of being bound to ANY possible types. When we are sending
    // our responses, we will reply with a particular type. The Generic type contains properties for each of the
    // possible event types, and thus, can represent any one of them. Additionally, there are explicit conversion
    // operators defined, allowing us to easily CAST to one of the specific-event entity types.
    public class GenericTodoEvent {
        public Guid EventId { get; set; }
        public string EventType { get; set; }
        public long Timestamp { get; set; }
        public int Id { get; set; }
        public string Name { get; set; }
        public int Category { get; set; }
        public int ProgressStatus { get; set; }
        public int ColourId { get; set; }
        public int? Parent { get; set; }        // Nullable, since some event types do not support this.
        public int[] Children { get; set; }
        public int? Original { get; set; }      // Nullable, since some event types do not support this.
    }
    
    // Below are event-specific entity types which might be useful. They are able to be cast to, from the generic type.
    // The casts must be explicit, since if a GenericTodoEvent is representing the wrong event, we want to throw an exception.
    // These specific-event types are also castable directly into domain-layer logic objects, in case we need that later on.
    public class TaskCreatedEvent {
        public Guid EventId { get; set; }
        public string EventType { get; set; }
        public long Timestamp { get; set; }
        public int Id { get; set; }
        public string Name { get; set; }
        public int Category { get; set; }
        public int ProgressStatus { get; set; }
        public int ColourId { get; set; }

        // Support explicit casting from a GenericTodoEvent object into this type.
        public static explicit operator TaskCreatedEvent(GenericTodoEvent genericEvent) {
            if (genericEvent.EventType != EventTypes.TaskAdded 
            || (genericEvent.Children != null && genericEvent.Children.Length > 0)
            || genericEvent.Parent != null) {
                throw new InvalidCastException("Cannot cast a GenericTodoEvent representing a " + genericEvent.EventType + " to a TaskCreatedEvent");
            }
            TaskCreatedEvent e = new TaskCreatedEvent();
            e.EventId = genericEvent.EventId;
            e.EventType = genericEvent.EventType;
            e.Timestamp = genericEvent.Timestamp;
            e.Id = genericEvent.Id;
            e.Name = genericEvent.Name;
            e.Category = genericEvent.Category;
            e.ProgressStatus = genericEvent.ProgressStatus;
            e.ColourId = genericEvent.ColourId;
            
            return e;
        }

        // Support implicit casting TO domain layer objects.
        public static implicit operator DomainLayer.Events.TaskCreatedEvent(TaskCreatedEvent e) {
            return new DomainLayer.Events.TaskCreatedEvent(e.EventId, e.Timestamp, e.Id, e.Name, e.Category, e.ProgressStatus, e.ColourId);
        }
    }

    public class ChildTaskAddedEvent {
        public Guid EventId { get; set; }
        public string EventType { get; set; }
        public long Timestamp { get; set; }
        public int Id { get; set; }
        public string Name { get; set; }
        public int Category { get; set; }
        public int ProgressStatus { get; set; }
        public int ColourId { get; set; }
        public int Parent { get; set; }

        public static explicit operator ChildTaskAddedEvent(GenericTodoEvent genericEvent) {
            if (genericEvent.EventType != EventTypes.ChildTaskAdded
            || (genericEvent.Children != null && genericEvent.Children.Length > 0)) {
                throw new InvalidCastException("Cannot cast a GenericTodoEvent representing a " + genericEvent.EventType + " to a ChildTaskAddedEvent");
            }
            ChildTaskAddedEvent e = new ChildTaskAddedEvent();
            e.EventId = genericEvent.EventId;
            e.EventType = genericEvent.EventType;
            e.Timestamp = genericEvent.Timestamp;
            e.Id = genericEvent.Id;
            e.Name = genericEvent.Name;
            e.Category = genericEvent.Category;
            e.ProgressStatus = genericEvent.ProgressStatus;
            e.ColourId = genericEvent.ColourId;
            e.Parent = genericEvent.Parent.Value;
            
            return e;
        }

        public static implicit operator DomainLayer.Events.ChildTaskAddedEvent(ChildTaskAddedEvent e) {
            return new DomainLayer.Events.ChildTaskAddedEvent(e.EventId, e.Timestamp, e.Id, e.Parent, e.Name, e.Category, e.ProgressStatus, e.ColourId);
        }
    }

    public class TaskRevivedEvent {
        public Guid EventId { get; set; }
        public string EventType { get; set; }
        public long Timestamp { get; set; }
        public int Original { get; set; }
        public int Id { get; set; }
        public string Name { get; set; }
        public int Category { get; set; }
        public int ProgressStatus { get; set; }
        public int ColourId { get; set; }

        public static explicit operator TaskRevivedEvent(GenericTodoEvent genericEvent) {
            if (genericEvent.EventType != EventTypes.TaskRevived || genericEvent.Original == null) {
                throw new InvalidCastException("Cannot cast a GenericTodoEvent representing a " + genericEvent.EventType + " to a TaskRevivedEvent");
            }
            TaskRevivedEvent e = new TaskRevivedEvent();
            e.EventId = genericEvent.EventId;
            e.EventType = genericEvent.EventType;
            e.Timestamp = genericEvent.Timestamp;
            e.Id = genericEvent.Id;
            e.Name = genericEvent.Name;
            e.Category = genericEvent.Category;
            e.ProgressStatus = genericEvent.ProgressStatus;
            e.ColourId = genericEvent.ColourId;
            e.Original = genericEvent.Original.Value;
            
            return e;
        }

        public static implicit operator DomainLayer.Events.TaskRevivedEvent(TaskRevivedEvent e) {
            return new DomainLayer.Events.TaskRevivedEvent(e.EventId, e.Timestamp, e.Original, e.Id, e.Name, e.Category, e.ProgressStatus, e.ColourId);
        }
    }

    public class TaskActivatedEvent {
        public Guid EventId { get; set; }
        public string EventType { get; set; }
        public long Timestamp { get; set; }
        public int Id { get; set; }
        public string Name { get; set; }
        public int Category { get; set; }
        public int ProgressStatus { get; set; }
        public int ColourId { get; set; }
        public int Parent { get; set; }
        public int[] Children { get; set; }

        public static explicit operator TaskActivatedEvent(GenericTodoEvent genericEvent) {
            if (genericEvent.EventType != EventTypes.TaskActivated) {
                throw new InvalidCastException("Cannot cast a GenericTodoEvent representing a " + genericEvent.EventType + " to a TaskActivatedEvent");
            }
            TaskActivatedEvent e = new TaskActivatedEvent();
            e.EventId = genericEvent.EventId;
            e.EventType = genericEvent.EventType;
            e.Timestamp = genericEvent.Timestamp;
            e.Id = genericEvent.Id;
            e.Name = genericEvent.Name;
            e.Category = genericEvent.Category;
            e.ProgressStatus = genericEvent.ProgressStatus;
            e.ColourId = genericEvent.ColourId;
            e.Parent = genericEvent.Parent.Value;
            e.Children = genericEvent.Children;

            return e;
        }

        public static implicit operator DomainLayer.Events.TaskActivatedEvent(TaskActivatedEvent e) {
            return new DomainLayer.Events.TaskActivatedEvent(e.EventId, e.Timestamp, e.Id, e.Name, e.Category, e.ProgressStatus, e.ColourId, e.Parent, e.Children);
        }
    }

    public class TaskDeletedEvent {
        public Guid EventId { get; set; }
        public string EventType { get; set; }
        public long Timestamp { get; set; }
        public int Id { get; set; }
        public string Name { get; set; }
        public int Category { get; set; }
        public int ProgressStatus { get; set; }
        public int ColourId { get; set; }
        public int Parent { get; set; }
        public int[] Children { get; set; }

        public static explicit operator TaskDeletedEvent(GenericTodoEvent genericEvent) {
            if (genericEvent.EventType != EventTypes.TaskDeleted) {
                throw new InvalidCastException("Cannot cast a GenericTodoEvent representing a " + genericEvent.EventType + " to a TaskDeletedEvent");
            }
            TaskDeletedEvent e = new TaskDeletedEvent();
            e.EventId = genericEvent.EventId;
            e.EventType = genericEvent.EventType;
            e.Timestamp = genericEvent.Timestamp;
            e.Id = genericEvent.Id;
            e.Name = genericEvent.Name;
            e.Category = genericEvent.Category;
            e.ProgressStatus = genericEvent.ProgressStatus;
            e.ColourId = genericEvent.ColourId;
            e.Parent = genericEvent.Parent.Value;
            e.Children = genericEvent.Children;

            return e;
        }

        public static implicit operator DomainLayer.Events.TaskDeletedEvent(TaskDeletedEvent e) {
            return new DomainLayer.Events.TaskDeletedEvent(e.EventId, e.Timestamp, e.Id, e.Name, e.Category, e.ProgressStatus, e.ColourId, e.Parent, e.Children);
        }
    }

    public class TaskStartedEvent {
        public Guid EventId { get; set; }
        public string EventType { get; set; }
        public long Timestamp { get; set; }
        public int Id { get; set; }
        public string Name { get; set; }
        public int Category { get; set; }
        public int ProgressStatus { get; set; }
        public int ColourId { get; set; }
        public int Parent { get; set; }
        public int[] Children { get; set; }

        public static explicit operator TaskStartedEvent(GenericTodoEvent genericEvent) {
            if (genericEvent.EventType != EventTypes.TaskStarted) {
                throw new InvalidCastException("Cannot cast a GenericTodoEvent representing a " + genericEvent.EventType + " to a TaskStartedEvent");
            }
            TaskStartedEvent e = new TaskStartedEvent();
            e.EventId = genericEvent.EventId;
            e.EventType = genericEvent.EventType;
            e.Timestamp = genericEvent.Timestamp;
            e.Id = genericEvent.Id;
            e.Name = genericEvent.Name;
            e.Category = genericEvent.Category;
            e.ProgressStatus = genericEvent.ProgressStatus;
            e.ColourId = genericEvent.ColourId;
            e.Parent = genericEvent.Parent.Value;
            e.Children = genericEvent.Children;

            return e;
        }

        public static implicit operator DomainLayer.Events.TaskStartedEvent(TaskStartedEvent e) {
            return new DomainLayer.Events.TaskStartedEvent(e.EventId, e.Timestamp, e.Id, e.Name, e.Category, e.ColourId, e.Parent, e.Children);
        }
    }

    public class TaskCompletedEvent {
        public Guid EventId { get; set; }
        public string EventType { get; set; }
        public long Timestamp { get; set; }
        public int Id { get; set; }
        public string Name { get; set; }
        public int Category { get; set; }
        public int ProgressStatus { get; set; }
        public int ColourId { get; set; }
        public int Parent { get; set; }
        public int[] Children { get; set; }

        public static explicit operator TaskCompletedEvent(GenericTodoEvent genericEvent) {
            if (genericEvent.EventType != EventTypes.TaskCompleted) {
                throw new InvalidCastException("Cannot cast a GenericTodoEvent representing a " + genericEvent.EventType + " to a TaskCompletedEvent");
            }
            TaskCompletedEvent e = new TaskCompletedEvent();
            e.EventId = genericEvent.EventId;
            e.EventType = genericEvent.EventType;
            e.Timestamp = genericEvent.Timestamp;
            e.Id = genericEvent.Id;
            e.Name = genericEvent.Name;
            e.Category = genericEvent.Category;
            e.ProgressStatus = genericEvent.ProgressStatus;
            e.ColourId = genericEvent.ColourId;
            e.Parent = genericEvent.Parent.Value;
            e.Children = genericEvent.Children;

            return e;
        }

        public static implicit operator DomainLayer.Events.TaskCompletedEvent(TaskCompletedEvent e) {
            return new DomainLayer.Events.TaskCompletedEvent(e.EventId, e.Timestamp, e.Id, e.Name, e.Category, e.ColourId, e.Parent, e.Children);
        }
    }

    public class TaskFailedEvent {
        public Guid EventId { get; set; }
        public string EventType { get; set; }
        public long Timestamp { get; set; }
        public int Id { get; set; }
        public string Name { get; set; }
        public int Category { get; set; }
        public int ProgressStatus { get; set; }
        public int ColourId { get; set; }
        public int Parent { get; set; }
        public int[] Children { get; set; }

        public static explicit operator TaskFailedEvent(GenericTodoEvent genericEvent) {
            if (genericEvent.EventType != EventTypes.TaskFailed) {
                throw new InvalidCastException("Cannot cast a GenericTodoEvent representing a " + genericEvent.EventType + " to a TaskFailedEvent");
            }
            TaskFailedEvent e = new TaskFailedEvent();
            e.EventId = genericEvent.EventId;
            e.EventType = genericEvent.EventType;
            e.Timestamp = genericEvent.Timestamp;
            e.Id = genericEvent.Id;
            e.Name = genericEvent.Name;
            e.Category = genericEvent.Category;
            e.ProgressStatus = genericEvent.ProgressStatus;
            e.ColourId = genericEvent.ColourId;
            e.Parent = genericEvent.Parent.Value;
            e.Children = genericEvent.Children;

            return e;
        }

        public static implicit operator DomainLayer.Events.TaskFailedEvent(TaskFailedEvent e) {
            return new DomainLayer.Events.TaskFailedEvent(e.EventId, e.Timestamp, e.Id, e.Name, e.Category, e.ColourId, e.Parent, e.Children);
        }
    }
}