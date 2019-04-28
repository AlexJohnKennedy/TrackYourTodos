// This is simply some hardcoded data event logs, in JSON format. It is written such that it matches the format of event logs which we 
// will receive from the server-side once that it actually implemented.
import { Category, TaskObjects } from '../../logicLayer/Task';
import { ColourIdTracker } from '../../viewLogic/colourSetManager';
import { DataEventHandlers } from '../dataEventLogger';

export const dummyEventLog = '[{"eventType":"taskCreated","timestamp":1556062589404,"id":13,"name":"goal task numero uno","category":0,"progressStatus":0,"parent":null,"colourid":0},{"eventType":"taskCreated","timestamp":1556062589404,"id":14,"name":"different goal with child","category":0,"progressStatus":0,"parent":null,"colourid":1},{"eventType":"subtaskCreated","timestamp":1556062589405,"id":15,"name":"weekly subtask","category":1,"progressStatus":0,"parent":14,"colourid":1},{"eventType":"subtaskCreated","timestamp":1556062589405,"id":16,"name":"daily sub subby boi","category":2,"progressStatus":0,"parent":15,"colourid":1},{"eventType":"subtaskCreated","timestamp":1556062589405,"id":17,"name":"This is a skipped subtask","category":2,"progressStatus":0,"parent":13,"colourid":0},{"eventType":"taskCreated","timestamp":1556062589406,"id":18,"name":"independent weekly task","category":1,"progressStatus":0,"parent":null,"colourid":2},{"eventType":"subtaskCreated","timestamp":1556062589406,"id":19,"name":"daily subtask","category":2,"progressStatus":0,"parent":18,"colourid":2},{"eventType":"taskCreated","timestamp":1556062589407,"id":20,"name":"solo daily boy","category":2,"progressStatus":0,"parent":null,"colourid":3},{"eventType":"taskCreated","timestamp":1556062589407,"id":21,"name":"eeeh later","category":3,"progressStatus":0,"parent":null,"colourid":0},{"eventType":"taskCreated","timestamp":1556062589407,"id":22,"name":"ill do it soon, for real this time","category":3,"progressStatus":0,"parent":null,"colourid":1},{"eventType":"taskCreated","timestamp":1556062589407,"id":23,"name":"oompa loompa","category":2,"progressStatus":0,"parent":null,"colourid":2},{"eventType":"taskCompleted","timestamp":1556062589408,"id":23,"name":"oompa loompa","category":2,"progressStatus":2,"parent":null,"colourid":2,"children":[]},{"eventType":"subtaskCreated","timestamp":1556062589408,"id":24,"name":"this is a separate subboi!! :)","category":2,"progressStatus":0,"parent":15,"colourid":1},{"eventType":"taskCompleted","timestamp":1556062589409,"id":24,"name":"this is a separate subboi!! :)","category":2,"progressStatus":2,"parent":15,"colourid":1,"children":[]},{"eventType":"taskCreated","timestamp":1556062589409,"id":25,"name":"memes","category":2,"progressStatus":0,"parent":null,"colourid":3},{"eventType":"taskFailed","timestamp":1556062589410,"id":25,"name":"memes","category":2,"progressStatus":4,"parent":null,"colourid":3,"children":[]}]';
export const dummyEventLog2 = '[{"eventType":"taskCreated","timestamp":1556106767782,"id":26,"name":"aaa","category":3,"progressStatus":0,"colourid":0,"parent":null},{"eventType":"taskCreated","timestamp":1556106779957,"id":27,"name":"lol at this lame shit","category":2,"progressStatus":0,"colourid":1,"parent":null},{"eventType":"taskCreated","timestamp":1556106938064,"id":28,"name":"asda","category":1,"progressStatus":0,"colourid":2,"parent":null},{"eventType":"taskCreated","timestamp":1556106941746,"id":29,"name":"qwert","category":0,"progressStatus":0,"colourid":3,"parent":null},{"eventType":"taskCreated","timestamp":1556106943560,"id":30,"name":"wqweqwe","category":0,"progressStatus":0,"colourid":0,"parent":null},{"eventType":"subtaskCreated","timestamp":1556106951061,"id":31,"name":"aaaaqqqqqqaaoppsodjcn","category":1,"progressStatus":0,"colourid":0,"parent":30},{"eventType":"taskStarted","timestamp":1556106958129,"id":31,"name":"aaaaqqqqqqaaoppsodjcn","category":1,"progressStatus":1,"colourid":0,"parent":30,"children":[]},{"eventType":"taskCompleted","timestamp":1556106958387,"id":31,"name":"aaaaqqqqqqaaoppsodjcn","category":1,"progressStatus":2,"colourid":0,"parent":30,"children":[]},{"eventType":"taskStarted","timestamp":1556106960219,"id":19,"name":"daily subtask","category":2,"progressStatus":1,"colourid":2,"parent":18,"children":[]},{"eventType":"taskStarted","timestamp":1556106962849,"id":28,"name":"asda","category":1,"progressStatus":1,"colourid":2,"parent":null,"children":[]},{"eventType":"taskCompleted","timestamp":1556106963697,"id":28,"name":"asda","category":1,"progressStatus":2,"colourid":2,"parent":null,"children":[]},{"eventType":"taskStarted","timestamp":1556106965175,"id":18,"name":"independent weekly task","category":1,"progressStatus":1,"colourid":2,"parent":null,"children":[19]},{"eventType":"taskCompleted","timestamp":1556106966517,"id":19,"name":"daily subtask","category":2,"progressStatus":2,"colourid":2,"parent":18,"children":[]},{"eventType":"taskStarted","timestamp":1556106968407,"id":15,"name":"weekly subtask","category":1,"progressStatus":1,"colourid":1,"parent":14,"children":[16,24]},{"eventType":"taskStarted","timestamp":1556106970113,"id":14,"name":"different goal with child","category":0,"progressStatus":1,"colourid":1,"parent":null,"children":[15]},{"eventType":"taskCompleted","timestamp":1556106970691,"id":14,"name":"different goal with child","category":0,"progressStatus":2,"colourid":1,"parent":null,"children":[15]},{"eventType":"taskRevived","timestamp":null,"original":25,"id":32,"name":"memes","category":3,"progressStatus":0,"colourid":3,"parent":null},{"eventType":"taskActivated","timestamp":1556112988428,"id":32,"name":"memes","category":1,"progressStatus":0,"colourid":3,"parent":null,"children":[]},{"eventType":"taskStarted","timestamp":1556168848972,"id":29,"name":"qwert","category":0,"progressStatus":1,"colourid":3,"parent":null,"children":[]},{"eventType":"taskStarted","timestamp":1556168850373,"id":32,"name":"memes","category":1,"progressStatus":1,"colourid":3,"parent":null,"children":[]},{"eventType":"taskStarted","timestamp":1556106965175,"id":18,"name":"independent weekly task","category":1,"progressStatus":1,"colourid":2,"parent":null,"children":[19]}]';

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