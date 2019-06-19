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
    // Normal data events
    [EventTypes.taskAdded, replayTaskAddedEvent],
    [EventTypes.childTaskAdded, replayChildTaskAddedEvent],
    [EventTypes.taskRevived, replayTaskRevivedEvent],
    [EventTypes.taskDeleted, replayTaskDeletedEvent],
    [EventTypes.taskCompleted, replayTaskCompletedEvent],
    [EventTypes.taskFailed, replayTaskFailedEvent],
    [EventTypes.taskActivated, replayTaskActivatedEvent],
    [EventTypes.taskStarted, replayTaskStartedEvent],
    [EventTypes.taskEdited, replayTaskEditedEvent],

    // Undo data events
    [EventTypes.taskAddedUndo, replayTaskAddedUndoEvent],
    [EventTypes.childTaskAddedUndo, replayChildTaskAddedUndoEvent],
    [EventTypes.taskRevivedUndo, replayTaskRevivedUndoEvent],
    [EventTypes.taskDeletedUndo, replayTaskDeletedUndoEvent],
    [EventTypes.taskCompletedUndo, replayTaskCompletedUndoEvent],
    [EventTypes.taskActivatedUndo, replayTaskActivatedUndoEvent],
    [EventTypes.taskStartedUndo, replayTaskStartedUndoEvent],
    [EventTypes.taskEditedUndo, replayTaskEditedUndoEvent],
]);

// Replays all event in the json log to rebuild the state exactly. It also tracks the largest id it found, which is returned.
// The return value should therefore be used to tell the logic layer what 'id' to start at to avoid id collisions when new
// tasks are created by the user.
export function RebuildState(eventLogAsArray, tasklist, undoStack) {
    let taskMap = createTaskMap(tasklist);
    let latestid = "";
    let latesttime = 0;
    eventLogAsArray.forEach(eventObj => {
        replayEvent(eventObj, tasklist, taskMap, undoStack);
        latestid = eventObj.id;
        latesttime = eventObj.timestamp;
    });
    //undoStack.FilterExpiredUndoActions(latesttime);
    
    return latestid;
}

function createTaskMap(tasklist) {
    let map = new Map();
    tasklist.GetActiveTasks().forEach(task => map.set(task.id, task));
    tasklist.GetCompletedTasks().forEach(group => group.tasks.forEach(task => map.set(task.id, task)));
    tasklist.GetFailedTasks().forEach(group => group.tasks.forEach(task => map.set(task.id, task)));
    return map;
}

function replayEvent(event, tasklist, taskMap, undoStack) {
    if (!EventReplayFunctions.has(event.eventType)) {
        throw new Error("Could not identify the event type of a parsed data event! The invalid event type was: " + event.eventType);
    }
    else {
        EventReplayFunctions.get(event.eventType)(event, tasklist, taskMap, undoStack);
    }
}

