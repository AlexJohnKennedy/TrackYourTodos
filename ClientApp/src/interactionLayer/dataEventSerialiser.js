import { EventTypes } from '../logicLayer/dataEventJsonSchema';

export const DataEventSerialisationFuncs = BuildDataEventSerialisationFuncs();

function BuildDataEventSerialisationFuncs() {
    // These functions define the JSON Schema for event types
    function childTaskAddedEvent(parent, child, tasklist) {
        return JSON.stringify({
            eventType: EventTypes.childTaskAdded,
            timestamp: child.eventTimestamps.timeCreated,
            id: child.id,
            name: child.name,
            category: child.category,
            progressStatus: child.progressStatus,
            colourId: child.colourid,
            parent: child.parent.id
        });
    }

    function taskRevivedEvent(oldtask, newtask, tasklist) {
        return JSON.stringify({
            eventType: EventTypes.taskRevived,
            timestamp: newtask.eventTimestamps.timeRevived,
            original: oldtask.id,
            id: newtask.id,
            name: newtask.name,
            category: newtask.category,
            progressStatus: newtask.progressStatus,
            colourId: newtask.colourid,
            parent: null
        });
    }

    function taskAddedEvent(task, tasklist) {
        return JSON.stringify({
            eventType: EventTypes.taskAdded,
            timestamp: task.eventTimestamps.timeCreated,
            id: task.id,
            name: task.name,
            category: task.category,
            progressStatus: task.progressStatus,
            colourId: task.colourid,
            parent: null
        });
    }

    function taskActivatedEvent(task, tasklist) {
        return JSON.stringify({
            eventType: EventTypes.taskActivated,
            timestamp: task.eventTimestamps.timeActivated,
            id: task.id,
            name: task.name,
            category: task.category,
            progressStatus: task.progressStatus,
            colourId: task.colourid,
            parent: task.parent === null ? null : task.parent.id,
            children: task.children.map(child => child.id)
        });
    }

    function taskDeletedEvent(task, tasklist) {
        return JSON.stringify({
            eventType: EventTypes.taskDeleted,
            timestamp: null,    /* TODO: ??? */
            id: task.id,
            name: task.name,
            category: task.category,
            progressStatus: task.progressStatus,
            colourId: task.colourid,
            parent: task.parent === null ? null : task.parent.id,
            children: task.children.map(child => child.id)
        });
    }

    function taskStartedEvent(task, tasklist) {
        return JSON.stringify({
            eventType: EventTypes.taskStarted,
            timestamp: task.eventTimestamps.timeStarted,
            id: task.id,
            name: task.name,
            category: task.category,
            progressStatus: task.progressStatus,
            colourId: task.colourid,
            parent: task.parent === null ? null : task.parent.id,
            children: task.children.map(child => child.id)
        });
    }

    function taskCompletedEvent(task, tasklist) {
        return JSON.stringify({
            eventType: EventTypes.taskCompleted,
            timestamp: task.eventTimestamps.timeClosed,
            id: task.id,
            name: task.name,
            category: task.category,
            progressStatus: task.progressStatus,
            colourId: task.colourid,
            parent: task.parent === null ? null : task.parent.id,
            children: task.children.map(child => child.id)
        });
    }

    function taskFailedEvent(task, tasklist) {
        return JSON.stringify({
            eventType: EventTypes.taskFailed,
            timestamp: task.eventTimestamps.timeClosed,
            id: task.id,
            name: task.name,
            category: task.category,
            progressStatus: task.progressStatus,
            colourId: task.colourid,
            parent: task.parent === null ? null : task.parent.id,
            children: task.children.map(child => child.id)
        });
    }

    return Object.freeze({
        taskAddedEvent: taskAddedEvent,
        childTaskAddedEvent: childTaskAddedEvent,
        taskRevivedEvent: taskRevivedEvent,
        taskActivatedEvent: taskActivatedEvent,
        taskDeletedEvent: taskDeletedEvent,
        taskStartedEvent: taskStartedEvent,
        taskCompletedEvent: taskCompletedEvent,
        taskFailedEvent: taskFailedEvent
    });
}