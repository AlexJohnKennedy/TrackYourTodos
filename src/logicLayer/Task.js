// This file defines the basic object-prototype for any item on any list.
// We will call these items a 'Task', and they will self contain all their state data.

// They will also form a Bi-directional tree, where each Task will reference any children,
// and their parent. When any operation is performed, we will simply update the tree structure.

// Completed, Deferred, or Failed tasks will enter a separate collection, where they will be tracked independently.
// When a task is placed into 'Completed' or 'Failed', they will lose all connections to parents and children, and
// simply be recorded in isolation.

// Question: Event source our history? Might allow us to completely track/audit all of our productivity over any
// arbitrary period of time be replaying all events; i.e. completions, failures, task creations, and journal logs!

// ---------------------------------------------------------------------------------------------------------------

/* Global settings */

// Character limit for text fields of an item.
const MAX_TASK_NAME_LEN = 30;

// Enumeration object, specifying the possible categories for an item. These will basically dictate where an item
// appears on the UI, under which board. (PSST): 'Boards' themselves are just a UI-layer concept, so they will not
// we referred to here.
export const Category = Object.freeze({
    Goal : 0,
    Weekly : 1,
    Daily: 2,
    Deferred : 3,
    Completed : 4,
    Failed : 5
});
export const ProgressStatus = Object.freeze({
    NotStarted : 0,
    Started : 1,
    Completed : 2,
    Aborted : 3
})

const DefaultColourId = 0;
function DowngradeCategory(category) {
    if (category >= Category.Daily) {
        throw "CANNOT DOWNGRADE";
    }
    else {
        return category + 1;
    }
}

// TODO: Replace this will a persistence-safe method of acquiring a unique, new id value!
const GetNewId = ((startVal) => () => startVal++)(0);

class ActiveTasks {
    constructor(handlerFuncs) {
        this.tasks = [];

        // the 'handler funcs' object contains a set of functions which this object should invoke when the appropriate event occurs.
        this.invokeTaskAddedEvent = handlerFuncs.taskAddedHandler;
        this.invokeTaskDeletedEvent = handlerFuncs.taskDeletedHandler;
    }

    // Creates a parentless task, in a specified category!
    CreateNewIndependentTask(name, category, colourid = DefaultColourId) {
        let newTask = new Task(GetNewId(), name, category, null, colourid);
        this.tasks.push(newTask);

        this.invokeTaskAddedEvent(this, newTask);
    }
    
    // Creates a new child task, in the category one level below the parent's category
    CreateNewSubtask(name, parent) {
        let newTask = new Task(GetNewId(), name, DowngradeCategory(parent.category), parent, parent.colourid);
    }

    DeleteTask(task) {
        // Clear all parent and child links from the deleted task!
        if (task.parent) task.parent.removeChild(task);
        for (child in task.children) {
            task.removeChild(child);
        }
        // Remove it from our list, and invoke!
        this.tasks.filter((t) => t !== task);
        this.invokeTaskDeletedEvent(this, task);
    }
}

class Task {
    // When a task is created, it must be passed a name string and a category value.
    // It may optionally be passed a parent Task; if none is provided, this task is created without a parent!
    // It may optionally be passed a colourid value; if none is provided, this task is assigned the current default colour.
    // -- NOTE: Any passed colourid will be overridden by a passed parent's colorid; it is enforeced that they match! 
    constructor(id, name, category, parent, colourid) {
        // Setup the state for this Task.
        if (name.length > MAX_TASK_NAME_LEN) throw "name too long!";
        this.id = id;   // MUST NEVER CHANGE
        this.name = name;
        this.category = category;
        this.parent = parent;
        this.colourid = colourid;
        this.children = [];     // A newly created task should never have children
        this.siblings = this.getSiblingList();
        this.listenerFuncs = {
            state : [],
            childAdded : [],
            childRemoved : []
        }
    }

    getSiblingList() {
        if (this.parent == null) {
            return [];
        }
        else {
            return this.parent.children.slice(0).filter((child) => child !== this); // Shallow copy of parent's children, excluding self
        }
    }

    registerForStateUpdateEvents(handler) {
        this.listenerFuncs.state.push(handler);
    }
    registerForChildUpdateEvents(handler) {
        this.listenerFuncs.child.push(handler);
    }
    
    updateState(stateObj) {
        if ('name' in stateObj) this.name = stateObj.name;
        if ('category' in stateObj) this.category = stateObj.category;
        if ('colourid' in stateObj) this.colourid = stateObj.colourid;
        for (handler of listenerFuncs.state) {
            handler(this, stateObj);
        }
    }

    addChild(childTask) {
        this.children.push(childTask);
        childTask.parent = this;
        for (handler of listenerFuncs.childAdded) {
            handler(this, childTask);
        }
    }
    removeChild(task) {
        let prevlen = this.children.length;
        this.children.filter((c) => c !== task);
        if (prevlen > this.children.length) {
            task.parent = null;
            for (handler of listenerFuncs.childRemoved) {
                handler(this, task);
            }
        }
    }
}