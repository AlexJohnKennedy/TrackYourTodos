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
import { Category, ProgressStatus } from './Task';

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

// Events which can be safely skipped without executing, for a given progress status denoting task state.
const SkippableEventsForProgressStatusMappings = new Map([
    [ProgressStatus.NotStarted, new Set([
        EventTypes.taskAdded, EventTypes.childTaskAdded, EventTypes.taskActivated, EventTypes.taskStartedUndo
    ])],
    [ProgressStatus.Started, new Set([
        EventTypes.taskAdded, EventTypes.childTaskAdded, EventTypes.taskActivated, EventTypes.taskStarted, EventTypes.taskCompletedUndo
    ])],
    [ProgressStatus.Completed, new Set([
        EventTypes.taskAdded, EventTypes.childTaskAdded, EventTypes.taskActivated, EventTypes.taskStarted, EventTypes.taskCompleted
    ])],
    [ProgressStatus.Failed, new Set([
        EventTypes.taskAdded, EventTypes.childTaskAdded, EventTypes.taskActivated, EventTypes.taskStarted, EventTypes.taskFailed, EventTypes.taskRevivedUndo
    ])],
    [ProgressStatus.Reattempted, new Set([
        EventTypes.taskAdded, EventTypes.childTaskAdded, EventTypes.taskActivated, EventTypes.taskStarted, EventTypes.taskFailed, EventTypes.taskRevived
    ])]
]);

// Replays all event in the json log to rebuild the state exactly. It also tracks the largest id it found, which is returned.
// The return value should therefore be used to tell the logic layer what 'id' to start at to avoid id collisions when new
// tasks are created by the user.
export function RebuildState(eventLogAsArray, tasklist, undoStack) {
    let taskMap = createTaskMap(tasklist);
    let latestid = "";
    eventLogAsArray.forEach(eventObj => {
        console.debug("{ " + eventObj.eventType + ", " + eventObj.name + "}");
        replayEvent(eventObj, tasklist, taskMap, undoStack);
        latestid = eventObj.id;
    });
    
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
    
    let task = taskMap.get(event.id);
    if (task === undefined || task === null) {
        // Handle cases where the associated task does not exist yet.
        // If the event is a creation event or undo-deletion event, this is expected.
        if (event.eventType === EventTypes.taskAdded || event.eventType === EventTypes.childTaskAdded || event.eventType === EventTypes.taskDeletedUndo || (event.eventType === EventTypes.taskRevived && taskMap.get(event.original).progressStatus === ProgressStatus.Failed)) {
            EventReplayFunctions.get(event.eventType)(event, tasklist, taskMap, undoStack);
            return;
        }
        // In this case we need to implicitly fail the original task first.
        else if (event.eventType === EventTypes.taskRevived && taskMap.get(event.original).category !== Category.Deferred) {
            tasklist.FailTask(taskMap.get(event.original), event.timestamp);
            undoStack.ClearStack();
            EventReplayFunctions.get(event.eventType)(event, tasklist, taskMap, undoStack);
            return;
        }
        // Skip execution of these events, since they have no effect in this case.
        else if (event.eventType === EventTypes.taskAddedUndo || event.eventType === EventTypes.childTaskAddedUndo || event.eventType === EventTypes.taskEdited || event.eventType === EventTypes.taskDeleted) {
            return;
        }
        // In these cases, we must implicitly create the task first, to 'join' the missing link.
        else if (event.eventType === EventTypes.taskActivated || event.eventType === EventTypes.taskStarted) {
            // If the task does not exist yet, we are happy to create it implicitly.
            if (event.parent !== null && event.parent !== undefined) { EventReplayFunctions.get(EventTypes.childTaskAdded)(event, tasklist, taskMap, undoStack); }
            else { EventReplayFunctions.get(EventTypes.taskAdded)(event, tasklist, taskMap, undoStack); }
            EventReplayFunctions.get(event.eventType)(event, tasklist, taskMap, undoStack);
            return;
        }
        else if (event.eventType === EventTypes.taskCompleted && event.category !== Category.Deferred) {
            if (event.parent !== null && event.parent !== undefined) { EventReplayFunctions.get(EventTypes.childTaskAdded)(event, tasklist, taskMap, undoStack); }
            else { EventReplayFunctions.get(EventTypes.taskAdded)(event, tasklist, taskMap, undoStack); }
            EventReplayFunctions.get(EventTypes.taskStarted)(event, tasklist, taskMap, undoStack);
            EventReplayFunctions.get(EventTypes.taskCompleted)(event, tasklist, taskMap, undoStack);
            return;
        }
        else {
            throw new Error("Could not find a valid action for event regarding non-existant task. The invalid event was: " + event.toString());
        }
    }
    else if (task.category === Category.Deferred) {
        // Skip these events, since they will have no impact on the current state.
        if (event.eventType === EventTypes.taskAdded || event.eventType === EventTypes.childTaskAdded || event.eventType === EventTypes.taskActivatedUndo || event.eventType === EventTypes.taskDeletedUndo) {
            return;
        }
        // In these cases, we must implicitly activate the task first, to jump the 'missing event' gap.
        else if (event.eventType === EventTypes.taskStarted || event.eventType === EventTypes.TaskFailed) {
            tasklist.ActivateTask(task, event.category, event.timestamp);
            undoStack.PushUndoableActivateTask(task, event.timestamp);
            EventReplayFunctions.get(event.eventType)(event, tasklist, taskMap, undoStack);
            return;
        }
        else {
            EventReplayFunctions.get(event.eventType)(event, tasklist, taskMap, undoStack);
            return;
        }
    }
    else if (SkippableEventsForProgressStatusMappings.get(task.progressStatus).has(event.eventType)) {
        console.debug("SKIPPING => { " + event.eventType + ", " + event.name + "}");
        return;     // This event can be safely skipped in these cases
    }
    else if (doImplicitLinkingEventIfRequired(task, event, tasklist, taskMap, undoStack)) {
        console.debug("LINK COMPLETED");
        return;
    }
    else {
        EventReplayFunctions.get(event.eventType)(event, tasklist, taskMap, undoStack);
        return;
    }
}

