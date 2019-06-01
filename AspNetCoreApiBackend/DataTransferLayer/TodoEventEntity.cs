using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
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

    // Define the valide event type strings.
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

    // Define custom validation operations for TODO event model objects. For example, the EventType field must
    // be one of the valid strings. These operations are implemented as ValidationAttributes which allow us to
    // apply them as attributes, e.g. [MustBeUppercase]

    // Generic string attribute validator which asserts that a string field must be equal to one of a specified set.
    internal class StringSetValidatorAttribute : ValidationAttribute {
        private HashSet<string> validStrings;

        // When the attribute is applied, it must contain a passed-in set of valid strings.
        public StringSetValidatorAttribute(params string[] validStrings) {
            this.validStrings = validStrings.ToHashSet();
        }

        protected override ValidationResult IsValid(object value, ValidationContext validationContext) {
            return validStrings.Contains((string)value) ? ValidationResult.Success : new ValidationResult(GetErrorMessage(validationContext.MemberName));
        }
        private string GetErrorMessage(string member) {
            return $"{member} must be to set to one of: " + validStrings.Aggregate("", (s, next) => s + next + ", ");
        }
    }
    internal class NotInTheFutureValidatorAttribute : ValidationAttribute {
        private long clockSkewMilliseconds;     // How many milliseconds either side we are allowing.

        public NotInTheFutureValidatorAttribute(long clockSkew) {
            this.clockSkewMilliseconds = clockSkew;
        }

        protected override ValidationResult IsValid(object value, ValidationContext validationContext) {
            long now = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
            long timestampToValidate = (long)value;
            return now + clockSkewMilliseconds >= timestampToValidate ? ValidationResult.Success : new ValidationResult(GetErrorMessage(timestampToValidate));
        }
        private string GetErrorMessage(long illegalTime) {
            return $"Timestamp of {illegalTime} unix epoch milliseconds represented a value in the future; our system doesn't allow events to be saved that have not happened yet";
        }
    }

    // Define a Model-bindable entity object; this must have public getters and setters for their properties.
    // The Generic event entity defines a type capable of being bound to ANY possible types. When we are sending
    // our responses, we will reply with a particular type. The Generic type contains properties for each of the
    // possible event types, and thus, can represent any one of them. Additionally, there are explicit conversion
    // operators defined, allowing us to easily CAST to one of the specific-event entity types.
    public class GenericTodoEvent {
        [Key]
        public int EventId { get; set; }

        public string UserId { get; set; }

        [Required]
        [StringSetValidator(EventTypes.TaskAdded, EventTypes.ChildTaskAdded, EventTypes.TaskRevived, EventTypes.TaskDeleted, EventTypes.TaskCompleted, EventTypes.TaskFailed, EventTypes.TaskActivated, EventTypes.TaskStarted)]
        public string EventType { get; set; }

        [Required]
        [NotInTheFutureValidator(5000)]
        public long Timestamp { get; set; }

        [Required]
        public int Id { get; set; }

        [Required]
        [StringLength(120)]   // Must match the string lenght defined in code on client app.
        public string Name { get; set; }

        [Required]
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
        [Key]
        public int EventId { get; set; }

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
        [Key]
        public int EventId { get; set; }

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
        [Key]
        public int EventId { get; set; }

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
        [Key]
        public int EventId { get; set; }
        
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
        [Key]
        public int EventId { get; set; }

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
        [Key]
        public int EventId { get; set; }

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
        [Key]
        public int EventId { get; set; }

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
        [Key]
        public int EventId { get; set; }
        
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