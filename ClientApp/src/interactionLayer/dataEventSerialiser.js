import { EventTypes } from '../logicLayer/dataEventJsonSchema';

export const DataEventSerialisationFuncs = BuildDataEventSerialisationFuncs();

function BuildDataEventSerialisationFuncs() {
    // These functions define the JSON Schema for event types
    function childTaskAddedEvent(parent, child, tasklist) {
        return {
            eventType: EventTypes.childTaskAdded,
            timestamp: child.eventTimestamps.timeCreated,
            id: child.id,
            name: child.name,
            category: child.category,
            progressStatus: child.progressStatus,
            colourId: child.colourid,
            context: child.context,
            parent: child.parent.id
        };
    }

    function taskRevivedEvent(oldtask, newtask, tasklist) {
        return {
            eventType: EventTypes.taskRevived,
            timestamp: oldtask.eventTimestamps.timeRevived,
            original: oldtask.id,
            id: newtask.id,
            name: newtask.name,
            category: newtask.category,
            progressStatus: newtask.progressStatus,
            colourId: newtask.colourid,
            context: newtask.context,
            parent: null
        };
    }

    function taskAddedEvent(task, tasklist) {
        return {
            eventType: EventTypes.taskAdded,
            timestamp: task.eventTimestamps.timeCreated,
            id: task.id,
            name: task.name,
            category: task.category,
            progressStatus: task.progressStatus,
            colourId: task.colourid,
            context: task.context,
            parent: null
        };
    }

    function taskActivatedEvent(task, tasklist) {
        return {
            eventType: EventTypes.taskActivated,
            timestamp: task.eventTimestamps.timeActivated,
            id: task.id,
            name: task.name,
            category: task.category,
            progressStatus: task.progressStatus,
            colourId: task.colourid,
            context: task.context,
            parent: task.parent === null ? null : task.parent.id,
            children: task.children.map(child => child.id)
        };
    }

    function taskDeletedEvent(task, tasklist) {
        return {
            eventType: EventTypes.taskDeleted,
            timestamp: null,    /* TODO: ??? */
            id: task.id,
            name: task.name,
            category: task.category,
            progressStatus: task.progressStatus,
            colourId: task.colourid,
            context: task.context,
            parent: task.parent === null ? null : task.parent.id,
            children: task.children.map(child => child.id)
        };
    }

    function taskStartedEvent(task, tasklist) {
        return {
            eventType: EventTypes.taskStarted,
            timestamp: task.eventTimestamps.timeStarted,
            id: task.id,
            name: task.name,
            category: task.category,
            progressStatus: task.progressStatus,
            colourId: task.colourid,
            context: task.context,
            parent: task.parent === null ? null : task.parent.id,
            children: task.children.map(child => child.id)
        };
    }

    function taskCompletedEvent(task, tasklist) {
        return {
            eventType: EventTypes.taskCompleted,
            timestamp: task.eventTimestamps.timeClosed,
            id: task.id,
            name: task.name,
            category: task.category,
            progressStatus: task.progressStatus,
            colourId: task.colourid,
            context: task.context,
            parent: task.parent === null ? null : task.parent.id,
            children: task.children.map(child => child.id)
        };
    }

    function taskFailedEvent(task, tasklist) {
        return {
            eventType: EventTypes.taskFailed,
            timestamp: task.eventTimestamps.timeClosed,
            id: task.id,
            name: task.name,
            category: task.category,
            progressStatus: task.progressStatus,
            colourId: task.colourid,
            context: task.context,
            parent: task.parent === null ? null : task.parent.id,
            children: task.children.map(child => child.id)
        };
    }

    function taskEditedEvent(task, tasklist) {
        return {
            eventType: EventTypes.taskEdited,
            timestamp: task.eventTimestamps.timeEdited,
            id: task.id,
            name: task.name,
            category: task.category,
            progressStatus: task.progressStatus,
            colourId: task.colourid,
            context: task.context,
            parent: task.parent === null ? null : task.parent.id,
            children: task.children.map(child => child.id)
        };
    }

    function undoActionEvent(data, tasklist) {
        // At the moment, the 'data' object is just empty. Later, this will contain verifiable data about the event-which-was-undone, and thus we must serialise that information. For now, just emit a generic undo event
        return {
            eventType: EventTypes.undoAction,
            timestamp: data.timestamp,
            id: data.id     // WARNING: DOES NOT PERTAIN TO A TASK. UNDO EVENTS HAVE THEIR OWN UNIQUE IDs TO ASSIST DUPLICATE DETECTION!!
        };
    }

    return Object.freeze({
        // Normal data events
        taskAddedEvent: taskAddedEvent,
        childTaskAddedEvent: childTaskAddedEvent,
        taskRevivedEvent: taskRevivedEvent,
        taskActivatedEvent: taskActivatedEvent,
        taskDeletedEvent: taskDeletedEvent,
        taskStartedEvent: taskStartedEvent,
        taskCompletedEvent: taskCompletedEvent,
        taskFailedEvent: taskFailedEvent,
        taskEditedEvent: taskEditedEvent,

        // Undo data events
        undoActionEvent: undoActionEvent
    });
}