// Holy mother of god this code is so fucking terrible.
function doImplicitLinkingEventIfRequired(task, event, tasklist, taskMap, undoStack) {
    // CASE: Task is not started but we want to do 'completed'. We can therefore implicitly link the states by first doing a "taskStarted" operation.
    if (event.eventType === EventTypes.taskCompleted && task.progressStatus === ProgressStatus.NotStarted) {
        console.debug("PERFORMING LINK for task [" + task.name + "]: Linking from [NotStarted] to [Completed] by performing a [taskStarted] operation");
        EventReplayFunctions.get(EventTypes.taskStarted)(event, tasklist, taskMap, undoStack);
        EventReplayFunctions.get(EventTypes.taskCompleted)(event, tasklist, taskMap, undoStack);
        return true;
    }

    // CASE: We want to do 'task revived' but the "original task" is not failed yet. In this case, we should implicitly 'fail' the original task first.
    if (event.eventType === EventTypes.taskRevived) {
        let original = taskMap.get(event.original);
        if (original.category !== Category.Deferred && (original.progressStatus === ProgressStatus.NotStarted || original.progressStatus === ProgressStatus.Started)) {
            console.debug("PERFORMING LINK for task [" + task.name + "]: Linking from [Active original task] to [Revived original task] by performing a [taskRevived] operation");
            tasklist.FailTask(original, event.timestamp);
            undoStack.ClearStack();
            EventReplayFunctions.get(EventTypes.taskRevived)(event, tasklist, taskMap, undoStack);
            return true;
        }
    }

    return false;
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
    if (eventData.category !== Category.Weekly && eventData.category !== Category.Daily) {
        throw new Error("Illegal category for subtask event!");
    }
    const task = tasklist.CreateNewSubtask(eventData.name, parentTask, eventData.category, eventData.timestamp, eventData.id);
    taskMap.set(eventData.id, task);
    undoStack.PushUndoableCreateNewSubtask(task, eventData.timestamp);
}
function replayTaskRevivedEvent(eventData, tasklist, taskMap, undoStack) {
    if (eventData.original === null) throw new Error("Invalid event state: Tried to revive a task, but there was no 'original' id in the eventData");
    let originalTask = taskMap.get(eventData.original);
    if (originalTask.progressStatus !== ProgressStatus.Failed) {
        console.warn("Tried to revive a task [" + originalTask.name + "] which is not in the graveyard: The status was " + originalTask.progressStatus + ". This means something weird is going on..." );
        return;
    }
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
    const task = taskMap.get(eventData.id);
    tasklist.AbandonTask(task);
    undoStack.PushUndoableDeleteTask(task, eventData.timestamp);
    taskMap.delete(eventData.id);
}
function replayTaskCompletedEvent(eventData, tasklist, taskMap, undoStack) {
    const task = taskMap.get(eventData.id);
    tasklist.CompleteTask(task, eventData.timestamp);
    undoStack.PushUndoableCompleteTask(task, eventData.timestamp);
}
function replayTaskFailedEvent(eventData, tasklist, taskMap, undoStack) {
    tasklist.FailTask(taskMap.get(eventData.id), eventData.timestamp);
    undoStack.ClearStack();
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
    const data = undoStack.PerformUndo(eventData.timestamp, tasklist);
    taskMap.set(eventData.id, data.task);
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
