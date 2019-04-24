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
import { Category } from './Task';

const EventReplayFunctions = new Map([
    [EventTypes.taskAdded, replayTaskAddedEvent],
    [EventTypes.childTaskAdded, replayChildTaskAddedEvent],
    [EventTypes.taskRevived, replayTaskRevivedEvent],
    [EventTypes.taskDeleted, replayTaskDeletedEvent],
    [EventTypes.taskCompleted, replayTaskCompletedEvent],
    [EventTypes.taskFailed, replayTaskFailedEvent],
    [EventTypes.taskActivated, replayTaskActivatedEvent],
    [EventTypes.taskStarted, replayTaskStartedEvent]
]);

// Replays all event in the json log to rebuild the state exactly. It also tracks the largest id it found, which is returned.
// The return value should therefore be used to tell the logic layer what 'id' to start at to avoid id collisions when new
// tasks are created by the user. TODO: replace all ids with UUID generations to avoid this stupid incrementing method.
export function RebuildState(eventLogAsJsonArray, tasklist) {
    let taskMap = createTaskMap(tasklist);
    let maxid = 0;
    JSON.parse(eventLogAsJsonArray).forEach(eventObj => {
        replayEvent(eventObj, tasklist, taskMap);
        if (eventObj.id > maxid) maxid = eventObj.id;
    });
    return maxid;
}

function createTaskMap(tasklist) {
    let map = new Map();
    tasklist.GetActiveTasks().forEach(task => map.set(task.id, task));
    tasklist.GetCompletedTasks().forEach(task => map.set(task.id, task));
    tasklist.GetFailedTasks().forEach(task => map.set(task.id, task));
    return map;
}

function replayEvent(event, tasklist, taskMap) {
    if (!EventReplayFunctions.has(event.eventType)) {
        throw new Error("Could not identify the event type of a parsed data event! The invalid event type was: " + event.eventType);
    }
    else {
        EventReplayFunctions.get(event.eventType)(event, tasklist, taskMap);
    }
}

// Specific Handlers
function replayTaskAddedEvent(eventData, tasklist, taskMap) {
    if (eventData.parent !== null) throw new Error("Invalid event state: Tried to add a new independent task but event data state the new task already had a parent!");
    taskMap.set(eventData.id, tasklist.CreateNewIndependentTask(eventData.name, eventData.category, eventData.timestamp, eventData.colourid, eventData.id));
}
function replayChildTaskAddedEvent(eventData, tasklist, taskMap) {
    if (eventData.parent === null) throw new Error("Invalid event state: Tried to add a child, but the eventData stated the task had no parent");
    let parentTask = taskMap.get(eventData.parent);
    if (eventData.category === Category.Weekly) {
        taskMap.set(eventData.id, tasklist.CreateNewSubtask(eventData.name, parentTask, eventData.timestamp, eventData.id));
    }
    else if (eventData.category === Category.Daily) {
        taskMap.set(eventData.id, tasklist.CreateNewDailySubtask(eventData.name, parentTask, eventData.timestamp, eventData.id));
    }
    else {
        throw new Error("Illegal category for subtask event!");
    }
}
function replayTaskRevivedEvent(eventData, tasklist, taskMap) {
    if (eventData.original === null) throw new Error("Invalid event state: Tried to revive a task, but there was no 'original' id in the eventData");
    let originalTask = taskMap.get(eventData.original);
    if (eventData.category === Category.Deferred) {
        taskMap.set(eventData.id, tasklist.ReviveTaskAsClone(originalTask, false, eventData.timestamp, eventData.id));
    }
    else {
        taskMap.set(eventData.id, tasklist.ReviveTaskAsClone(originalTask, true, eventData.timestamp, eventData.id));
    }
}
function replayTaskDeletedEvent(eventData, tasklist, taskMap) {
    tasklist.DeleteTask(taskMap.get(eventData.id));
}
function replayTaskCompletedEvent(eventData, tasklist, taskMap) {
    tasklist.CompleteTask(taskMap.get(eventData.id), eventData.timestamp);
}
function replayTaskFailedEvent(eventData, tasklist, taskMap) {
    tasklist.FailTask(taskMap.get(eventData.id), eventData.timestamp);
}
function replayTaskActivatedEvent(eventData, tasklist, taskMap) {
    tasklist.MoveCategory(taskMap.get(eventData.id), eventData.category, eventData.timestamp);
}
function replayTaskStartedEvent(eventData, tasklist, taskMap) {
    tasklist.StartTask(taskMap.get(eventData.id), eventData.timestamp);
}
