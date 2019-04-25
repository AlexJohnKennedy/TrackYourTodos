// This code is used to check for tasks which have been activated and not completed in time.
// Contains two exported functions: One for attaining a list of all of the tasks which need
// to be 'failed', and one for executing a fail action on all of those tasks.
import { Category } from './Task';

export function RegisterForFailureChecking(tasklist) {
    function GetTasksToFail() {
        return tasklist.GetActiveTasks().filter(isExpired);
    }
    function isExpired(task) {
        if (task.category === Category.Goal || task.category === Category.Deferred) {
            return false;   // These don't ever expire in the current design.
        }
        else if (task.category === Category.Weekly) {
            return checkWeekly(task);
        }
        else if (task.category === Category.Daily) {
            return checkDaily(task);
        }
        else {
            throw new Error("Invalid category value passed to failure checker: " + task);
        }
    }
    function checkWeekly(task) {
        
    }
    function checkDaily(task) {
        if (task.eventTimestamps.timeActivated === null) return false;

        // If the task was activated after 5pm, roll it over to the next day before failing it.
        let activationDate = new Date(task.eventTimestamps.timeActivated);
        if (activationDate.getHours() >= 17) {
            activationDate.setDate(activationDate.getDate() + 1);   // Increments the date to the next day.
        }

        // Okay. If the current time is larger than the activation time, and it's NOT the same day, then we fail the task.
        let now = new Date(Date.now());
        return (now.valueOf() > activationDate.valueOf() && now.getFullYear() === activationDate.getFullYear() &&
                now.getMonth() === activationDate.getMonth() && now.getDate() === activationDate.getDate());
    }

    function FailTasks(tasks) {
        tasks.foreach(task => tasklist.FailTask(task, calculateFailureTime(task)));
    }
    function calculateFailureTime(task) {

    }

    return Object.freeze({
        GetTasksToFail : GetTasksToFail,
        FailTasks : FailTasks
    });
}