import { TaskObjects, SetIdStartVal } from '../../logicLayer/Task';
import { RebuildState } from '../../logicLayer/StateRebuilder';

// When this function is called, we will supply the caller with "the" data model object; I.e. an instantiated TaskList object.
// We will also send an HTTP Get request to our server, and populate the data-model once it responds with the event log.
export function GetActiveTaskObject(onLoadFunc) {
    let tasklist = new TaskObjects();
    ScheduleEventLogUpdate(tasklist, onLoadFunc);
    return tasklist;
}

// This function sends an HTTP request to fetch the latest data-log, and applies the returned logs onto the state object.
// For now, we are just going to blindly apply the returned logs to the state!
export function ScheduleEventLogUpdate(tasklist, onLoadFunc) {
    // Setup a request 
    let httpRequest = new XMLHttpRequest();
    httpRequest.open('GET', 'https://localhost:5000/todoevents', true); // Define a GET to our API endpoint, true marks asynchronous.
    
    // Assign a response hander function
    httpRequest.onreadystatechange = () => {
        // Ensure the response object is ready to be read (Response is finished, and was successful)
        if (httpRequest.readyState === 4 && httpRequest.status === 200) {
            SetIdStartVal(RebuildState(httpRequest.response, tasklist) + 1);
            onLoadFunc();
        }
    };
    
    // Send the request
    httpRequest.send();
}