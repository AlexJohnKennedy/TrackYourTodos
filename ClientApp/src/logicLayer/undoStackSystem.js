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

    // Exported inner function: Perform undo operation
    function PerformUndo(currTime, tasklistObj) {
        console.log("Performing undo, in undoStackSystem");
        if (UndoStack.length === 0) { return false; }
        const undoableAction = UndoStack.pop();

        // Only perform the undo if the action has not expired
        if (currTime - undoableAction.timestamp > UNDO_ACTION_MAX_AGE_MILLISECONDS) {
            console.log("top of stack undo item is expired. Returning false");
            // Clear the entire stack, since the latest of them is expired.
            UndoStack.length = 0;
            return false;
        }
        // Try to perform the undo operation on the domain-layer object!
        else if (UndoActionFunctions.has(undoableAction.eventType)) {
            try {
                console.log("calling mapped handler");
                UndoActionFunctions.get(undoableAction.eventType)(undoableAction, tasklistObj);
            } 
            catch(err) {
                console.log("CAUGHT ERROR");
                // This means the undo action is not valid to perform! This is actually a valid state of affairs: E.g. Tried to undo 'start' on a task which just failed.
                // Hence, we catch the error, log the message, and return false
                console.warn(err.message);
                return false;
            }
            return true;
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

// Store a map of function which handle different types of undo actions
const UndoActionFunctions = new Map([
    [EventTypes.taskAdded, (data, tasklist) => tasklist.UndoCreateNewIndependentTask(data.task)],
    [EventTypes.childTaskAdded, (data, tasklist) => tasklist.UndoCreateNewSubtask(data.task)],
    [EventTypes.taskActivated, (data, tasklist) => tasklist.UndoActivateTask(data.task)],
    [EventTypes.taskCompleted, (data, tasklist) => tasklist.UndoCompleteTask(data.task)],
    [EventTypes.taskStarted, (data, tasklist) => tasklist.UndoStartTask(data.task)],
    [EventTypes.taskRevived, (data, tasklist) => tasklist.UndoReviveTaskAsClone(data.newTask, data.originalTask)],
    [EventTypes.taskEdited, (data, tasklist) => tasklist.UndoEditTaskText(data.task, data.originalText, data.originalTimeEdited)]
]);