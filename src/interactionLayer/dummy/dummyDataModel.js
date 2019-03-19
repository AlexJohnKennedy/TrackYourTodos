// This is simply some hardcoded tasks inside an active task list, used for developing the react ui as test!
import { Category, ProgressStatus, ActiveTasks } from '../../logicLayer/Task';

export function GetActiveTaskObject() {
    // Create a new task list, and populate with some basic shit.
    let tasklist = new ActiveTasks();

    // Create a couple of 'goal' tasks, and a weekly subtask for the second one.
    let goaltask1 = tasklist.CreateNewIndependentTask('goal task with no children', Category.Goal, 0);
    let goaltask2 = tasklist.CreateNewIndependentTask('different goal with child', Category.Goal, 1);
    let weektask1 = tasklist.CreateNewSubtask('weekly subtask', goaltask2);

    // Create a weekly task with one daily subtask.
    let weektask2 = tasklist.CreateNewIndependentTask('independent weekly task', Category.Weekly, 2);
    let daytask1  = tasklist.CreateNewSubtask('daily subtask', weektask2);

    // Create an independent daily task.
    let daytask2  = tasklist.CreateNewIndependentTask('solo daily boy', Category.Daily, 3);

    return tasklist;
}