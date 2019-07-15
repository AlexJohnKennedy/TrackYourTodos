import { DataEventSerialisationFuncs } from '../dataEventSerialiser';
import { forceTokenRefresh, handleAuthFailure, handleServerFailure, handleUnknownPostFailure, handleConflictingDataOccurrance } from './ajaxErrorcaseHandlers';
import { API_ENDPOINT } from './apiEndpointConfiguration';

// Builds a set of data event handlers, which post data using the the passed-in ajaxFailedEventCache instance as a failure cache.
// This will be called whenever the data-model rebuilds itself, and needs handlers with a fresh cache (for example).
export function BuildDataEventHttpPostHandlers(FailedEventCache) {
    return {
        taskAddedHandler: (task, list) => postEvent([DataEventSerialisationFuncs.taskAddedEvent(task, list)], FailedEventCache, 2, false, true),
        childTaskAddedHandler: (parent, child, list) => postEvent([DataEventSerialisationFuncs.childTaskAddedEvent(parent, child, list)], FailedEventCache, 2, false, true),
        taskRevivedHandler: (old, clone, list) => postEvent([DataEventSerialisationFuncs.taskRevivedEvent(old, clone, list)], FailedEventCache, 2, false, true),
        taskActivatedHandler: (task, list) => postEvent([DataEventSerialisationFuncs.taskActivatedEvent(task, list)], FailedEventCache, 2, false, true),
        taskDeletedHandler: (task, timestamp, list) => postEvent([DataEventSerialisationFuncs.taskDeletedEvent(task, timestamp, list)], FailedEventCache, 2, false, true),
        taskStartedHandler: (task, list) => postEvent([DataEventSerialisationFuncs.taskStartedEvent(task, list)], FailedEventCache, 2, false, true),
        taskCompletedHandler: (task, list) => postEvent([DataEventSerialisationFuncs.taskCompletedEvent(task, list)], FailedEventCache, 2, false, true),
        taskFailedHandler: (task, list) => postEvent([DataEventSerialisationFuncs.taskFailedEvent(task, list)], FailedEventCache, 2, false, true),
        taskEditedHandler: (task, list) => postEvent([DataEventSerialisationFuncs.taskEditedEvent(task, list)], FailedEventCache, 2, false, true),
        
        taskAddedUndoHandler: (data, list) => postEvent([DataEventSerialisationFuncs.taskAddedUndoEvent(data, list)], FailedEventCache, 2, false, true),
        childTaskAddedUndoHandler: (data, list) => postEvent([DataEventSerialisationFuncs.childTaskAddedUndoEvent(data, list)], FailedEventCache, 2, false, true),
        taskRevivedUndoHandler: (data, list) => postEvent([DataEventSerialisationFuncs.taskRevivedUndoEvent(data, list)], FailedEventCache, 2, false, true),
        taskDeletedUndoHandler: (data, list) => postEvent([DataEventSerialisationFuncs.taskDeletedUndoEvent(data, list)], FailedEventCache, 2, false, true),
        taskCompletedUndoHandler: (data, list) => postEvent([DataEventSerialisationFuncs.taskCompletedUndoEvent(data, list)], FailedEventCache, 2, false, true),
        taskActivatedUndoHandler: (data, list) => postEvent([DataEventSerialisationFuncs.taskActivatedUndoEvent(data, list)], FailedEventCache, 2, false, true),
        taskStartedUndoHandler: (data, list) => postEvent([DataEventSerialisationFuncs.taskStartedUndoEvent(data, list)], FailedEventCache, 2, false, true),
        taskEditedUndoHandler: (data, list) => postEvent([DataEventSerialisationFuncs.taskEditedUndoEvent(data, list)], FailedEventCache, 2, false, true),
    };
}

// Exported function for simply triggering a global retry; I.e., 'try to send all the failed events, but I dont have any new events'
export function RetryPostingFailedEvents(failureCacheInstance) {
    // Empty event data will mean it doesn't add anything.
    postEvent([], failureCacheInstance, 0, false, true);
}

// For logging and debugging purposes, we will track an id for each request our client makes.
let postRequestNumber = 0;
const getPostRequestNumber = () => postRequestNumber++;

