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
import { ScheduleEventLogUpdate } from './ajaxDataModules/ajaxDataModelRebuilder.js';
import { TaskObjects, Category, ProgressStatus } from '../logicLayer/Task';
import { RegisterForFailureChecking } from '../logicLayer/checkForFailure';
import { StatisticsModel } from '../logicLayer/statisticsModel';

// This function instantiates a new Data model and Statistics model inside a function scope, and returns and object which
// can be used to register listeners, access the data in a mutation safe manner, and so on.
// When the root 'app page' is constructed, it will instantiate a fresh datamodel into memory, and pass it down to the sub-trees which
// need to register to it (i.e. ActiveTaskSection, Backlog section, TaskStatisticsSection, etc).
// When those child sections MOUNT, they will attach a listeners with the appropriate 'register' function, and refresh themselves with 
// the data-model data.
// When the AppPage root component mounts, which will be after the children finish mounting, it will trigger an AJAX load to the backend.
// Upon un-mounting, the components must de-register.
export function InstantiateNewDataModelScope() {
    
    // Instantiate the data model objects. This will serve as the domain-layer data for all users of the returned scope.
    // Note: Whenever data is re-loaded, we re-instantiate a new StatisticsModel on the main thread, because it directly needs to read
    // the current tasklist state in order to construct itself correctly. This is because the GET request does not emit dataevents for the
    // stats model to respond to: Data-events are only emitted when a NEW event is 'created' by the world; a data GET is only retrieving
    // previously-existing events.
    const ActiveTaskDataObj = new TaskObjects();
    let StatisticsModelObj = new StatisticsModel(ActiveTaskDataObj);
    
    // Initialise all our callback containers. These are ViewLayerCallbacks, DataEventCallbacks, and OnDataLoadedFromServer callbacks
    const ViewLayerCallbacks = [];
    const DataEventCallbackHandlers = {
        taskAddedHandlers : [],
        childTaskAddedHandlers : [],
        taskRevivedHandlers : [],
        taskDeletedHandlers : [],
        taskCompletedHandlers : [],
        taskFailedHandlers : [],
        taskActivatedHandlers : [],
        taskStartedHandlers : []
    };
    const DataLoadedFromServerCallbacks = [];

    // Setup inter-datamodel event callbacks here, since they both exist in the global interaction layer scope.
    DataEventCallbackHandlers.taskCompletedHandlers.push((task, tasklist) => StatisticsModelObj.AddCompletedTask(task));
    DataEventCallbackHandlers.taskFailedHandlers.push((task, tasklist) => StatisticsModelObj.AddFailedTask(task));

    // Exported inner function: Tells the interaction layer to explicitly CLEAR all the registers callbacks. This should only be done
    // by the 'data model instance owner', i.e. the component which acts as the root for the data-model instace.
    function ClearAllRegisteredCallbacks() {
        ViewLayerCallbacks.length = 0;  // This works in JS, lol
        DataEventCallbackHandlers.taskActivatedHandlers.length = 0;
        DataEventCallbackHandlers.childTaskAddedHandlers.length = 0;
        DataEventCallbackHandlers.taskRevivedHandlers.length = 0;
        DataEventCallbackHandlers.taskDeletedHandlers.length = 0;
        DataEventCallbackHandlers.taskCompletedHandlers.length = 0;
        DataEventCallbackHandlers.taskFailedHandlers.length = 0;
        DataEventCallbackHandlers.taskActivatedHandlers.length = 0;
        DataEventCallbackHandlers.taskStartedHandlers.length = 0;
        DataLoadedFromServerCallbacks.length = 0;
    }

    // Exported inner function: Tells the interaction layer to fetch the latest event log from the backend, and apply it to datamodel
    // upon completion. Upon completion, we will trigger the stashed DataLoadedFromServer callbacks. Thus, it is expected that any
    // client object who want to know about the data-load will have already called 'RegisterForDataLoad' before this happens.
    function TriggerEventLogDataFetch() {
        ScheduleEventLogUpdate(ActiveTaskDataObj, (rebuiltTaskList) => {
            StatisticsModelObj = new StatisticsModel(rebuiltTaskList);
            DataLoadedFromServerCallbacks.forEach(cb => {
                cb();
            });
        });
    }
    
    // Exported inner function: Allows clients to register for event-type-specific Data events. One of this is always triggered whenever
    // a new event is 'created' by the world (e.g. by user action)
    function RegisterForDataEvents(dataEventhandlers) {
        DataEventCallbackHandlers.taskAddedHandlers.push(dataEventhandlers.taskAddedHandler);
        DataEventCallbackHandlers.taskDeletedHandlers.push(dataEventhandlers.taskDeletedHandler);
        DataEventCallbackHandlers.childTaskAddedHandlers.push(dataEventhandlers.childTaskAddedHandler);
        DataEventCallbackHandlers.taskRevivedHandlers.push(dataEventhandlers.taskRevivedHandler);
        DataEventCallbackHandlers.taskCompletedHandlers.push(dataEventhandlers.taskCompletedHandler);
        DataEventCallbackHandlers.taskFailedHandlers.push(dataEventhandlers.taskFailedHandler);
        DataEventCallbackHandlers.taskActivatedHandlers.push(dataEventhandlers.taskActivatedHandler);
        DataEventCallbackHandlers.taskStartedHandlers.push(dataEventhandlers.taskStartedHandler);
    }

    // Exported inner function: Allows clients to register for callbacks when a state-rebuild from server data is completed
    function RegisterForOnDataLoadCallback(callback) {
        DataLoadedFromServerCallbacks.push(callback);
    }

    // Exported inner function: Allows clients to register to the ActiveTaskList object directly, allowing them to subsequently query tasks,
    // recieve view-layer callbacks, and so on.
    function RegisterToActiveTaskListAPI(viewLayerCallbackFunc) {

        const logicLayerFailureChecker = RegisterForFailureChecking(ActiveTaskDataObj);
        ViewLayerCallbacks.push(viewLayerCallbackFunc);

        function getActiveTasks() {
            // Return a big list of TaskView objects from the current Active Task List!
            return ActiveTaskDataObj.GetActiveTasks().map((task) => BuildNewTaskView(task, ActiveTaskDataObj, ViewLayerCallbacks, DataEventCallbackHandlers));
        }
        function getCompletedTasks() {
            let ret = [];
            ActiveTaskDataObj.GetCompletedTasks().forEach(group => {
                ret.push({ isSpacer: true, time: group.time });
                ret = ret.concat(group.tasks.map((task) => {
                    return BuildNewInactiveTaskView(task, ActiveTaskDataObj, ViewLayerCallbacks, DataEventCallbackHandlers);
                }));
            });
            return ret;
        }
        function getFailedTasks() { 
            let ret = [];
            ActiveTaskDataObj.GetFailedTasks().forEach(group => {
                ret.push({ isSpacer: true, time: group.time });
                ret = ret.concat(group.tasks.map((task) => {
                    return BuildNewInactiveTaskView(task, ActiveTaskDataObj, ViewLayerCallbacks, DataEventCallbackHandlers);
                }));
            });
            return ret;
        }

        function getCreationFunction(categoryVal, colourIdGetterFunc) {
            return function(name) {
                let newTask;
                if (colourIdGetterFunc !== null) {
                    newTask = ActiveTaskDataObj.CreateNewIndependentTask(name, categoryVal, Date.now(), colourIdGetterFunc());
                }
                else {
                    newTask = ActiveTaskDataObj.CreateNewIndependentTask(name, categoryVal, Date.now());
                }
                ViewLayerCallbacks.forEach(callback => callback());
                DataEventCallbackHandlers.taskAddedHandlers.forEach(callback => callback(newTask, ActiveTaskDataObj));
            }
        }

        // Peeks all of the items which are to be failed, and return their ids. It also schedules a callback for an actual domain
        // layer update, which then invokes view layer and data event callbacks. The reason that is delayed is to allow the view layer
        // to play an animation
        function performFailureCheck(updateDelayMilliseconds, additionalCallback = null) {
            window.setTimeout(() => {
                logicLayerFailureChecker.FailTasks().forEach(task => {
                    if (additionalCallback !== null) additionalCallback(task.id);
                    DataEventCallbackHandlers.taskFailedHandlers.forEach(callback => callback(task, ActiveTaskDataObj));
                });
                ViewLayerCallbacks.forEach(callback => callback());
            }, updateDelayMilliseconds);
            return logicLayerFailureChecker.PeekTasksToFail().map(task => task.id);
        }

        // Return the interface object. Note that for interfaces, we always return immutable objects.
        return Object.freeze({
            GetActiveTasks : getActiveTasks,
            GetCompletedTasks : getCompletedTasks,
            GetFailedTasks : getFailedTasks,
            GetCreationFunction : getCreationFunction,
            PerformFailureCheck : performFailureCheck
        });
    };

    // Exported inner function: Interaction API object for the Statistics Model. For now, it simply wraps the statistics 
    // model and hides the internal data structures.
    function RegisterForStatisticsModel(completedCallback, failedCallback) {
        DataEventCallbackHandlers.taskCompletedHandlers.push(completedCallback);
        DataEventCallbackHandlers.taskFailedHandlers.push(failedCallback);

        function GetStatistics(options) {
            return StatisticsModelObj.GetStatistics(options);
        }

        return Object.freeze({
            GetStatistics: GetStatistics
        });
    }

    // Exported innder function: Refreshes the Statistics Model object entirely, meaning it will be re-instantiated. This is
    // required to make day-rollover visible. I.e., if the app is left open over the day boundary, the StatisticsModel instance
    // never knows it needs to shuffle over all of the data one place (since 'today' has moved to 'yesterday', etc.). The easiest
    // way to get around this is to simply rebuild the model periodically/when needed, since this is a once off operation the
    // inefficiency is preferred over the logical complexity.
    function RefreshStatisticsModel() {
        StatisticsModelObj = new StatisticsModel(ActiveTaskDataObj);
    }

    return Object.freeze({
        TriggerEventLogDataFetch : TriggerEventLogDataFetch,
        RegisterForDataEvents : RegisterForDataEvents,
        RegisterForOnDataLoadCallback : RegisterForOnDataLoadCallback,
        RegisterToActiveTaskListAPI : RegisterToActiveTaskListAPI,
        RegisterForStatisticsModel : RegisterForStatisticsModel,
        ClearAllRegisteredCallbacks : ClearAllRegisteredCallbacks,
        RefreshStatisticsModel : RefreshStatisticsModel
    });
}


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
        let newTask = activeList.CreateNewSubtask(name, domainTaskObj, Date.now());
        viewLayerCallbackList.forEach(callback => callback());
        dataEventCallbacksLists.childTaskAddedHandlers.forEach(callback => callback(domainTaskObj, newTask, activeList));
    }

    function createDailyChild(name) {
        let newTask = activeList.CreateNewDailySubtask(name, domainTaskObj, Date.now());
        viewLayerCallbackList.forEach(callback => callback());
        dataEventCallbacksLists.childTaskAddedHandlers.forEach(callback => callback(domainTaskObj, newTask, activeList));
    }

    function deleteTask() {
        activeList.DeleteTask(domainTaskObj);
        viewLayerCallbackList.forEach(callback => callback());
        dataEventCallbacksLists.taskDeletedHandlers.forEach(callback => callback(domainTaskObj, activeList));
    }

    function activateTask(newCategory) {
        activeList.ActivateTask(domainTaskObj, newCategory, Date.now());
        viewLayerCallbackList.forEach(callback => callback());
        dataEventCallbacksLists.taskActivatedHandlers.forEach(callback => callback(domainTaskObj, activeList));
    }

    function completeTask() {
        if (activeList.CompleteTask(domainTaskObj, Date.now())) {
            viewLayerCallbackList.forEach(callback => callback());
            dataEventCallbacksLists.taskCompletedHandlers.forEach(callback => callback(domainTaskObj, activeList));
        }
    }

    function startTask() {
        activeList.StartTask(domainTaskObj, Date.now());
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
        ActivateTask : activateTask,
        CompleteTask : completeTask,
        StartTask : startTask
    });
}

function BuildNewInactiveTaskView(domainTaskObj, tasklistobj, viewLayerCallbackList, dataEventCallbacksLists) {
    function reviveTask(asActive) {
        let newTask = tasklistobj.ReviveTaskAsClone(domainTaskObj, asActive, Date.now());
        viewLayerCallbackList.forEach(callback => callback());
        dataEventCallbacksLists.taskRevivedHandlers.forEach(callback => callback(domainTaskObj, newTask, tasklistobj));
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
