// This is simply some hardcoded data event logs, in JSON format. It is written such that it matches the format of event logs which we 
// will receive from the server-side once that it actually implemented.
import { Category, TaskObjects } from '../../logicLayer/Task';
import { ColourIdTracker } from '../../viewLogic/colourSetManager';
import { DataEventHandlers } from '../dataEventLogger';

export function LogDummyDataEventObjects() {
    // Create a new task list, and populate with some basic shit.
    let tasklist = new TaskObjects();

    console.log("****************************** BEGIN LOG *******************************");
    
    let goaltask = tasklist.CreateNewIndependentTask('goal task numero uno', Category.Goal, Date.now(), ColourIdTracker.useNextColour());
    DataEventHandlers.taskAddedHandler(goaltask, tasklist);

    let goaltask2 = tasklist.CreateNewIndependentTask('different goal with child', Category.Goal, Date.now(), ColourIdTracker.useNextColour());
    DataEventHandlers.taskAddedHandler(goaltask2, tasklist);

    let subtask = tasklist.CreateNewSubtask('weekly subtask', goaltask2, Date.now());
    DataEventHandlers.childTaskAddedHandler(goaltask2, subtask, tasklist);

    let subtask2 = tasklist.CreateNewSubtask('daily sub subby boi', subtask, Date.now());
    DataEventHandlers.childTaskAddedHandler(subtask, subtask2, tasklist);

    let dailysubtask = tasklist.CreateNewDailySubtask('This is a skipped subtask', goaltask, Date.now());
    DataEventHandlers.childTaskAddedHandler(goaltask, dailysubtask, tasklist);

    let weektask2 = tasklist.CreateNewIndependentTask('independent weekly task', Category.Weekly, Date.now(), ColourIdTracker.useNextColour());
    DataEventHandlers.taskAddedHandler(weektask2, tasklist);

    let dailysubtask2 = tasklist.CreateNewSubtask('daily subtask', weektask2, Date.now());
    DataEventHandlers.childTaskAddedHandler(weektask2, dailysubtask2, tasklist);

    let task = tasklist.CreateNewIndependentTask('solo daily boy', Category.Daily, Date.now(), ColourIdTracker.useNextColour());
    DataEventHandlers.taskAddedHandler(task, tasklist);

    let task2 = tasklist.CreateNewIndependentTask('eeeh later', Category.Deferred, Date.now(), ColourIdTracker.useNextColour());
    DataEventHandlers.taskAddedHandler(task2, tasklist);
    
    let task3 = tasklist.CreateNewIndependentTask('ill do it soon, for real this time', Category.Deferred, Date.now(), ColourIdTracker.useNextColour());
    DataEventHandlers.taskAddedHandler(task3, tasklist);

    let task4 = tasklist.CreateNewIndependentTask('oompa loompa', Category.Daily, Date.now(), ColourIdTracker.useNextColour());
    DataEventHandlers.taskAddedHandler(task4, tasklist);

    tasklist.CompleteTask(task4, Date.now());
    DataEventHandlers.taskCompletedHandler(task4, tasklist);
    
    let task5 = tasklist.CreateNewSubtask('this is a separate subboi!! :)', subtask, Date.now());
    DataEventHandlers.childTaskAddedHandler(subtask, task5, tasklist);

    tasklist.CompleteTask(task5, Date.now());
    DataEventHandlers.taskCompletedHandler(task5, tasklist);

    let task6 = tasklist.CreateNewIndependentTask('memes', Category.Daily, Date.now(), ColourIdTracker.useNextColour());
    DataEventHandlers.taskAddedHandler(task6, tasklist);

    tasklist.FailTask(task6, Date.now());
    DataEventHandlers.taskFailedHandler(task6, tasklist);

    console.log("****************************** END LOG *******************************");

    return tasklist;
}