// This module is used to 'replay' a sequence of data-events in order to rebuild the in-memory datamodel state.
// It will be used to load the state back from a persisted event log, because we are using event sourcing for persistence.
// It will receive the event log as an ordered json array, and assume that each preceding element in the array occurred
// Before each subseqeunt element.
// For now, it also assumes that the entire event log can be stored in memory! Since this is a todo list app, we are only
// usually expecting an order of 1000 - 5000 events. In the case where a user creates and completes 10 tasks a day, for 5
// years straight, we'll still only have about 20000 events. Thus, this is a reasonable starting point. We can detect the 
// mega edge cases and deal with them appropriately to make stuff faster as a late-stage optimization.

// Define the strings to match against in the JSON parsing!
import { EventTypes } from './dataEventJsonSchema';

const EventReplayFunctions = new Map([
    [EventTypes.taskAdded, replayTaskAddedEvent],
    [EventTypes.childTaskAdded, replayChildTaskAddedEvent],
    [EventTypes.taskRevived, replayTaskRevivedEvent],
    [EventTypes.taskDeleted, replayTaskDeletedEvent],
    [EventTypes.taskCompleted, replayTaskCompletedEvent],
    [EventTypes.taskFailed, replayTaskFailedEvent],
    [EventTypes.taskUpdated, replayTaskUpdatedEvent],
    [EventTypes.taskStarted, replayTaskStartedEvent]
]);

function replayTaskAddedEvent(eventData, tasklist, taskMap) {

}
function replayChildTaskAddedEvent(eventData, tasklist, taskMap) {

}
function replayTaskRevivedEvent(eventData, tasklist, taskMap) {

}
function replayTaskDeletedEvent(eventData, tasklist, taskMap) {

}
function replayTaskCompletedEvent(eventData, tasklist, taskMap) {

}
function replayTaskFailedEvent(eventData, tasklist, taskMap) {

}
function replayTaskUpdatedEvent(eventData, tasklist, taskMap) {

}
function replayTaskStartedEvent(eventData, tasklist, taskMap) {

}

export function RebuildState(eventLogAsJsonArray, tasklist) {
    let taskMap = createTaskMap(tasklist);
    JSON.parse(eventLogAsJsonArray).forEach(eventObj => replayEvent(eventObj, tasklist, taskMap));
}
function replayEvent(event, tasklist, taskMap) {
    if (!EventReplayFunctions.has(event.eventType)) {
        throw new Error("Could not identify the event type of a parsed data event! The invalid event type was: " + event.eventType);
    }
    else {
        EventReplayFunctions.get(event.eventType)(event, tasklist, taskMap);
    }
}
function createTaskMap(tasklist) {
    let map = new Map();
    tasklist.GetActiveTasks().array.forEach(task => map.set(task.id, task));
    tasklist.GetCompletedTasks().array.forEach(task => map.set(task.id, task));
    tasklist.GetFailedTasks().array.forEach(task => map.set(task.id, task));
}