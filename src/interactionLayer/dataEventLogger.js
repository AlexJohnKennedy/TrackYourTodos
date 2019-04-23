import { SerialiseTaskObject } from '../logicLayer/JsonSerialiser';

export const DataEventHandlers = {
    taskAddedHandler: taskAddedLogger,
    childTaskAddedHandler: childTaskAddedLogger,
    taskRevivedHandler: taskRevivedLogger,
    taskUpdatedHandler: taskUpdatedLogger,
    taskDeletedHandler: taskDeletedLogger,
    taskStartedHandler: taskStartedLogger,
    taskCompletedHandler: taskCompletedLogger,
    taskFailedHandler: taskFailedLogger
};

function logTask(task) {
    let jsonString = SerialiseTaskObject(task);
    console.log(jsonString);
}

function childTaskAddedLogger(parent, child, tasklist) {
    console.log("A new substask was just created!");
    logTask(parent);
    logTask(child);
}

function taskRevivedLogger(oldtask, newtask, tasklist) {
    console.log("A dead task was just revived! oooooOOOOOoooOOOOOO");
    logTask(oldtask);
    logTask(newtask);
}

function taskAddedLogger(task, tasklist) {
    console.log("A new task was just created!");
    logTask(task);
}

function taskUpdatedLogger(task, tasklist) {
    console.log("A task was just updated!");
    logTask(task);
}

function taskDeletedLogger(task, tasklist) {
    console.log("A task was deleted!");
    logTask(task);
}

function taskStartedLogger(task, tasklist) {
    console.log("This task was just started!");
    logTask(task);
}

function taskCompletedLogger(task, tasklist) {
    console.log("Nice! You completed a task!");
    logTask(task);
}

function taskFailedLogger(task, tasklist) {
    console.log("... you fucked it.");
    logTask(task);
}