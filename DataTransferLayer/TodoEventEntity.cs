using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

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
namespace todo_app.DataTransferLayer {

    // WARNING: THESE EVENT TYPE STRING MUST MATCH THOSE THAT ARE SENT AND RECEIVED BY THE CLIENT!
    public static class EventTypes {
        const string TaskAdded = "taskCreated";
        const string ChildTaskAdded = "subtaskCreated";
        const string TaskRevived = "taskRevived";
        const string TaskDeleted = "taskDeleted";
        const string TaskCompleted = "taskCompleted";
        const string TaskFailed = "taskFailed";
        const string TaskActivated = "taskActivated";
        const string TaskStarted = "taskStarted";
    }

    // Define Model-blindable entity object; this must have public getters and setters for their properties.
    // The Generic event entity defines a type capable of being bound to ANY possible types. When we are sending
    // our responses, we will reply with a particular type.
    public class GenericTodoEvent {
        public string EventType { get; set; }
        public long Timestamp { get; set; }
        public int Id { get; set; }
        public string Name { get; set; }
        public int Category { get; set; }
        public int ProgressStatus { get; set; }
        public int ColourId { get; set; }
        public int Parent { get; set; }
        public int[] Children { get; set; }
        public int Original { get; set; }
    }
    
    // Below are event-specific entity types which might be useful, might now.
    public class TaskCreatedEvent {
        public string EventType { get; set; }
        public long Timestamp { get; set; }
        public int Id { get; set; }
        public string Name { get; set; }
        public int Category { get; set; }
        public int ProgressStatus { get; set; }
        public int ColourId { get; set; }
        public int Parent { get; set; }
    }

    public class ChildTaskAddedEvent {
        public string EventType { get; set; }
        public long Timestamp { get; set; }
        public int Id { get; set; }
        public string Name { get; set; }
        public int Category { get; set; }
        public int ProgressStatus { get; set; }
        public int ColourId { get; set; }
        public int Parent { get; set; }
    }

    public class TaskRevivedEvent {
        public string EventType { get; set; }
        public long Timestamp { get; set; }
        public int Original { get; set; }
        public int Id { get; set; }
        public string Name { get; set; }
        public int Category { get; set; }
        public int ProgressStatus { get; set; }
        public int ColourId { get; set; }
    }

    public class TaskActivatedEvent {
        public string EventType { get; set; }
        public long Timestamp { get; set; }
        public int Id { get; set; }
        public string Name { get; set; }
        public int Category { get; set; }
        public int ProgressStatus { get; set; }
        public int ColourId { get; set; }
        public int Parent { get; set; }
        public int[] Children { get; set; }
    }

    public class TaskDeletedEvent {
        public string EventType { get; set; }
        public long Timestamp { get; set; }
        public int Id { get; set; }
        public string Name { get; set; }
        public int Category { get; set; }
        public int ProgressStatus { get; set; }
        public int ColourId { get; set; }
        public int Parent { get; set; }
        public int[] Children { get; set; }
    }

    public class TaskStartedEvent {
        public string EventType { get; set; }
        public long Timestamp { get; set; }
        public int Id { get; set; }
        public string Name { get; set; }
        public int Category { get; set; }
        public int ProgressStatus { get; set; }
        public int ColourId { get; set; }
        public int Parent { get; set; }
        public int[] Children { get; set; }
    }

    public class TaskCompletedEvent {
        public string EventType { get; set; }
        public long Timestamp { get; set; }
        public int Id { get; set; }
        public string Name { get; set; }
        public int Category { get; set; }
        public int ProgressStatus { get; set; }
        public int ColourId { get; set; }
        public int Parent { get; set; }
        public int[] Children { get; set; }
    }

    public class TaskFailedEvent {
        public string EventType { get; set; }
        public long Timestamp { get; set; }
        public int Id { get; set; }
        public string Name { get; set; }
        public int Category { get; set; }
        public int ProgressStatus { get; set; }
        public int ColourId { get; set; }
        public int Parent { get; set; }
        public int[] Children { get; set; }
    }
}