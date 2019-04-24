// This is simply some hardcoded tasks inside an active task list, used for developing the react ui as test!
import { Category, TaskObjects } from '../../logicLayer/Task';
import { ColourIdTracker } from '../../viewLogic/colourSetManager';
import { RebuildState } from '../../logicLayer/StateRebuilder';

// Dummy data log
import { dummyEventLog } from './dummyEventlogDataModel';

export function GetActiveTaskObject() {
    let tasklist = new TaskObjects();
    RebuildState(dummyEventLog, tasklist);
    return tasklist;
}

export function GetActiveTaskObjectHardCodedCommands() {
    // Create a new task list, and populate with some basic shit.
    let tasklist = new TaskObjects();

    // Create a couple of 'goal' tasks, and a weekly subtask for the second one.
    let goaltask = tasklist.CreateNewIndependentTask('goal task numero uno', Category.Goal, Date.now(), ColourIdTracker.useNextColour());
    let goaltask2 = tasklist.CreateNewIndependentTask('different goal with child', Category.Goal, Date.now(), ColourIdTracker.useNextColour());
    let subtask = tasklist.CreateNewSubtask('weekly subtask', goaltask2, Date.now());
    tasklist.CreateNewSubtask('daily sub subby boi', subtask, Date.now());
    tasklist.CreateNewDailySubtask('This is a skipped subtask', goaltask, Date.now());
    //let subtask2 = tasklist.CreateNewSubtask('MEMEMEMEMEMES', goaltask2);
    //tasklist.CreateNewSubtask('A B C D E F G H I J K L M N O P', subtask2);

    // Create a weekly task with one daily subtask.
    let weektask2 = tasklist.CreateNewIndependentTask('independent weekly task', Category.Weekly, Date.now(), ColourIdTracker.useNextColour());
    tasklist.CreateNewSubtask('daily subtask', weektask2, Date.now());

    // Create an independent daily task.
    tasklist.CreateNewIndependentTask('solo daily boy', Category.Daily, Date.now(), ColourIdTracker.useNextColour());

    // Create some deferred tasks.
    tasklist.CreateNewIndependentTask('eeeh later', Category.Deferred, Date.now(), ColourIdTracker.useNextColour());
    tasklist.CreateNewIndependentTask('ill do it soon, for real this time', Category.Deferred, Date.now(), ColourIdTracker.useNextColour());

    // Create some tasks and complete them.
    tasklist.CompleteTask(tasklist.CreateNewIndependentTask('oompa loompa', Category.Daily, Date.now(), ColourIdTracker.useNextColour()), Date.now());
    tasklist.CompleteTask(tasklist.CreateNewSubtask('this is a separate subboi!! :)', subtask, Date.now()), Date.now());

    // Create some tasks and fail them.
    tasklist.FailTask(tasklist.CreateNewIndependentTask('memes', Category.Daily, Date.now(), ColourIdTracker.useNextColour()), Date.now());

    // TEST LOAD: make 20,000 tasks, failing and completing every second one.
    for (let i=0; i < 0; i++) {
        let task = tasklist.CreateNewIndependentTask(i, Category.Daily, Date.now(), ColourIdTracker.useNextColour());
        if (i % 2 === 0) {
            tasklist.CompleteTask(task, Date.now());
        }
        else {
            tasklist.FailTask(task, Date.now());
        }
    }

    return tasklist;
}