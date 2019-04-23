// API Calls for the view layer to call upon, whenever it needs to rebuild the view
// Note that these actions will invoke data events as well, which can be sent to
// other interaction apis, for example for persistence system updates.
// --------------------------------------------------------------------------------

// ActiveTaskList interaction description:
// - - - - - - - - - - - - - - - - - - - -
// The active task list represents any operations or views which affect the LIST
// of tasks as a whole, rather than just modifying any particular task.
// 
// This function returns an object which provides the ActiveTaskList interface.
// Calling it multiple times will re-instantiate another interface object, but
// not produce any side effects.

// ActiveTaskList interaction API:
// - - - - - - - - - - - - - - - -
// 
// [ TaskView ] GetActiveTasks()
// --- This function will always return all of the currently existing tasks of any
// --- category. This is how the any view model will recieve all updates; in other
// --- words, on any change, we always return the entire new state. This is easier
// --- to manage than always trying to callback to only those which have changed,
// --- and does not affect performance since the number of active task elements at
// --- any given time will be 0 < n < ~100, in any realistic usage.
//
// CreationFunction(...) GetCreationFunction(Category c)
// --- This function returns another function. The returned function is a function
// --- which can be used to create new tasks. 
// ---
// --- The 'Category' parameter determines
// --- what category the returned creation function will specify for the tasks it
// --- creates are!
// ---
// --- Calling the returned CreationFunction will obviously end up triggering an
// --- update in the domain model, thus, will usually be followed by calling
// --- GetActiveTasks().
// --------------------------------------------------------------------------------
import { GetActiveTaskObject } from './dummy/dummyDataModel';
import { Category, ProgressStatus } from '../logicLayer/Task';

// Gain access as a global singleton to the DataModel object. TODO: Move this into a separate 'data model' scope, which sits in
// the logic layer, and which interaction layer objects (such as code in this file) access into.
const ActiveTaskDataObj = GetActiveTaskObject();

// Store a global list of viewLayerCallbacks.
const ViewLayerCallbacks = [];

// Store a global list of data event callbacks.
const DataEventCallbackHandlers = {
    taskAddedHandlers : [],
    taskDeletedHandlers : [],
    taskCompletedHandlers : [],
    taskFailedHandlers : [],
    taskUpdatedHandlers : [],
    taskStartedHandlers : []
};

export function RegisterForDataEvents(dataEventhandlers) {
    DataEventCallbackHandlers.taskAddedHandlers.push(dataEventhandlers.taskAddedHandler);
    DataEventCallbackHandlers.taskDeletedHandlers.push(dataEventhandlers.taskDeletedHandler);
    DataEventCallbackHandlers.taskCompletedHandlers.push(dataEventhandlers.taskCompletedHandler);
    DataEventCallbackHandlers.taskFailedHandlers.push(dataEventhandlers.taskFailedHandler);
    DataEventCallbackHandlers.taskUpdatedHandlers.push(dataEventhandlers.taskUpdatedHandler);
    DataEventCallbackHandlers.taskStartedHandlers.push(dataEventhandlers.taskStartedHandler);
}

export function RegisterToActiveTaskListAPI(viewLayerCallbackFunc) {
    
    ViewLayerCallbacks.push(viewLayerCallbackFunc);

    function getActiveTasks() {
        // Return a big list of TaskView objects from the current Active Task List!
        return ActiveTaskDataObj.GetActiveTasks().map((task) => BuildNewTaskView(task, ActiveTaskDataObj, ViewLayerCallbacks, DataEventCallbackHandlers));
    }
    const getCompletedTasks = () => ActiveTaskDataObj.GetCompletedTasks().map((task) => BuildNewInactiveTaskView(task, ActiveTaskDataObj, ViewLayerCallbacks, DataEventCallbackHandlers));
    const getFailedTasks = () => ActiveTaskDataObj.GetFailedTasks().map((task) => BuildNewInactiveTaskView(task, ActiveTaskDataObj, ViewLayerCallbacks, DataEventCallbackHandlers));

    function getCreationFunction(categoryVal, colourIdGetterFunc) {
        return function(name) {
            let newTask;
            if (colourIdGetterFunc !== null) {
                newTask = ActiveTaskDataObj.CreateNewIndependentTask(name, categoryVal, colourIdGetterFunc());
            }
            else {
                newTask = ActiveTaskDataObj.CreateNewIndependentTask(name, categoryVal);
            }
            ViewLayerCallbacks.forEach(callback => callback());
            DataEventCallbackHandlers.taskAddedHandlers.forEach(callback => callback(newTask, ActiveTaskDataObj));
        }
    }

    // Return the interface object. Note that for interfaces, we always return immutable objects.
    return Object.freeze({
        GetActiveTasks : getActiveTasks,
        GetCompletedTasks : getCompletedTasks,
        GetFailedTasks : getFailedTasks,
        GetCreationFunction : getCreationFunction
    });
};