function postEvent(eventArray, failureCache, retryCount, logoutOnAuthFailure, sendFromFailureCache) {
    const reqNum = getPostRequestNumber();  // For logging
    
    // Build the message body array, depending on incoming message and failure cache state.
    if (sendFromFailureCache && !failureCache.IsEmpty() && eventArray !== null && eventArray.length > 0) {
        eventArray = failureCache.FetchAndPopAll().concat(eventArray);
    }
    else if (sendFromFailureCache && !failureCache.IsEmpty()) {
        eventArray = failureCache.FetchAndPopAll();
    }
    else if (eventArray == null || eventArray.length === 0) {
        return;
    }

    // We need to be authenticated on our backend using the google JWT. Thus, we must fetch it from our saved location in local storage.
    // The local storage key to place it is written in App.js as of 28th May 2019.
    const googleToken = window.localStorage.getItem("googleIdToken");
    if (googleToken === null || googleToken === undefined || googleToken === "") {
        throw new Error("Unable to post data, there was no JWT token saved in local storage for us to authenticate with!");
    }

    // Setup a request 
    let httpRequest = new XMLHttpRequest();
    httpRequest.open('POST', API_ENDPOINT, true); // Define a GET to our API endpoint, true marks asynchronous.
    httpRequest.setRequestHeader("Content-type", "application/json");    // Inform the reciever that the format is JSON.
    httpRequest.setRequestHeader("Authorization", "Bearer " + googleToken); // Specify the 'Bearer' authentication scheme, under Authorization header.
    
    // Define a retry function, which we will attach to certain event types.
    function buildRetryHandler(retryLogMsg, noMoreRetriesLogMsg) {
        return () => {
            if (retryCount > 0) {
                console.log(retryLogMsg);
                postEvent(eventArray, failureCache, retryCount - 1, logoutOnAuthFailure, sendFromFailureCache);
            }
            else {
                console.log(noMoreRetriesLogMsg);
                handleUnknownPostFailure(eventArray, failureCache);     // In these scenarios, don't try again just yet..
            }
        };
    }

    httpRequest.timeout = 10000;     // We MUST set a timeout otherwise uncaught exceptions will be thrown in scenarios where the browser is unable to complete reqeusts. (e.g. PC is asleep)
    httpRequest.ontimeout = buildRetryHandler("POST #" + reqNum + " request timed out. Retrying: " + toEventString(eventArray), "POST #" + reqNum + " request timed out. Ran out of retries. Saving failed events to failure cache.");
    httpRequest.onerror = buildRetryHandler("Network error on POST #" + reqNum + ". Retrying: " + toEventString(eventArray), "Network error on POST #" + reqNum + ". Ran out of retries. Saving failed events to failure cache.");

    // Assign a response handler function. If we get back a 200, we are done! If it fails with a server error, we will recursively retry,
    // unless our retry count is 0.
    httpRequest.onreadystatechange = () => {
        if (httpRequest.readyState === 4 && httpRequest.status === 200) {
            const response = JSON.parse(httpRequest.response);
            console.log("POST #" + reqNum + " was successful for: " + toEventString(eventArray) + ". Response data = " + httpRequest.response);
            
            if (response.triggerRefresh) {
                // TODO: Only perform refreshes once all pending POST requests have completed.
                handleConflictingDataOccurrance(eventArray);
            }
        }
        else if (httpRequest.readyState === 4 && httpRequest.status === 500) {
            if (retryCount > 0) {
                console.log("Server error on POST #" + reqNum + " (500). Retrying: " + toEventString(eventArray));
                postEvent(eventArray, failureCache, retryCount - 1, logoutOnAuthFailure, sendFromFailureCache);
            }
            else {
                console.log("Server error on POST #" + reqNum + " (500). No more retries remaining. Invoking 'Server Error' handler.");
                handleServerFailure("We couldn't save your updates! Our database must be snoozing... I'll blast the techno.");
            }
        }
        else if (httpRequest.readyState === 4 && httpRequest.status === 401) {
            // Authentication error. Try to force an id_token token refresh and then try again, or just handle auth failure.
            if (logoutOnAuthFailure) {
                console.log("Authentication failure on POST #" + reqNum + " (401). No more retries remaining. Invoking 'Auth Error' handler.");
                handleAuthFailure("We are having trouble accessing your Google account at the moment. It's probably their fault... probably. Please try again later!");
            }
            else {
                console.log("Authentication failure on POST #" + reqNum + " (401). Forcing a token refresh, and retrying: " + toEventString(eventArray));
                forceTokenRefresh(() => postEvent(eventArray, failureCache, retryCount, true, sendFromFailureCache));
            }
        }
        else if (httpRequest.readyState === 4 && httpRequest.status === 409) {
            console.log("State Conflict on POST #" + reqNum + " (409) for events: " + toEventString(eventArray) + ". This means the data we tried to post is conflicting with the events already saved in the server! I am initiating 409 response handling");
            handleConflictingDataOccurrance(eventArray);
        }
        else if (httpRequest.readyState === 4 && (httpRequest.status === 400 || httpRequest.status === 403 || httpRequest.status === 404)) {
            console.log("Bad Reqeust Error on POST #" + reqNum + " (" + httpRequest.status + "). For events " + toEventString(eventArray));
            handleUnknownPostFailure(eventArray, failureCache);
        }
    };
    
    // Send the request, with the serialised event text as the message body.
    console.log("Sending POST #" + reqNum + ": " + toEventString(eventArray));
    httpRequest.send(JSON.stringify(eventArray));
}

function toEventString(eventArray) {
    let s = "[";
    eventArray.map(e => ({ task: e.name, event:e.eventType })).forEach(e => s = s + "{" + e.event + ": " + e.task + "}, ");
    return s.substring(0, s.length-2) + "]";
}