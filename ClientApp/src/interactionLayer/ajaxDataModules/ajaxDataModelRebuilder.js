import { SetIdStartVal } from '../../logicLayer/Task';
import { RebuildState } from '../../logicLayer/StateRebuilder';

// This function sends an HTTP request to fetch the latest data-log, and applies the returned logs onto the state object.
// For now, we are just going to blindly apply the returned logs to the state! This means that calling this twice on the
// same data object will double-apply the data events... this is not ideal, but it is working for the current design since
// we are confident that this is only called once per data-model-instance.
// TODO: Make this idempotent for the same returned log of events. I.e., do a pass through to detect duplicate events.
// (This might mean we have to store the log in memory.. ? and have the caller pass in all previous logs.. ?)
export function ScheduleEventLogUpdate(tasklist, onLoadFunc) {
    console.log("Ajax Get request scheduled!");
    // Setup a request 
    let httpRequest = new XMLHttpRequest();
    httpRequest.open('GET', 'https://localhost:5001/todoevents', true); // Define a GET to our API endpoint, true marks asynchronous.
    
    // Assign a response hander function
    httpRequest.onreadystatechange = () => {
        // Ensure the response object is ready to be read (Response is finished, and was successful)
        if (httpRequest.readyState === 4 && httpRequest.status === 200) {
            console.log("Request recieved! Logging raw repsonse:");
            console.log(httpRequest.responseText);

            SetIdStartVal(RebuildState(httpRequest.responseText, tasklist) + 1);
            onLoadFunc(tasklist);
        }
    };
    
    // Send the request
    httpRequest.send();
}