import { DataEventSerialisationFuncs } from '../dataEventSerialiser';
import { forceTokenRefresh, handleAuthFailure, handleServerFailure, handleUnknownPostFailure, handleConflictingDataOccurrance } from './ajaxErrorcaseHandlers';

// Builds a set of data event handlers, which post data using the the passed-in ajaxFailedEventCache instance as a failure cache.
// This will be called whenever the data-model rebuilds itself, and needs handlers with a fresh cache (for example).
export function BuildDataEventHttpPostHandlers(FailedEventCache) {
    return {
        taskAddedHandler: (task, list) => postEvent(DataEventSerialisationFuncs.taskAddedEvent(task, list), 2, false, true),
        childTaskAddedHandler: (parent, child, list) => postEvent(DataEventSerialisationFuncs.childTaskAddedEvent(parent, child, list), 2, false, true),
        taskRevivedHandler: (old, clone, list) => postEvent(DataEventSerialisationFuncs.taskRevivedEvent(old, clone, list), 2, false, true),
        taskActivatedHandler: (task, list) => postEvent(DataEventSerialisationFuncs.taskActivatedEvent(task, list), 2, false, true),
        taskDeletedHandler: (task, list) => postEvent(DataEventSerialisationFuncs.taskDeletedEvent(task, list), 2, false, true),
        taskStartedHandler: (task, list) => postEvent(DataEventSerialisationFuncs.taskStartedEvent(task, list), 2, false, true),
        taskCompletedHandler: (task, list) => postEvent(DataEventSerialisationFuncs.taskCompletedEvent(task, list), 2, false, true),
        taskFailedHandler: (task, list) => postEvent(DataEventSerialisationFuncs.taskFailedEvent(task, list), 2, false, true)
    };
}

function postEvent(eventText, retryCount, logoutOnAuthFailure, sendFromFailureCache) {
    console.log("Ajax POST request scheduled! Send from failure cache flag = " + sendFromFailureCache);
    
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
    httpRequest.timeout = 5000;     // We MUST set a timeout otherwise uncaught exceptions will be thrown in scenarios where the browser is unable to complete reqeusts. (e.g. PC is asleep)
    httpRequest.ontimeout = () => {
        handleUnknownPostFailure(eventText, false);     // In these scenario's, don't try again just yet..
    }

    // Assign a response handler function. If we get back a 200, we are done! If it fails with a server error, we will recursively retry,
    // unless our retry count is 0.
    httpRequest.onreadystatechange = () => {
        if (httpRequest.readyState === 4 && httpRequest.status === 200) {
            console.log("POST was successful!");
        }
        else if (httpRequest.readyState === 4 && httpRequest.status === 500) {
            if (retryCount > 0) {
                console.warn("Server error on POST! Retrying...");
                postEvent(eventText, retryCount - 1, logoutOnAuthFailure, sendFromFailureCache);
            }
            else {
                console.warn("Failed to Post event, ran out of retries on 500 response: " + eventText);
                handleServerFailure("We couldn't save your updates! Our database must be snoozing... I'll blast the techno.");
            }
        }
        else if (httpRequest.readyState === 4 && httpRequest.status === 401) {
            // Authentication error. Try to force an id_token token refresh and then try again, or just handle auth failure.
            if (logoutOnAuthFailure) {
                console.warn("Got an un-authorized 401 error on attempted Event log fetch. Telling application to handler an auth failure.");
                handleAuthFailure("We are having trouble accessing your Google account at the moment. It's probably their fault... probably. Please try again later!");
            }
            else {
                console.warn("Got an un-authorized 401 error on attempted Event log fetch. Forcing a token refresh, and re-trying..");
                forceTokenRefresh(() => postEvent(eventText, retryCount, true, sendFromFailureCache));
            }
        }
        else if (httpRequest.readyState === 4 && httpRequest.status === 409) {
            console.warn("Got a 409 response. This means the data we tried to post is conflicting with the events already saved in the server! I am initiating 409 response handling");
            handleConflictingDataOccurrance(eventText);
        }
        else if (httpRequest.readyState === 4) {
            console.warn("Failed to Post event for unknown reason! HTTP Response Code: " + httpRequest.status);
            handleUnknownPostFailure(eventText, true);
        }
    };
    
    // Send the request, with the serialised event text as the message body.
    httpRequest.send('['+eventText+']');
}