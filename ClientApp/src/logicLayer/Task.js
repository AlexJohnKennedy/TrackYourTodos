// This file defines the basic object-prototype for any item on any list.
// We will call these items a 'Task', and they will self contain all their state data.
import { TimeGroupTypes, BuildNewTimeGroupedTaskList } from './dateGroupTaskList';
import NewUuid from 'uuid/v4';

/* Global settings */

export const PUT_NEW_TASKS_AT_TOP_OF_LIST = false;

// Character limit for text fields of an item.
export const MAX_TASK_NAME_LEN = 120;

export const MAX_CONTEXT_NAME_LEN = 20;

export const DEFAULT_GLOBAL_CONTEXT_STRING = "global";  // Context strings are NOT case sensitive.

function isValidContextString(s) {
    if (s === undefined || s === null || s === "" || s.length > MAX_CONTEXT_NAME_LEN) return false;

    // TODO: Alpha numeric check, no whitespace check

    return true;
}

// Enumeration object, specifying the possible categories for an item. These will basically dictate where an item
// appears on the UI, under which board. (PSST): 'Boards' themselves are just a UI-layer concept, so they will not
// we referred to here.
export const Category = Object.freeze({
    Goal : 0,
    Weekly : 1,
    Daily: 2,
    Deferred : 3
});
export const ProgressStatus = Object.freeze({
    NotStarted : 0,
    Started : 1,
    Completed : 2,
    Aborted : 3,
    Failed : 4,
    Reattempted : 5
});

const DefaultColourId = 0;
function DowngradeCategory(category) {
    if (category >= Category.Daily) {
        throw new Error("CANNOT DOWNGRADE");
    }
    else {
        return category + 1;
    }
}

//let GetNewId = ((startVal) => () => startVal++)(0);
//export function SetIdStartVal(newStartVal) {
//    GetNewId = ((startVal) => () => startVal++)(newStartVal);
//} 

let GetNewId = () => NewUuid();
export function SetIdStartVal(newStartVal) {
    /* do nothing, since we are using v4 uuids for now! */
}

export class TaskObjects {
    constructor() {
        this.tasks = [];
        this.failedTasks = BuildNewTimeGroupedTaskList(TimeGroupTypes.MONTH, false);
        this.completedTasks = BuildNewTimeGroupedTaskList(TimeGroupTypes.MONTH, false);
    }

    // Get tasks. WARNING, the Task objects returned will be exposed! Do not send beyond the interaction layer!!
    GetActiveTasks(filterFunc = null) {
        if (filterFunc == null) {
            return this.tasks.slice(0);                         // Shallow copy
        }
        else {
            return this.tasks.slice(0).filter(filterFunc);      // Filtered shallow copy
        }
    }

    GetCompletedTasks(filterFunc = null) {
        if (filterFunc == null) {
            return this.completedTasks.GetAllGroupedTasks();             // Shallow copy
        }
        else {
            return this.completedTasks.GetAllGroupedTasks().filter(filterFunc);
        }
    }

    GetFailedTasks(filterFunc = null) {
        if (filterFunc == null) {
            return this.failedTasks.GetAllGroupedTasks();             // Shallow copy
        }
        else {
            return this.failedTasks.GetAllGroupedTasks().filter(filterFunc);
        }
    }

    // Creates a parentless task, in a specified category.
    CreateNewIndependentTask(name, category, timeCreatedUNIX, context = DEFAULT_GLOBAL_CONTEXT_STRING, colourid = DefaultColourId, id = null) {
        if (id === null || id === undefined) {
            id = GetNewId();
        }

        let newTask = new Task(id, name, category, null, colourid, timeCreatedUNIX, context);
        if (PUT_NEW_TASKS_AT_TOP_OF_LIST) {
            this.tasks.unshift(newTask);
        }
        else {
            this.tasks.push(newTask);
        }
        return newTask;
    }
    UndoCreateNewIndependentTask(task) {
        if (task === null || task === undefined) throw new Error("Null task is invalid to undo operation");
        
        // If this task is not in a state where is it has JUST been created, then this operation is illegal.
        if (task.progressStatus !== ProgressStatus.NotStarted || task.parent !== null || task.children.length > 0) {
            console.error(task);
            throw new Error("Cannot undo CreateIndependentTask() for task which is not in a 'just created' state. See STDERR for task object log");
        }

        // Okay. Since this is a legal operation, all we have to do is remove the task from the task collection(s).
        this.tasks = this.tasks.filter(t => t !== task);
    }
    
