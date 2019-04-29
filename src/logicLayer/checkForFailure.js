// This code is used to check for tasks which have been activated and not completed in time.
// Contains two exported functions: One for attaining a list of all of the tasks which need
// to be 'failed', and one for executing a fail action on all of those tasks.
import { Category } from './Task';

export function RegisterForFailureChecking(tasklist) {

    function PeekTasksToFail() {
        return tasklist.GetActiveTasks().map(expirationCheck).filter(resObj => resObj.failureDate !== null).map(resObj => resObj.task);
    }

    // Returns a list of all the task which were failed in this check. It also actively performs the fail update in the
    // domain layer!
    function FailTasks() {
        // Create a collection of objects of failed tasks, and their corresponding timestamp.
        let failureCheckResults = tasklist.GetActiveTasks().map(expirationCheck).filter(resObj => resObj.failureDate !== null);

        // Apply the 'fail' action to each of the remaining ones, and return an array of those tasks back to the caller.
        return failureCheckResults.map(resObj => {
            tasklist.FailTask(resObj.task, resObj.failureDate.valueOf());
            return resObj.task;
        });
    }

    function expirationCheck(task) {
        
        //console.log("CHECKING TASK FOR FAILURE: ");
        //console.log(task);
        //console.log("Activation time: ");
        //console.log(new Date(task.eventTimestamps.timeActivated));

        if (task.category === Category.Goal || task.category === Category.Deferred) {
            // These don't ever expire in the current design.
            return { 
                task: task, 
                failureDate: null 
            };
        }
        else if (task.category === Category.Weekly) {
            return { 
                task: task,
                failureDate: checkWeekly(task)
            };
        }
        else if (task.category === Category.Daily) {
            return {
                task: task,
                failureDate: checkDaily(task)
            };
        }
        else {
            throw new Error("Invalid category value passed to failure checker: " + task);
        }
    }
    // Returns a date containing the exact moment a task was failed, or null, if the task has not failed yet.
    function checkWeekly(task) {
        if (task.eventTimestamps.timeActivated === null) return null;

        // If the task was activated on friday, saturday or sunday, roll it over to the next week before failing it.
        let activationDate = new Date(task.eventTimestamps.timeActivated);
        if (activationDate.getDate() === 5 || activationDate.getDate() === 0) {
            activationDate.setDate(activationDate.getDate() + 7);   // Increments the date to the next week.
        }

        // Calculate the exact moment the task becomes failed. It will be at 1am of the first day of the next week.
        let failureDate = new Date();
        failureDate.setDate(activationDate.getDate() - activationDate.getDay() + 8);
        failureDate.setHours(1, 0, 0, 0);

        //console.log("Checking Weekly:");
        //console.log("Time now:  " + new Date(Date.now()));
        //console.log("Fail time: " + failureDate);

        return Date.now() >= failureDate.valueOf() ? failureDate : null;
    }
    // Returns a date containing the exact moment a task was failed, or null, if the task has not failed yet.
    function checkDaily(task) {
        if (task.eventTimestamps.timeActivated === null) return null;

        // If the task was activated after 5pm, roll it over to the next day before failing it.
        let activationDate = new Date(task.eventTimestamps.timeActivated);
        if (activationDate.getHours() >= 17) {
            activationDate.setDate(activationDate.getDate() + 1);   // Increments the date to the next day.
        }

        // Calculate the exact moment the task becomes failed. It will be at 1am the next day.
        let failureDate = new Date();
        failureDate.setDate(activationDate.getDate() + 1);
        failureDate.setHours(1, 0, 0, 0);

        //console.log("Checking Daily:");
        //console.log("Time now:  " + new Date(Date.now()));
        //console.log("Fail time: " + failureDate);

        return Date.now() >= failureDate.valueOf() ? failureDate : null;
    }

    return Object.freeze({
        PeekTasksToFail : PeekTasksToFail,
        FailTasks : FailTasks
    });
}