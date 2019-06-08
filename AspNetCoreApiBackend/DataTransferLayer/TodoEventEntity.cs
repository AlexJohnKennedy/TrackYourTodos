using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Threading.Tasks;

using todo_app.DomainLayer.TaskListModel;

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

    // Define custom validation operations for TODO event model objects. For example, the EventType field must
    // be one of the valid strings. These operations are implemented as ValidationAttributes which allow us to
    // apply them as attributes, e.g. [MustBeUppercase]
    internal class IntSetValidatorAttribute : ValidationAttribute {
        private HashSet<int> validStrings;
        public IntSetValidatorAttribute(params int[] validStrings) {
            this.validStrings = validStrings.ToHashSet();
        }
        protected override ValidationResult IsValid(object value, ValidationContext validationContext) {
            return validStrings.Contains((int)value) ? ValidationResult.Success : new ValidationResult(GetErrorMessage(validationContext.MemberName));
        }
        private string GetErrorMessage(string member) {
            return $"{member} must be to set to one of: " + validStrings.Aggregate("", (s, next) => s + next.ToString() + ", ");
        }
    }
    internal class StringSetValidatorAttribute : ValidationAttribute {
        private HashSet<string> validStrings;
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

    // Mapping of validation predicates depending on the event type.
    internal static class EventTypeSpecificValidators {
        public static readonly Dictionary<string, Func<GenericTodoEvent, bool>> Funcs = new Dictionary<string, Func<GenericTodoEvent, bool>>() {
            // New independent tasks must have no parent, no child, no 'original' field, and Progress status must be 'Not started' (i.e. zero)
            { EventTypes.TaskAdded, e => e.Parent == null && (e.Children == null || e.Children.Length == 0) && e.Original == null && e.ProgressStatus == ProgressStatusVals.NotStarted },

            // New subtasks must have a parent, no child, no 'original' field, and ProgressStatus of Not started.
            { EventTypes.ChildTaskAdded, e => e.Parent != null && (e.Children == null || e.Children.Length == 0) && e.Original == null && e.ProgressStatus == ProgressStatusVals.NotStarted },

            // Revived tasks must have an 'original' field, and a ProgressStatus of Not started.
            { EventTypes.TaskRevived, e => e.Original != null && e.ProgressStatus == ProgressStatusVals.NotStarted },

            // Tasks which have just starts must have a progress status of started.
            { EventTypes.TaskStarted, e => e.ProgressStatus == ProgressStatusVals.Started },

            // Completed tasks must have a Category of not-deferred, and Progress status of completed.
            { EventTypes.TaskCompleted, e => e.Category != CategoryVals.Deferred && e.ProgressStatus == ProgressStatusVals.Completed },

            // Failed tasks must have a Category of not-deferred, and Progress status of failed.
            { EventTypes.TaskFailed, e => e.Category != CategoryVals.Deferred && e.ProgressStatus == ProgressStatusVals.Failed },

            // Activated tasks must have a Category of not-deferred, and ProgressStatus of not started.
            { EventTypes.TaskActivated, e => e.Category != CategoryVals.Deferred && e.ProgressStatus == ProgressStatusVals.NotStarted },

            // Deleted tasks currently have no validation applied
            { EventTypes.TaskDeleted, e => true } 
        };
    }

    // Define a Model-bindable entity object; this must have public getters and setters for their properties.
    // The Generic event entity defines a type capable of being bound to ANY possible types. When we are sending
    // our responses, we will reply with a particular type. The Generic type contains properties for each of the
    // possible event types, and thus, can represent any one of them. Additionally, there are explicit conversion
    // operators defined, allowing us to easily CAST to one of the specific-event entity types.
    //
    // This implements IValidatableObject so that I can have custom Model Validation; this is required because depending
    // on the event type, certain other fields must, or must not, be null/required in order to be valid. E.g. New tasks
    // should always have a null parent, whereas new subtasks must always HAVE a parent.
    public class GenericTodoEvent : IValidatableObject {
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
        public Guid Id { get; set; }

        [Required]
        [StringLength(120)]   // Must match the string length defined in code on client app.
        public string Name { get; set; }

        [Required]
        [IntSetValidator(CategoryVals.Goal, CategoryVals.Weekly, CategoryVals.Daily, CategoryVals.Deferred)]
        public int Category { get; set; }

        [Required]
        [IntSetValidator(ProgressStatusVals.NotStarted, ProgressStatusVals.Started, ProgressStatusVals.Completed, ProgressStatusVals.Aborted, ProgressStatusVals.Failed, ProgressStatusVals.Reattempted)]
        public int ProgressStatus { get; set; }

        [Required]
        public int ColourId { get; set; }
        
        public Guid? Parent { get; set; }        // Nullable, since some event types do not support this.
        public Guid[] Children { get; set; }
        public Guid? Original { get; set; }      // Nullable, since some event types do not support this.

        // Return a collection of Failed-Validations. An empty IEnumerable means validation was successful
        public IEnumerable<ValidationResult> Validate(ValidationContext validationContext) {
            var validationPredicate = EventTypeSpecificValidators.Funcs[EventType] ?? (e => false);
            if (!validationPredicate(this)) yield return new ValidationResult($"Field values were not valid for eventType: {EventType}");
        }
    }
}