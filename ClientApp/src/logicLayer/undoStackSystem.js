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
    const UndoStack = [];   // This will store the undoable event objects.

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
        if (UndoStack.length === 0) { return false; }
        const undoableAction = UndoStack.pop();

        // Only perform the undo if the action has not expired
        if (currTime - undoableAction.timestamp > UNDO_ACTION_MAX_AGE_MILLISECONDS) {
            // Clear the entire stack, since the latest of them is expired.
            UndoStack.length = 0;
            return false;
        }
        // Try to perform the undo operation on the domain-layer object!
        else if (UndoActionFunctions.has(undoableAction.eventType)) {
            UndoActionFunctions.get(undoableAction.eventType)(undoableAction, tasklistObj);
        }
        // Oops. Something went wrong, we did not have a handler for this event type!
        else {
            throw new Error("Do not have an undo-action handler for event type: " + undoableAction.eventType);
        }
    }

}

// Store a map of function which handle different types of undo actions
const UndoActionFunctions = new Map([
    [EventTypes.taskAdded, undoTaskAdded],
    [EventTypes.childTaskAdded, undoChildTaskAdded],
    [EventTypes.taskRevived, undoTaskRevived],
    [EventTypes.taskCompleted, undoTaskCompleted],
    [EventTypes.taskActivated, undoTaskActivated],
    [EventTypes.taskStarted, undoTaskStarted],
    [EventTypes.taskEdited, undoTaskEdited]
]);