    // Creates a new child task, in the category one level below the parent's category.
    CreateNewSubtask(name, parent, timeCreatedUNIX, id = null) {
        if (id === null || id === undefined) {
            id = GetNewId();
        }

        let newTask = new Task(id, name, DowngradeCategory(parent.category), parent, parent.colourid, timeCreatedUNIX, parent.context);
        this.tasks.push(newTask);
        parent.addChild(newTask);

        return newTask;
    }
    // Creates a new child task, two categories below the parent's category, if the parent task is a Goal object.
    CreateNewDailySubtask(name, parent, timeCreatedUNIX, id = null) {
        if (id === null || id === undefined) {
            id = GetNewId();
        }

        let newTask = new Task(id, name, Category.Daily, parent, parent.colourid, timeCreatedUNIX, parent.context);
        this.tasks.push(newTask);
        parent.addChild(newTask);

        return newTask;
    }
    UndoCreateNewSubtask(task) {
        if (task === null || task === undefined) throw new Error("Null task is invalid to undo operation");

        // If this task is not in a state where it has JUST been created as a subtask, then this operation is illegal.
        if (task.progressStatus !== ProgressStatus.NotStarted || task.parent === null || task.children.length > 0) {
            console.error(task);
            throw new Error("Cannot undo CreateNewSubtask() for task which is not in a 'just created as child' state. See STDERR for task object log");
        }

        // Okay. Since this is a legal operation, all we have to do is remove the task from the task collection(s), and remove the task as a child of the parent
        this.tasks = this.tasks.filter(t => t !== task);
        task.parent.removeChild(task);
    }
    
    // Function which modifies the category of a task. This is only allowed if the task does not have any children or parent.
    // This is most likely only used to 'activate' a deferred task and move it into the active Boards.
    ActivateTask(task, newCategory, timeStampUNIX) {
        if (task.parent !== null || task.children.length > 0) throw new Error("Cannot modify category of a task with relatives");
        if (newCategory > Category.Daily) {
            throw new Error("Can't activate a task which is already activated!");
        }
        task.eventTimestamps.timeActivated = timeStampUNIX;
        task.category = newCategory;
    }
    UndoActivateTask(task) {
        if (task === null || task === undefined) throw new Error("Null task is invalid to undo operation");

        // If this task is not in a state where it has JUST been activated, then this operation is illegal.
        if (task.ProgressStatus !== ProgressStatus.NotStarted || task.Category < Category.Deferred || task.children.length > 0) {
            console.error(task);
            throw new Error("Cannot undo ActivateTask() for task which is not in a 'just activated' state. See STDERR for task object log");
        }

        // Okay. Since this is a legal operation, we just have to move this task back into the backlog, and clear the timestamp
        task.eventTimestamps.timeActivated = null;
        task.category = Category.Deferred;
    }

    CloseTask(task, progress, list, timeStampUNIX) {
        // When a task is completed, all of the currently active children of that task are automatically 'complete' also.
        let idsToRemove = new Set();
        function close(curr) {
            if (curr.category > Category.Daily || curr.progressStatus > ProgressStatus.Started) return false;
            curr.progressStatus = progress;
            curr.eventTimestamps.timeClosed = timeStampUNIX;
            idsToRemove.add(curr.id);
            
            curr.children.forEach((curr) => close(curr));

            list.AddTask(curr);
            return true;
        }
        
        let result = close(task);
        this.tasks = this.tasks.filter((t) => !idsToRemove.has(t.id));
        return result;
    }
    FailTask(task, timeStampUNIX) {
        return this.CloseTask(task, ProgressStatus.Failed, this.failedTasks, timeStampUNIX);
    }
    CompleteTask(task, timeStampUNIX) {
        return this.CloseTask(task, ProgressStatus.Completed, this.completedTasks, timeStampUNIX);
    }
    UndoCompleteTask(task) {
        // NOTE: It is not permitted to undo FailTask events. Once they fail, they are finalised.
        if (task === null || task === undefined) throw new Error("Null task is invalid to undo operation");

        // If the task is not in a completed state, then this undo operation is illegal.
        if (task.progressStatus !== ProgressStatus.Completed) {
            console.error(task);
            throw new Error("Cannot undo CompleteTask() on an event which is not completed. See STDERR for task object log.");
        }

        // Okay. Set this task back to 'Started' state, and all children back into either 'Not started' or 'started' state, depending on
        // if the started timestamp is set. Then clear all the 'time closed' timestamp for all of them. We will use the same search algorithm
        // logic as the close-task operation in order to perform this.
        // In order to determine if a child task was completed as part of the same completion action, we can compare the timeClosed timestamps.
        // This will avoid accidentally undo-ing separately-completed subtasks of a parent task, which was completed later.
        function undoClose(curr, rootTimestamp) {
            // Determine if this child is completed, and should be undone. If NOT, we return false!
            if (curr.category > Category.Daily || curr.progressStatus !== ProgressStatus.Completed || curr.eventTimestamps.timeClosed !== rootTimestamp) return false;
            
            // Okay, in order to 'undo' this task, we must set it back to either started or not-started. This will depend on which timestamps are present.
            curr.progressStatus = curr.eventTimestamps.timeStarted === null ? ProgressStatus.NotStarted : curr.progressStatus = ProgressStatus.Started;
            curr.eventTimestamps.timeClosed = null;
            this.tasks.push(curr);
            
            curr.children.forEach((curr) => undoClose(curr));

            // Filter this task back out of the 'completed tasks' collection.
            // TODO: ADD THE REMOVETASK OPERATION TO THE GROUPED TASK DATA OBJECT
            this.completedTasks.RemoveTask(curr);
            return true;
        }

        // Recursively revert tasks.
        undoClose(task);

        // Sort active task list by time activated to restore the original insertion ordering
        this.tasks.sort((a, b) => a.eventTimestamps.timeActivated - b.eventTimestamps.timeActivated);
    }

