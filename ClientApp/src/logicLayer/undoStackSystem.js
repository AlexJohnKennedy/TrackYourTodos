import { UNDO_ACTION_MAX_AGE_MILLISECONDS } from './Task';
import { EventTypes } from './dataEventJsonSchema';

// This function instantiates a new component which stores a stack of objects encapsulating the information
// required to perform 'undo' operations. This component forms part of the logic layer, and upon data-model
// re-instantiation, a fresh UndoStack will also be rebuilt.
//
// The Undo stack supports four main operations:
// --- PushUndoableEventToStack()   This is executed by the viewLayerInteraction API every time an undoable event is generated.
// --- PerformUndo()                This pops the top undoable action and performs the domain-layer undo, if it is time valid.
// --- GetSize()                    This simply polls the current size of the stack.
// --- FilterExpiredUndoActions()   This performs a check, filtering out any tasks which have exceeded the 'undo-window' age, relative to a provided timestamp.
export function BuildNewUndoStack() {
    let UndoStack = [];   // This will store the undoable event objects.

    // Exported inner functions: Pushes new data objects onto the stack, so that they can be retrieved later.
    function PushUndoableCreateNewIndependentTask(task, timestamp) {
        UndoStack.push({
            eventType: EventTypes.taskAdded,
            task: task,
            timestamp: timestamp
        });
    }
    function PushUndoableCreateNewSubtask(childtask, timestamp) {
        UndoStack.push({
            eventType: EventTypes.childTaskAdded,
            task: childtask,
            timestamp: timestamp
        });
    }
    function PushUndoableActivateTask(task, timestamp) {
        UndoStack.push({
            eventType: EventTypes.taskActivated,
            task: task,
            timestamp: timestamp
        });
    }
    function PushUndoableCompleteTask(task, timestamp) {
        UndoStack.push({
            eventType: EventTypes.taskCompleted,
            task: task,
            timestamp: timestamp
        });
    }
    function PushUndoableStartTask(task, timestamp) {
        UndoStack.push({
            eventType: EventTypes.taskStarted,
            task: task,
            timestamp: timestamp
        });
    }
    function PushUndoableReviveTask(newTask, originalTask, timestamp) {
        UndoStack.push({
            eventType: EventTypes.taskRevived,
            newTask: newTask,
            originalTask: originalTask,
            timestamp: timestamp
        });
    }
    function PushUndoableEditTask(task, originalText, originalTimeEdited, timestamp) {
        UndoStack.push({
            eventType: EventTypes.taskEdited,
            task: task,
            originalText: originalText,
            originalTimeEdited: originalTimeEdited,
            timestamp: timestamp
        });
    }

    // Exported inner function: Perform undo operation, and return information which will allow the view layer interaction api to
    // serialise and post data corresponding to the correct 'undo' data event.
    function PerformUndo(currTime, tasklistObj) {
        console.log("Performing undo, in undoStackSystem");
        if (UndoStack.length === 0) { return null; }
        const undoableAction = UndoStack.pop();

        // Only perform the undo if the action has not expired
        if (currTime - undoableAction.timestamp > UNDO_ACTION_MAX_AGE_MILLISECONDS) {
            console.log("top of stack undo item is expired. Returning false");
            // Clear the entire stack, since the latest of them is expired.
            UndoStack.length = 0;
            return null;
        }
        // Try to perform the undo operation on the domain-layer object!
        else if (UndoActionFunctions.has(undoableAction.eventType)) {
            try {
                console.log("calling mapped handler");
                return UndoActionFunctions.get(undoableAction.eventType)(currTime, undoableAction, tasklistObj);
            } 
            catch(err) {
                console.log("CAUGHT ERROR");
                // This means the undo action is not valid to perform! This is actually a valid state of affairs: E.g. Tried to undo 'start' on a task which just failed.
                // Hence, we catch the error, log the message, and return false
                console.warn(err.message);
                return null;
            }
        }
        // Oops. Something went wrong, we did not have a handler for this event type!
        else {
            throw new Error("Do not have an undo-action handler for event type: " + undoableAction.eventType);
        }
    }

    function GetSize() {
        return UndoStack.length;
    }

    function FilterExpiredUndoActions(currTime) {
        UndoStack = UndoStack.filter(a => currTime - a.timestamp < UNDO_ACTION_MAX_AGE_MILLISECONDS);
    }

    return Object.freeze({
        // Pushing functions
        PushUndoableCreateNewIndependentTask: PushUndoableCreateNewIndependentTask,
        PushUndoableCreateNewSubtask: PushUndoableCreateNewSubtask,
        PushUndoableActivateTask: PushUndoableActivateTask,
        PushUndoableCompleteTask: PushUndoableCompleteTask,
        PushUndoableStartTask: PushUndoableStartTask,
        PushUndoableReviveTask: PushUndoableReviveTask,
        PushUndoableEditTask: PushUndoableEditTask,

        // Performing undos and modifying stack state.
        PerformUndo: PerformUndo,
        GetSize: GetSize,
        FilterExpiredUndoActions: FilterExpiredUndoActions
    });
}

// Store a map of function which handle different types of undo actions.
// For each reversion action, we will return the corresponding EventType and timestamp of the event we just 'un-did'.
const UndoActionFunctions = new Map([
    [EventTypes.taskAdded, (undoTime, data, tasklist) => {
        tasklist.UndoCreateNewIndependentTask(data.task);
        return {
            eventType: EventTypes.taskAddedUndo,
            timestamp: undoTime,
            task: data.task,
            revertedEventTimestamp: data.timestamp
        };
    }],
    [EventTypes.childTaskAdded, (undoTime, data, tasklist) => {
        tasklist.UndoCreateNewSubtask(data.task);
        return {
            eventType: EventTypes.childTaskAddedUndo,
            timestamp: undoTime,
            task: data.task,
            revertedEventTimestamp: data.timestamp
        };
    }],
    [EventTypes.taskActivated, (undoTime, data, tasklist) => {
        tasklist.UndoActivateTask(data.task);
        return {
            eventType: EventTypes.taskActivatedUndo,
            timestamp: undoTime,
            task: data.task,
            revertedEventTimestamp: data.timestamp
        };
    }],
    [EventTypes.taskCompleted, (undoTime, data, tasklist) => {
        tasklist.UndoCompleteTask(data.task);
        return {
            eventType: EventTypes.taskCompletedUndo,
            timestamp: undoTime,
            task: data.task,
            revertedEventTimestamp: data.timestamp
        };
    }],
    [EventTypes.taskStarted, (undoTime, data, tasklist) => { 
        tasklist.UndoStartTask(data.task);
        return {
            eventType: EventTypes.taskStartedUndo,
            timestamp: undoTime,
            task: data.task,
            revertedEventTimestamp: data.timestamp
        };
    }],
    [EventTypes.taskRevived, (undoTime, data, tasklist) => {
        tasklist.UndoReviveTaskAsClone(data.newTask, data.originalTask);
        return {
            eventType: EventTypes.taskRevivedUndo,
            timestamp: undoTime,
            newTask: data.newTask,
            originalTask: data.originalTask,
            revertedEventTimestamp: data.timestamp
        };
    }],
    [EventTypes.taskEdited, (undoTime, data, tasklist) => {
        tasklist.UndoEditTaskText(data.task, data.originalText, data.originalTimeEdited);
        return {
            eventType: EventTypes.taskEditedUndo,
            timestamp: undoTime,
            task: data.task,
            originalText: data.originalText,
            originalTimeEdited: data.originalTimeEdited,
            revertedEventTimestamp: data.timestamp
        };
    }]
]);