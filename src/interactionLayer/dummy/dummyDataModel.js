// This is simply some hardcoded tasks inside an active task list, used for developing the react ui as test!
import { Category, ActiveTasks } from '../../logicLayer/Task';
import { ColourIdTracker } from '../../viewLogic/colourSetManager';

export function GetActiveTaskObject() {
    // Create a new task list, and populate with some basic shit.
    let tasklist = new ActiveTasks();

    // Create a couple of 'goal' tasks, and a weekly subtask for the second one.
    let goaltask = tasklist.CreateNewIndependentTask('goal task numero uno', Category.Goal, ColourIdTracker.useNextColour());
    let goaltask2 = tasklist.CreateNewIndependentTask('different goal with child', Category.Goal, ColourIdTracker.useNextColour());
    let subtask = tasklist.CreateNewSubtask('weekly subtask', goaltask2);
    tasklist.CreateNewSubtask('daily sub subby boi', subtask);
    tasklist.CreateNewDailySubtask('This is a skipped subtask', goaltask);
    //tasklist.CreateNewSubtask('this is a separate subboi!! :)', subtask);
    //let subtask2 = tasklist.CreateNewSubtask('MEMEMEMEMEMES', goaltask2);
    //tasklist.CreateNewSubtask('A B C D E F G H I J K L M N O P', subtask2);

    // Create a weekly task with one daily subtask.
    let weektask2 = tasklist.CreateNewIndependentTask('independent weekly task', Category.Weekly, ColourIdTracker.useNextColour());
    tasklist.CreateNewSubtask('daily subtask', weektask2);

    // Create an independent daily task.
    tasklist.CreateNewIndependentTask('solo daily boy', Category.Daily, ColourIdTracker.useNextColour());

    // Create some deferred tasks.
    tasklist.CreateNewIndependentTask('eeeh later', Category.Deferred, ColourIdTracker.useNextColour());
    tasklist.CreateNewIndependentTask('ill do it soon, for real this time', Category.Deferred, ColourIdTracker.useNextColour());

    return tasklist;
}