    // TODO: Probably just remove this? Not sure if deletion is required.
    DeleteTask(task) {
        // Clear all parent and child links from the deleted task!
        if (task.parent) task.parent.removeChild(task);
        for (let child in task.children) {
            task.removeChild(child);
        }
        // Remove it from our list, and invoke!
        this.tasks.filter((t) => t !== task);
    }

    StartTask(task, timeStartedUNIX) {
        // All we do here is set the progress of a task to 'started'.
        if (task.category > Category.Daily || task.progressStatus > ProgressStatus.Started) {
            throw new Error("Tried to start a task which was not on the active board, and not 'not-started'");
        }
        else if (task.progressStatus === ProgressStatus.Started) {
            return;     // Just do nothing in this case.
        }
        else {
            task.progressStatus = ProgressStatus.Started
            task.eventTimestamps.timeStarted = timeStartedUNIX;
        }
    }

    ReviveTaskAsClone(task, asActive, timeRevivedUNIX, id = null) {
        // Used to take a dead/failed task and 'revive' it by making a copy of it as an active or deferred task
        if (task.progressStatus !== ProgressStatus.Failed) throw new Error("Cannot revive a task which is not in the graveyard");
        let category = asActive ? task.category : Category.Deferred;
        task.progressStatus = ProgressStatus.Reattempted;   // Signal that this task has been revived. We only want to be able to do this once per failure.
        task.eventTimestamps.timeRevived = timeRevivedUNIX;
        return this.CreateNewIndependentTask(task.name, category, timeRevivedUNIX, task.context, task.colourid, id);
    }

    EditTaskText(task, newText, timeEditedUnix) {
        if (task === null || task === undefined) throw new Error("Task must not be null");
        if (newText === null || newText === undefined) throw new Error("New task text must not be null");
        newText = newText.trim();
        if (newText.length === 0 || newText.length > MAX_TASK_NAME_LEN) throw new Error("Invalid task text: " + newText);
        task.eventTimestamps.timeEdited = timeEditedUnix;
        task.name = newText;
    }
}

class Task {
    // When a task is created, it must be passed a name string and a category value.
    // It may optionally be passed a parent Task; if none is provided, this task is created without a parent!
    // It may optionally be passed a colourid value; if none is provided, this task is assigned the current default colour.
    // -- NOTE: Any passed colourid will be overridden by a passed parent's colorid; it is enforeced that they match! 
    constructor(id, name, category, parent, colourid, timeCreatedUNIX, context) {
        // Setup the state for this Task.
        if (name.length > MAX_TASK_NAME_LEN) throw new Error("name too long!");
        if (!isValidContextString(context)) throw new Error("Invalid context string: " + context);
        this.id = id;   // MUST NEVER CHANGE. This is a string representation of a UUID (v4, but any is fine)
        this.name = name;
        this.category = category;
        this.progressStatus = ProgressStatus.NotStarted;
        this.context = context;
        this.parent = parent;
        this.colourid = colourid;
        this.children = [];     // A newly created task should never have children

        // Setup data-event time stamp state object. This will contain the information for when the task object was created, started, closed, etc. (note 'closed' can mean either completed or failed)
        // IMPORTANT: The creation time is not initiated here as Date.now() because this Task instance may be representing a persisted-task which was re-built from database data. Hence, these timestamps are
        // provided as parameters to the mutation methods in TaskList; this will allow us to 'rebuild' the state using event-sourced persistent data!
        this.eventTimestamps = {
            timeCreated:   timeCreatedUNIX,
            timeActivated: (category <= Category.Daily) ? timeCreatedUNIX : null,
            timeStarted:   null,
            timeClosed:    null,
            timeRevived:   null,
            timeEdited:    null
        };
    }

    getSiblingList() {
        if (this.parent == null) {
            return [];
        }
        else {
            return this.parent.children.slice(0).filter((child) => child !== this); // Shallow copy of parent's children, excluding self
        }
    }
    
    /* Deprecated. Since we will use event-sourcing 'replays' to rebuild and audit our state, we'll never use this. 
    updateState(stateObj) {
        if ('name' in stateObj) this.name = stateObj.name;
        if ('category' in stateObj) this.category = stateObj.category;
        if ('colourid' in stateObj) this.colourid = stateObj.colourid;
        if ('progressStatus' in stateObj) this.progressStatus = stateObj.progressStatus;
    }
    */

    addChild(childTask) {
        this.children.push(childTask);
        childTask.parent = this;
    }
    removeChild(task) {
        this.children.filter((c) => c !== task);
        task.parent = null;
    }
}