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
import { TaskObjects, Category, ProgressStatus, DEFAULT_GLOBAL_CONTEXT_STRING, UNDO_ACTION_MAX_AGE_MILLISECONDS } from '../logicLayer/Task';
import { RegisterForFailureChecking } from '../logicLayer/checkForFailure';
import { StatisticsModel } from '../logicLayer/statisticsModel';
import { BuildNewUndoStack } from '../logicLayer/undoStackSystem';
import { EventTypes } from '../logicLayer/dataEventJsonSchema';

// This function instantiates a new Data model and Statistics model inside a function scope, and returns and object which
// can be used to register listeners, access the data in a mutation safe manner, and so on.
// When the root 'app page' is constructed, it will instantiate a fresh datamodel into memory, and pass it down to the sub-trees which
// need to register to it (i.e. ActiveTaskSection, Backlog section, TaskStatisticsSection, etc).
// When those child sections MOUNT, they will attach a listeners with the appropriate 'register' function, and refresh themselves with 
// the data-model data.
// When the AppPage root component mounts, which will be after the children finish mounting, it will trigger an AJAX load to the backend.
// Upon un-mounting, the components must de-register.
// The current context string must be passed in here. This string is what context newly created independent tasks will be created with.
// Since this is specified at scope-instantiation time, we realise that the data-model-scope is designed to be re-instantiated every time
// there is a context switch! This is sensible, since it means we are not saving out-of-context tasks in memory. This approuch should help
// to reduce the size of the event log the browser has to manage at a given time; unless they are viewing the global context of course.
export function InstantiateNewDataModelScope(currContext) {
    console.log("Instantiating a new data model scope. Context for data-model: " + currContext);
    
    // default to the global context, defined in the domain layer. Also, trim that sucka, just in case.
    if (currContext === null || currContext === undefined || currContext === "") { currContext = DEFAULT_GLOBAL_CONTEXT_STRING; }
    currContext = currContext.trim();

    // Instantiate the data model objects. This will serve as the domain-layer data for all users of the returned scope.
    // Note: Whenever data is re-loaded, we re-instantiate a new StatisticsModel on the main thread, because it directly needs to read
    // the current tasklist state in order to construct itself correctly. This is because the GET request does not emit dataevents for the
    // stats model to respond to: Data-events are only emitted when a NEW event is 'created' by the world; a data GET is only retrieving
    // previously-existing events.
    let ActiveTaskDataObj = new TaskObjects();
    let StatisticsModelObj = new StatisticsModel(ActiveTaskDataObj);
    let UndoStackObj = BuildNewUndoStack();
    
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
        taskStartedHandlers : [],
        taskEditedHandlers : [],

        taskAddedUndoHandlers : [],
        childTaskAddedUndoHandlers : [],
        taskRevivedUndoHandlers : [],
        taskDeletedUndoHandlers : [],
        taskCompletedUndoHandlers : [],
        taskActivatedUndoHandlers : [],
        taskStartedUndoHandlers : [],
        taskEditedUndoHandlers : []
    };
    const DataLoadedFromServerCallbacks = [];
    const DataRefreshedFromServerCallbacks = [];
    const StatisticsModelRefreshCallbacks = [];

    // Setup inter-datamodel event callbacks here, since they both exist in the global interaction layer scope.
    DataEventCallbackHandlers.taskCompletedHandlers.push((task, tasklist) => StatisticsModelObj.AddCompletedTask(task));
    DataEventCallbackHandlers.taskFailedHandlers.push((task, tasklist) => StatisticsModelObj.AddFailedTask(task));

    // Undo stack filtering operations. They are automatically performed as part of the view layer callbacks.
    let scheduledFilteringOperation = null;
    ViewLayerCallbacks.push(() => {
        console.log("Performing a periodic forced-viewlayer update! This will filter the undo actions stack!");
        UndoStackObj.FilterExpiredUndoActions(Date.now());  // Filter the undo stack any time the ui updates
        window.clearTimeout(scheduledFilteringOperation);
        if (UndoStackObj.GetSize() > 0) {
            scheduledFilteringOperation = window.setTimeout(() => {
                // Simply force a view-layer update. Since this scheduling is itself a view layer callback, we will always reschedule
                ViewLayerCallbacks.forEach(cb => cb());
            }, UNDO_ACTION_MAX_AGE_MILLISECONDS - 5000);
        }
    });

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
        DataEventCallbackHandlers.taskEditedHandlers.length = 0;

        DataEventCallbackHandlers.taskAddedUndoHandlers.length = 0;
        DataEventCallbackHandlers.childTaskAddedUndoHandlers.length = 0;
        DataEventCallbackHandlers.taskRevivedUndoHandlers.length = 0;
        DataEventCallbackHandlers.taskDeletedUndoHandlers.length = 0;
        DataEventCallbackHandlers.taskCompletedUndoHandlers.length = 0;
        DataEventCallbackHandlers.taskActivatedUndoHandlers.length = 0;
        DataEventCallbackHandlers.taskStartedUndoHandlers.length = 0;
        DataEventCallbackHandlers.taskEditedUndoHandlers.length = 0;

        DataLoadedFromServerCallbacks.length = 0;
        DataRefreshedFromServerCallbacks.length = 0;
        StatisticsModelRefreshCallbacks.length = 0;
        window.clearTimeout(scheduledFilteringOperation);
    }

    // Exported inner function: Tells the interaction layer to fetch the latest event log from the backend, and apply it to datamodel
    // upon completion. Upon completion, we will trigger the stashed DataLoadedFromServer callbacks. Thus, it is expected that any
    // client object who want to know about the data-load will have already called 'RegisterForDataLoad' before this happens.
    function TriggerEventLogInitialDataFetch(visibleContexts) {
        ScheduleEventLogUpdate(new TaskObjects(), BuildNewUndoStack(), visibleContexts, (rebuiltTaskList, rebuiltUndoStack, availableContextsArray) => {
            ActiveTaskDataObj = rebuiltTaskList;
            UndoStackObj = rebuiltUndoStack;
            UndoStackObj.FilterExpiredUndoActions(Date.now());
            StatisticsModelObj = new StatisticsModel(rebuiltTaskList);
            DataLoadedFromServerCallbacks.forEach(cb => {
                cb(availableContextsArray);
            });
        });
    }

    function TriggerEventLogDataRefresh(visibleContexts) {
        ScheduleEventLogUpdate(new TaskObjects(), BuildNewUndoStack(), visibleContexts, (rebuiltTaskList, rebuiltUndoStack, availableContextsArray) => {
            ActiveTaskDataObj = rebuiltTaskList;
            UndoStackObj = rebuiltUndoStack;
            UndoStackObj.FilterExpiredUndoActions(Date.now());
            StatisticsModelObj = new StatisticsModel(rebuiltTaskList);
            DataRefreshedFromServerCallbacks.forEach(cb => {
                cb(availableContextsArray);
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
        DataEventCallbackHandlers.taskEditedHandlers.push(dataEventhandlers.taskEditedHandler);
        
        DataEventCallbackHandlers.taskAddedUndoHandlers.push(dataEventhandlers.taskAddedUndoHandler);
        DataEventCallbackHandlers.childTaskAddedUndoHandlers.push(dataEventhandlers.childTaskAddedUndoHandler);
        DataEventCallbackHandlers.taskRevivedUndoHandlers.push(dataEventhandlers.taskRevivedUndoHandler);
        DataEventCallbackHandlers.taskDeletedUndoHandlers.push(dataEventhandlers.taskDeletedUndoHandler);
        DataEventCallbackHandlers.taskCompletedUndoHandlers.push(dataEventhandlers.taskCompletedUndoHandler);
        DataEventCallbackHandlers.taskActivatedUndoHandlers.push(dataEventhandlers.taskActivatedUndoHandler);
        DataEventCallbackHandlers.taskStartedUndoHandlers.push(dataEventhandlers.taskStartedUndoHandler);
        DataEventCallbackHandlers.taskEditedUndoHandlers.push(dataEventhandlers.taskEditedUndoHandler);
    }

    // Exported inner function: Allows clients to register for callbacks when an INITIAL state-build from server data is completed.
    function RegisterForOnInitialDataLoadCallback(callback) {
        DataLoadedFromServerCallbacks.push(callback);
    }

    // Exported inner function: Allows clients to register for callbacks when a state-rebuild from a data REFRESH is completed.
    function RegisterForOnDataRefreshCallback(callback) {
        DataRefreshedFromServerCallbacks.push(callback);
    }

    // Exported inner function: Allows clients to register to the ActiveTaskList object directly, allowing them to subsequently query tasks,
    // recieve view-layer callbacks, and so on.
    function RegisterToActiveTaskListAPI(viewLayerCallbackFunc) {

        ViewLayerCallbacks.push(viewLayerCallbackFunc);

        function getActiveTasks() {
            // Return a big list of TaskView objects from the current Active Task List!
            return ActiveTaskDataObj.GetActiveTasks().map((task) => BuildNewTaskView(task, ActiveTaskDataObj, UndoStackObj, ViewLayerCallbacks, DataEventCallbackHandlers));
        }
        function getCompletedTasks() {
            let ret = [];
            ActiveTaskDataObj.GetCompletedTasks().forEach(group => {
                ret.push({ isSpacer: true, time: group.time });
                ret = ret.concat(group.tasks.map((task) => {
                    return BuildNewInactiveTaskView(task, ActiveTaskDataObj, UndoStackObj, ViewLayerCallbacks, DataEventCallbackHandlers);
                }));
            });
            return ret;
        }
        function getFailedTasks() { 
            let ret = [];
            ActiveTaskDataObj.GetFailedTasks().forEach(group => {
                ret.push({ isSpacer: true, time: group.time });
                ret = ret.concat(group.tasks.map((task) => {
                    return BuildNewInactiveTaskView(task, ActiveTaskDataObj, UndoStackObj, ViewLayerCallbacks, DataEventCallbackHandlers);
                }));
            });
            return ret;
        }

        function getCreationFunction(categoryVal, colourIdGetterFunc) {
            return function(name) {
                let newTask;
                const timestamp = Date.now();
                if (colourIdGetterFunc !== null) {
                    newTask = ActiveTaskDataObj.CreateNewIndependentTask(name, categoryVal, timestamp, currContext, colourIdGetterFunc());
                }
                else {
                    newTask = ActiveTaskDataObj.CreateNewIndependentTask(name, categoryVal, timestamp, currContext);
                }
                UndoStackObj.PushUndoableCreateNewIndependentTask(newTask, timestamp);
                ViewLayerCallbacks.forEach(callback => callback());
                DataEventCallbackHandlers.taskAddedHandlers.forEach(callback => callback(newTask, ActiveTaskDataObj));
            }
        }

        // Peeks all of the items which are to be failed, and return their ids. It also schedules a callback for an actual domain
        // layer update, which then invokes view layer and data event callbacks. The reason that is delayed is to allow the view layer
        // to play an animation
        function performFailureCheck(updateDelayMilliseconds, additionalCallback = null) {
            const logicLayerFailureChecker = RegisterForFailureChecking(ActiveTaskDataObj);
            window.setTimeout(() => {
                logicLayerFailureChecker.FailTasks().forEach(task => {
                    if (additionalCallback !== null) additionalCallback(task.id);
                    UndoStackObj.ClearStack();
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
    function RegisterForStatisticsModel(completedCallback, failedCallback, refreshCallback) {
        DataEventCallbackHandlers.taskCompletedHandlers.push(completedCallback);
        DataEventCallbackHandlers.taskFailedHandlers.push(failedCallback);
        StatisticsModelRefreshCallbacks.push(refreshCallback);

        function GetStatistics(options) {
            return StatisticsModelObj.GetStatistics(options);
        }

        return Object.freeze({
            GetStatistics: GetStatistics
        });
    }

    // Exported inner function: Refreshes the Statistics Model object entirely, meaning it will be re-instantiated. This is
    // required to make day-rollover visible. I.e., if the app is left open over the day boundary, the StatisticsModel instance
    // never knows it needs to shuffle over all of the data one place (since 'today' has moved to 'yesterday', etc.). The easiest
    // way to get around this is to simply rebuild the model periodically/when needed, since this is a once off operation the
    // inefficiency is preferred over the logical complexity.
    function RefreshStatisticsModel() {
        StatisticsModelObj = new StatisticsModel(ActiveTaskDataObj);
        StatisticsModelRefreshCallbacks.forEach(cb => cb());
    }

    // Exported inner function: Simply a pass-through to the Undo Stack system, allowing the view layer to query how many undoable
    // actions are currently in the stack. (Will be used to determine if the undo button should be greyed out, for example).
    function GetUndoStackSize() {
        return UndoStackObj.GetSize();
    }

    function PeekUndoStack() {
        return UndoStackObj.Peek();
    }

    // Exported inner function: Performs an undo operation, if it is valid to do so. If the undo operation actually is performed, we
    // will trigger a data event for the undo, and trigger a view layer callback.
    function PerformUndo() {
        console.log("Attempting to perform an undo operation. Current undo stack size: " + UndoStackObj.GetSize());

        // Define a mapping of callback lists, so we can trigger the correct data event depending on what is undone by a given undo action
        const dataEventHandlerMappers = new Map([
            [EventTypes.taskAddedUndo, DataEventCallbackHandlers.taskAddedUndoHandlers],
            [EventTypes.childTaskAddedUndo, DataEventCallbackHandlers.childTaskAddedUndoHandlers],
            [EventTypes.taskRevivedUndo, DataEventCallbackHandlers.taskRevivedUndoHandlers],
            [EventTypes.taskDeletedUndo, DataEventCallbackHandlers.taskDeletedUndoHandlers],
            [EventTypes.taskCompletedUndo, DataEventCallbackHandlers.taskCompletedUndoHandlers],
            [EventTypes.taskActivatedUndo, DataEventCallbackHandlers.taskActivatedUndoHandlers],
            [EventTypes.taskStartedUndo, DataEventCallbackHandlers.taskStartedUndoHandlers],
            [EventTypes.taskEditedUndo, DataEventCallbackHandlers.taskEditedUndoHandlers]
        ]);

        const timestamp = Date.now();
        const undoData = UndoStackObj.PerformUndo(timestamp, ActiveTaskDataObj);
        if (undoData !== null) {
            // Refresh stats model if a completion was undone.
            if (undoData.eventType === EventTypes.taskCompletedUndo) { RefreshStatisticsModel(); }
            
            // Invoke data events.
            ViewLayerCallbacks.forEach(cb => cb());
            dataEventHandlerMappers.get(undoData.eventType).forEach(callback => callback(undoData, ActiveTaskDataObj));
            return true;
        }
        else {
            return false;   // Undo did not occur
        }
    }

    return Object.freeze({
        TriggerEventLogInitialDataFetch : TriggerEventLogInitialDataFetch,
        TriggerEventLogDataRefresh : TriggerEventLogDataRefresh,
        RegisterForDataEvents : RegisterForDataEvents,
        RegisterForOnInitialDataLoadCallback : RegisterForOnInitialDataLoadCallback,
        RegisterForOnDataRefreshCallback : RegisterForOnDataRefreshCallback,
        RegisterToActiveTaskListAPI : RegisterToActiveTaskListAPI,
        RegisterForStatisticsModel : RegisterForStatisticsModel,
        ClearAllRegisteredCallbacks : ClearAllRegisteredCallbacks,
        RefreshStatisticsModel : RefreshStatisticsModel,
        GetUndoStackSize : GetUndoStackSize,
        PeekUndoStack : PeekUndoStack,
        PerformUndo : PerformUndo
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

function BuildNewTaskView(domainTaskObj, activeList, undoStack, viewLayerCallbackList, dataEventCallbacksLists) {

    function canCreateChildren() {
        return (domainTaskObj.category < Category.Daily && domainTaskObj.progressStatus < ProgressStatus.Completed);
    }

    function createChild(name) {
        const timestamp = Date.now();
        let newTask = activeList.CreateNewSubtask(name, domainTaskObj, timestamp);
        undoStack.PushUndoableCreateNewSubtask(newTask, timestamp);
        viewLayerCallbackList.forEach(callback => callback());
        dataEventCallbacksLists.childTaskAddedHandlers.forEach(callback => callback(domainTaskObj, newTask, activeList));
    }

    function createDailyChild(name) {
        const timestamp = Date.now();
        let newTask = activeList.CreateNewDailySubtask(name, domainTaskObj, timestamp);
        undoStack.PushUndoableCreateNewSubtask(newTask, timestamp);
        viewLayerCallbackList.forEach(callback => callback());
        dataEventCallbacksLists.childTaskAddedHandlers.forEach(callback => callback(domainTaskObj, newTask, activeList));
    }

    function deleteTask() {
        const timestamp = Date.now();
        activeList.AbandonTask(domainTaskObj);
        undoStack.PushUndoableDeleteTask(domainTaskObj, timestamp);
        viewLayerCallbackList.forEach(callback => callback());
        dataEventCallbacksLists.taskDeletedHandlers.forEach(callback => callback(domainTaskObj, timestamp, activeList));
    }

    function voluntarilyFailTask() {
        activeList.FailTask(domainTaskObj, Date.now());
        undoStack.ClearStack();
        viewLayerCallbackList.forEach(callback => callback());
        dataEventCallbacksLists.taskFailedHandlers.forEach(callback => callback(domainTaskObj, activeList));
    }

    function activateTask(newCategory) {
        const timestamp = Date.now();
        activeList.ActivateTask(domainTaskObj, newCategory, timestamp);
        undoStack.PushUndoableActivateTask(domainTaskObj, timestamp);
        viewLayerCallbackList.forEach(callback => callback());
        dataEventCallbacksLists.taskActivatedHandlers.forEach(callback => callback(domainTaskObj, activeList));
    }

    function completeTask() {
        const timestamp = Date.now();
        if (activeList.CompleteTask(domainTaskObj, timestamp)) {
            undoStack.PushUndoableCompleteTask(domainTaskObj, timestamp);
            viewLayerCallbackList.forEach(callback => callback());
            dataEventCallbacksLists.taskCompletedHandlers.forEach(callback => callback(domainTaskObj, activeList));
        }
    }

    function startTask() {
        const timestamp = Date.now();
        activeList.StartTask(domainTaskObj, timestamp);
        undoStack.PushUndoableStartTask(domainTaskObj, timestamp);
        viewLayerCallbackList.forEach(callback => callback());
        dataEventCallbacksLists.taskStartedHandlers.forEach(callback => callback(domainTaskObj, activeList));
    }

    function editTaskName(newText) {
        const timestamp = Date.now();
        const originalTimeEdited = domainTaskObj.eventTimestamps.timeEdited === null ? domainTaskObj.eventTimestamps.timeCreated : domainTaskObj.eventTimestamps.timeEdited;
        undoStack.PushUndoableEditTask(domainTaskObj, domainTaskObj.name, originalTimeEdited, timestamp);
        activeList.EditTaskText(domainTaskObj, newText, timestamp);
        viewLayerCallbackList.forEach(callback => callback());
        dataEventCallbacksLists.taskEditedHandlers.forEach(callback => callback(domainTaskObj, activeList));
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
        AbandonTask : deleteTask,
        VoluntarilyFailTask: voluntarilyFailTask,
        ActivateTask : activateTask,
        CompleteTask : completeTask,
        StartTask : startTask,
        EditTaskName : editTaskName
    });
}

function BuildNewInactiveTaskView(domainTaskObj, tasklistobj, undoStack, viewLayerCallbackList, dataEventCallbacksLists) {
    
    function reviveTask(asActive) {
        const timestamp = Date.now();
        let newTask = tasklistobj.ReviveTaskAsClone(domainTaskObj, asActive, timestamp);
        undoStack.PushUndoableReviveTask(newTask, domainTaskObj, timestamp);
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
