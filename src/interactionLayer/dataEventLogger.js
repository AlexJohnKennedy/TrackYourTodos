import { SerialiseTaskObject } from '../logicLayer/JsonSerialiser';
import { DataEventSerialisationFuncs } from './dataEventSerialiser';

export const DataEventSerialisationHandlers = {
    taskAddedHandler: (task, list) => console.log(DataEventSerialisationFuncs.taskAddedEvent(task, list)),
    childTaskAddedHandler: (parent, child, list) => console.log(DataEventSerialisationFuncs.childTaskAddedEvent(parent, child, list)),
    taskRevivedHandler: (old, clone, list) => console.log(DataEventSerialisationFuncs.taskRevivedEvent(old, clone, list)),
    taskActivatedHandler: (task, list) => console.log(DataEventSerialisationFuncs.taskActivatedEvent(task, list)),
    taskDeletedHandler: (task, list) => console.log(DataEventSerialisationFuncs.taskDeletedEvent(task, list)),
    taskStartedHandler: (task, list) => console.log(DataEventSerialisationFuncs.taskStartedEvent(task, list)),
    taskCompletedHandler: (task, list) => console.log(DataEventSerialisationFuncs.taskCompletedEvent(task, list)),
    taskFailedHandler: (task, list) => console.log(DataEventSerialisationFuncs.taskFailedEvent(task, list))
};

export const DataEventHandlers = {
    taskAddedHandler: taskAddedLogger,
    childTaskAddedHandler: childTaskAddedLogger,
    taskRevivedHandler: taskRevivedLogger,
    taskActivatedHandler: taskActivatedLogger,
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

function taskActivatedLogger(task, tasklist) {
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