// TaskView interaction description:
// - - - - - - - - - - - - - - - - -
// This is the api used to interact with a specific task. A client will gain access
// to these objects via the ActiveTaskList, or by some other 'collection' api; since
// we are designing this api to be a 'refresh all upon any change' model.
// As such, the a given TaskView is a frozen snapshot of a Task's state at a given
// time, (only including state which is relevant to the View), and a set of callback
// methods which the View can use to instigate a change on a given Task.

// TaskView interaction API:
// - - - - - - - - - - - - -
//
// Readonly State properties:
// --- String name
// --- int    id
// --- int    colourid
//
// void SetState(StateDataObject obj)
// --- Updates the particular task's state. The members of the StateDataObject must match the
// --- the names of the state properties; any non matching names will throw errors.
// --- any omitted properties will simply remain unchanged!
// --- Calling this will also instigate an update callback in domain model.
//
// bool CanCreateChildren()
// --- returns true if and only if the associated task is allowed to create children within it.
// --- For example, only Active Tasks with a category of 'goal' or 'weekly' can currently have
// --- child tasks created!
//
// void CreateChild(...)
// --- This is another 'CreationFunction' but will created with the sufficient closures and scopes
// --- such that calling this function will always appropriately configure the new task as a child
// --- of this associated task. 
// --- Calling this will instigate an update in the domain model.
// 
// void DeleteTask()
// --- Deletes the associated task from existance.
// --- Calling this will instigate an update in the domain model.
//
// void SetCategory()
// --- Attempts to update the category of the task object. Note that this will fail with an Error if
// --- the task you call it on has any relatives, i.e. a parent or any children.
// --- Calling this will instigate an update in the domain model.

function BuildNewTaskView(domainTaskObj, activeList, viewLayerCallbackList, dataEventCallbacksLists) {

    function canCreateChildren() {
        return (domainTaskObj.category < Category.Daily && domainTaskObj.progressStatus < ProgressStatus.Completed);
    }

    function createChild(name) {
        let newTask = activeList.CreateNewSubtask(name, domainTaskObj);
        viewLayerCallbackList.forEach(callback => callback());
        dataEventCallbacksLists.taskAddedHandlers.forEach(callback => callback(newTask, activeList));
    }

    function createDailyChild(name) {
        let newTask = activeList.CreateNewDailySubtask(name, domainTaskObj);
        viewLayerCallbackList.forEach(callback => callback());
        dataEventCallbacksLists.taskAddedHandlers.forEach(callback => callback(newTask, activeList));
    }

    function deleteTask() {
        activeList.DeleteTask(domainTaskObj);
        viewLayerCallbackList.forEach(callback => callback());
        dataEventCallbacksLists.taskDeletedHandlers.forEach(callback => callback(domainTaskObj, activeList));
    }

    function setCategory(newCategory) {
        activeList.MoveCategory(domainTaskObj, newCategory);
        viewLayerCallbackList.forEach(callback => callback());
        dataEventCallbacksLists.taskUpdatedHandlers.forEach(callback => callback(domainTaskObj, activeList));
    }

    function completeTask() {
        activeList.CompleteTask(domainTaskObj);
        viewLayerCallbackList.forEach(callback => callback());
        dataEventCallbacksLists.taskCompletedHandlers.forEach(callback => callback(domainTaskObj, activeList));
    }

    function startTask() {
        activeList.StartTask(domainTaskObj);
        viewLayerCallbackList.forEach(callback => callback());
        dataEventCallbacksLists.taskStartedHandlers.forEach(callback => callback(domainTaskObj, activeList));
    }

    // Return the interface object. Immutable!
    return Object.freeze({
        // State properties
        name : domainTaskObj.name,
        id   : domainTaskObj.id,
        colourid : domainTaskObj.colourid,
        category : domainTaskObj.category,
        progressStatus : domainTaskObj.progressStatus,
        parent : (domainTaskObj.parent === null) ? null : domainTaskObj.parent.id,
        children : domainTaskObj.children.map((task) => task.id),
        // Update functions
        CanCreateChildren : canCreateChildren,
        CreateChild : createChild,
        CreateDailyChild : createDailyChild,
        DeleteTask : deleteTask,
        SetCategory : setCategory,
        CompleteTask : completeTask,
        StartTask : startTask
    });
}

function BuildNewInactiveTaskView(domainTaskObj, tasklistobj, viewLayerCallbackList, dataEventCallbacksLists) {
    function reviveTask(asActive) {
        let newTask = tasklistobj.ReviveTaskAsClone(domainTaskObj, asActive);
        viewLayerCallbackList.forEach(callback => callback());
        dataEventCallbacksLists.taskAddedHandlers.forEach(callback => callback(newTask, tasklistobj));
    }
    
    return Object.freeze({
        // State properties
        name : domainTaskObj.name,
        id   : domainTaskObj.id,
        colourid : domainTaskObj.colourid,
        category : domainTaskObj.category,
        progressStatus : domainTaskObj.progressStatus,

        // Revive method, to create a new clone who is not inactive
        ReviveTask : reviveTask
    });
}
