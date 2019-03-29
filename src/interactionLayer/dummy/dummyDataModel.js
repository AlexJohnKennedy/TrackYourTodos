// This is simply some hardcoded tasks inside an active task list, used for developing the react ui as test!
import { Category, ActiveTasks } from '../../logicLayer/Task';
import { ColourIdTracker } from '../../viewLogic/colourSetManager';

export function GetActiveTaskObject() {
    // Create a new task list, and populate with some basic shit.
    let tasklist = new ActiveTasks();

    // Create a couple of 'goal' tasks, and a weekly subtask for the second one.
    tasklist.CreateNewIndependentTask('goal task with no children', Category.Goal, ColourIdTracker.useNextColour());
    let goaltask2 = tasklist.CreateNewIndependentTask('different goal with child', Category.Goal, ColourIdTracker.useNextColour());
    tasklist.CreateNewSubtask('weekly subtask', goaltask2);

    // Create a weekly task with one daily subtask.
    let weektask2 = tasklist.CreateNewIndependentTask('independent weekly task', Category.Weekly, ColourIdTracker.useNextColour());
    tasklist.CreateNewSubtask('daily subtask', weektask2);

    // Create an independent daily task.
    tasklist.CreateNewIndependentTask('solo daily boy', Category.Daily, ColourIdTracker.useNextColour());

    return tasklist;
}