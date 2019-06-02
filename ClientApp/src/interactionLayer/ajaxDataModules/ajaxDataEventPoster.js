import { DataEventSerialisationFuncs } from '../dataEventSerialiser';

export const DataEventHttpPostHandlers = {
    taskAddedHandler: (task, list) => postEvent(DataEventSerialisationFuncs.taskAddedEvent(task, list), 2),
    childTaskAddedHandler: (parent, child, list) => postEvent(DataEventSerialisationFuncs.childTaskAddedEvent(parent, child, list), 2),
    taskRevivedHandler: (old, clone, list) => postEvent(DataEventSerialisationFuncs.taskRevivedEvent(old, clone, list), 2),
    taskActivatedHandler: (task, list) => postEvent(DataEventSerialisationFuncs.taskActivatedEvent(task, list), 2),
    taskDeletedHandler: (task, list) => postEvent(DataEventSerialisationFuncs.taskDeletedEvent(task, list), 2),
    taskStartedHandler: (task, list) => postEvent(DataEventSerialisationFuncs.taskStartedEvent(task, list), 2),
    taskCompletedHandler: (task, list) => postEvent(DataEventSerialisationFuncs.taskCompletedEvent(task, list), 2),
    taskFailedHandler: (task, list) => postEvent(DataEventSerialisationFuncs.taskFailedEvent(task, list), 2)
};

function postEvent(eventText, retryCount) {
    console.log("Ajax POST request scheduled!");
    
    // We need to be authenticated on our backend using the google JWT. Thus, we must fetch it from our saved location in local storage.
    // The local storage key to place it is written in App.js as of 28th May 2019.
    const googleToken = window.localStorage.getItem("googleIdToken");
    if (googleToken === null || googleToken === undefined || googleToken === "") {
        throw new Error("Unable to post data, there was no JWT token saved in local storage for us to authenticate with!");
    }

    // Setup a request 
    let httpRequest = new XMLHttpRequest();
    httpRequest.open('POST', 'https://localhost:5001/todoevents', true); // Define a GET to our API endpoint, true marks asynchronous.
    httpRequest.setRequestHeader("Content-type", "application/json");    // Inform the reciever that the format is JSON.
    httpRequest.setRequestHeader("Authorization", "Bearer " + googleToken); // Specify the 'Bearer' authentication scheme, under Authorization header.

    // Assign a response handler function. If we get back a 200, we are done! If it fails with a server error, we will recursively retry,
    // unless our retry count is 0.
    httpRequest.onreadystatechange = () => {
        if (httpRequest.readyState === 4 && httpRequest.status === 200) {
            console.log("POST was successful!");
            //console.log(httpRequest.responseText);
        }
        else if (httpRequest.readyState === 4 && httpRequest.status === 500) {
            if (retryCount > 0) {
                console.warn("SERVER ERROR ON POST! Retrying...");
                postEvent(eventText, retryCount-1);
            }
            else {
                console.Error("Failed to Post event, ran out of retries on 500 response: " + eventText);
                
            }
        }
        else if (httpRequest.readyState === 4) {
            // TODO: Handle server not present/not found errors, etc.
            throw new Error("Failed to Post event for unknown reason! HTTP Response Code: " + httpRequest.status);
        }
    };
    
    // Send the request, with the serialised event text as the message body.
    httpRequest.send('['+eventText+']');
}