// Specific Handlers
function replayTaskAddedEvent(eventData, tasklist, taskMap, undoStack) {
    if (eventData.parent !== null) throw new Error("Invalid event state: Tried to add a new independent task but event data state the new task already had a parent!");
    const task = tasklist.CreateNewIndependentTask(eventData.name, eventData.category, eventData.timestamp, eventData.context, eventData.colourId, eventData.id);
    taskMap.set(eventData.id, task);
    undoStack.PushUndoableCreateNewIndependentTask(task, eventData.timestamp);
}
function replayChildTaskAddedEvent(eventData, tasklist, taskMap, undoStack) {
    if (eventData.parent === null) throw new Error("Invalid event state: Tried to add a child, but the eventData stated the task had no parent");
    let parentTask = taskMap.get(eventData.parent);
    if (eventData.category === Category.Weekly) {
        const task = tasklist.CreateNewSubtask(eventData.name, parentTask, eventData.timestamp, eventData.id);
        taskMap.set(eventData.id, task);
        undoStack.PushUndoableCreateNewSubtask(task, eventData.timestamp);
    }
    else if (eventData.category === Category.Daily) {
        const task = tasklist.CreateNewDailySubtask(eventData.name, parentTask, eventData.timestamp, eventData.id);
        taskMap.set(eventData.id, task);
        undoStack.PushUndoableCreateNewSubtask(task, eventData.timestamp);
    }
    else {
        throw new Error("Illegal category for subtask event!");
    }
}
function replayTaskRevivedEvent(eventData, tasklist, taskMap, undoStack) {
    if (eventData.original === null) throw new Error("Invalid event state: Tried to revive a task, but there was no 'original' id in the eventData");
    let originalTask = taskMap.get(eventData.original);
    if (eventData.category === Category.Deferred) {
        const newtask = tasklist.ReviveTaskAsClone(originalTask, false, eventData.timestamp, eventData.id);
        taskMap.set(eventData.id, newtask);
        undoStack.PushUndoableReviveTask(newtask, originalTask, eventData.timestamp);
    }
    else {
        const newtask = tasklist.ReviveTaskAsClone(originalTask, true, eventData.timestamp, eventData.id);
        taskMap.set(eventData.id, newtask);
        undoStack.PushUndoableReviveTask(newtask, originalTask, eventData.timestamp);
    }
}
function replayTaskDeletedEvent(eventData, tasklist, taskMap, undoStack) {
    tasklist.DeleteTask(taskMap.get(eventData.id));
}
function replayTaskCompletedEvent(eventData, tasklist, taskMap, undoStack) {
    const task = taskMap.get(eventData.id);
    tasklist.CompleteTask(task, eventData.timestamp);
    undoStack.PushUndoableCompleteTask(task, eventData.timestamp);
}
function replayTaskFailedEvent(eventData, tasklist, taskMap, undoStack) {
    tasklist.FailTask(taskMap.get(eventData.id), eventData.timestamp);
}
function replayTaskActivatedEvent(eventData, tasklist, taskMap, undoStack) {
    const task = taskMap.get(eventData.id);
    tasklist.ActivateTask(task, eventData.category, eventData.timestamp);
    undoStack.PushUndoableActivateTask(task, eventData.timestamp);
}
function replayTaskStartedEvent(eventData, tasklist, taskMap, undoStack) {
    const task = taskMap.get(eventData.id);
    tasklist.StartTask(task, eventData.timestamp);
    undoStack.PushUndoableStartTask(task, eventData.timestamp);
}
function replayTaskEditedEvent(eventData, tasklist, taskMap, undoStack) {
    const task = taskMap.get(eventData.id);
    const originalTimeedited = task.eventTimestamps.timeEdited === null ? task.eventTimestamps.timeCreated : task.eventTimestamps.timeEdited;
    undoStack.PushUndoableEditTask(task, task.name, originalTimeedited, eventData.timestamp);
    tasklist.EditTaskText(task, eventData.name, eventData.timestamp);
}

function replayTaskAddedUndoEvent(eventData, tasklist, taskMap, undoStack) {
    undoStack.PerformUndo(eventData.timestamp, tasklist);
    taskMap.delete(eventData.id);
}
function replayChildTaskAddedUndoEvent(eventData, tasklist, taskMap, undoStack) {
    undoStack.PerformUndo(eventData.timestamp, tasklist);
    taskMap.delete(eventData.id);
}
function replayTaskRevivedUndoEvent(eventData, tasklist, taskMap, undoStack) {
    undoStack.PerformUndo(eventData.timestamp, tasklist);
    taskMap.delete(eventData.id);   // Delete the new clone, but not the original of course.
}
function replayTaskDeletedUndoEvent(eventData, tasklist, taskMap, undoStack) {
    throw new Error("Task Deletion is not yet implemented");
}
function replayTaskCompletedUndoEvent(eventData, tasklist, taskMap, undoStack) {
    undoStack.PerformUndo(eventData.timestamp, tasklist);
}
function replayTaskActivatedUndoEvent(eventData, tasklist, taskMap, undoStack) {
    undoStack.PerformUndo(eventData.timestamp, tasklist);
}
function replayTaskStartedUndoEvent(eventData, tasklist, taskMap, undoStack) {
    undoStack.PerformUndo(eventData.timestamp, tasklist);
}
function replayTaskEditedUndoEvent(eventData, tasklist, taskMap, undoStack) {
    undoStack.PerformUndo(eventData.timestamp, tasklist);
}
