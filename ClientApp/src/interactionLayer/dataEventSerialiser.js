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

    // Undo event handlers
    function taskAddedUndoEvent(data, tasklist) {
        const task = data.task;
        return {
            eventType: data.eventType,
            timestamp: data.timestamp,
            revertedEventTimestamp: data.revertedEventTimestamp,
            id: task.id,
            name: task.name,
            category: task.category,
            progressStatus: task.progressStatus,
            colourId: task.colourid,
            context: task.context,
            parent: null,
            children: null
        };
    }

    function childTaskAddedUndoEvent(data, tasklist) {
        const task = data.task;
        return {
            eventType: data.eventType,
            timestamp: data.timestamp,
            revertedEventTimestamp: data.revertedEventTimestamp,
            id: task.id,
            name: task.name,
            category: task.category,
            progressStatus: task.progressStatus,
            colourId: task.colourid,
            context: task.context,
            parent: null,
            children: null
        };
    }

    function taskRevivedUndoEvent(data, tasklist) {
        const newTask = data.newTask;
        const originalTask = data.originalTask;
        return {
            eventType: data.eventType,
            timestamp: data.timestamp,
            revertedEventTimestamp: data.revertedEventTimestamp,
            id: newTask.id,
            name: newTask.name,
            category: newTask.category,
            progressStatus: newTask.progressStatus,
            colourId: newTask.colourid,
            context: newTask.context,
            parent: null,
            children: null,
            original: originalTask.id
        };
    }

    function taskCompletedUndoEvent(data, tasklist) {
        const task = data.task;
        return {
            eventType: data.eventType,
            timestamp: data.timestamp,
            revertedEventTimestamp: data.revertedEventTimestamp,
            id: task.id,
            name: task.name,
            category: task.category,
            progressStatus: task.progressStatus,
            colourId: task.colourid,
            context: task.context,
            parent: null,
            children: null
        };
    }

    function taskActivatedUndoEvent(data, tasklist) {
        const task = data.task;
        return {
            eventType: data.eventType,
            timestamp: data.timestamp,
            revertedEventTimestamp: data.revertedEventTimestamp,
            id: task.id,
            name: task.name,
            category: task.category,
            progressStatus: task.progressStatus,
            colourId: task.colourid,
            context: task.context,
            parent: null,
            children: null
        };
    }

    function taskStartedUndoEvent(data, tasklist) {
        const task = data.task;
        return {
            eventType: data.eventType,
            timestamp: data.timestamp,
            revertedEventTimestamp: data.revertedEventTimestamp,
            id: task.id,
            name: task.name,
            category: task.category,
            progressStatus: task.progressStatus,
            colourId: task.colourid,
            context: task.context,
            parent: null,
            children: null
        };
    }

    function taskEditedUndoEvent(data, tasklist) {
        const task = data.task;
        return {
            eventType: data.eventType,
            timestamp: data.timestamp,
            revertedEventTimestamp: data.originalTimeEdited,
            id: task.id,
            name: data.originalText,
            category: task.category,
            progressStatus: task.progressStatus,
            colourId: task.colourid,
            context: task.context,
            parent: null,
            children: null
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
        taskAddedUndoEvent: taskAddedUndoEvent,
        childTaskAddedUndoEvent: childTaskAddedUndoEvent,
        taskRevivedUndoEvent: taskRevivedUndoEvent,
        taskDeletedUndoEvent: null, /* TODO ?? */
        taskCompletedUndoEvent: taskCompletedUndoEvent,
        taskActivatedUndoEvent: taskActivatedUndoEvent,
        taskStartedUndoEvent: taskStartedUndoEvent,
        taskEditedUndoEvent: taskEditedUndoEvent
    });
}