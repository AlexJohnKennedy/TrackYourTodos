import { RegisterForDataEvents } from './viewLayerInteractionApi';

export const Registration = RegisterForDataEvents({
    taskAddedHandler: taskAddedLogger,
    taskUpdatedHandler: taskUpdatedLogger,
    taskDeletedHandler: taskDeletedLogger,
    taskStartedHandler: taskStartedLogger,
    taskCompletedHandler: taskCompletedLogger,
    taskFailedHandler: taskFailedLogger
});

function logTask(task) {
    let jsonString = JSON.stringify(task);
    console.log(jsonString);
}

function taskAddedLogger(task, tasklist) {
    console.log("A new task was just created!");
    logTask(task);
    console.log("- - - - - - - - - - - -");
}

function taskUpdatedLogger(task, tasklist) {
    console.log("A task was just updated!");
    logTask(task);
    console.log("- - - - - - - - - - - -");
}

function taskDeletedLogger(task, tasklist) {
    console.log("A task was deleted!");
    logTask(task);
    console.log("- - - - - - - - - - - -");
}

function taskStartedLogger(task, tasklist) {
    console.log("This task was just started!");
    logTask(task);
    console.log("- - - - - - - - - - - -");
}

function taskCompletedLogger(task, tasklist) {
    console.log("Nice! You completed a task!");
    logTask(task);
    console.log("- - - - - - - - - - - -");
}

function taskFailedLogger(task, tasklist) {
    console.log("... you fucked it.");
    logTask(task);
    console.log("- - - - - - - - - - - -");
}