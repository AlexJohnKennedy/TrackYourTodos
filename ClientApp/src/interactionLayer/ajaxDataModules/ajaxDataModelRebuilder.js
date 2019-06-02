import { SetIdStartVal } from '../../logicLayer/Task';
import { RebuildState } from '../../logicLayer/StateRebuilder';
import { forceTokenRefresh, handleAuthFailure, handleServerFailure, handleUnknownGetFailure } from './ajaxErrorcaseHandlers';

// This function sends an HTTP request to fetch the latest data-log, and applies the returned logs onto the state object.
// For now, we are just going to blindly apply the returned logs to the state! This means that calling this twice on the
// same data object will double-apply the data events... this is not ideal, but it is working for the current design since
// we are confident that this is only called once per data-model-instance.
// TODO: Make this idempotent for the same returned log of events. I.e., do a pass through to detect duplicate events.
// (This might mean we have to store the log in memory.. ? and have the caller pass in all previous logs.. ?)
export function ScheduleEventLogUpdate(tasklist, onLoadFunc) {
    console.log("Ajax Get request scheduled!");
    PerformEventLogUpdate(tasklist, onLoadFunc, 2, false);    
}

function PerformEventLogUpdate(tasklist, onLoadFunc, retryCount, logoutOnAuthFailure) {
    // We need to be authenticated on our backend using the google JWT. Thus, we must fetch it from our saved location in local storage.
    // The local storage key to place it is written in App.js as of 28th May 2019.
    const googleToken = window.localStorage.getItem("googleIdToken");
    if (googleToken === null || googleToken === undefined || googleToken === "") {
        throw new Error("Unable to fetch data, there was no JWT token saved in local storage for us to authenticate with!");
    }

    // Setup a request 
    let httpRequest = new XMLHttpRequest();
    httpRequest.open('GET', 'https://localhost:5001/todoevents', true); // Define a GET to our API endpoint, true marks asynchronous.
    httpRequest.setRequestHeader("Authorization", "Bearer " + googleToken); // Specify the 'Bearer' authentication scheme, under Authorization header.
    httpRequest.timeout = 5000;     // We MUST set a timeout otherwise uncaught exceptions will be thrown in scenarios where the browser is unable to complete reqeusts. (e.g. PC is asleep)
    httpRequest.ontimeout = () => {
        handleUnknownGetFailure("Oh dear. Was your PC snoozing? Maybe a nice, refreshing refresh will freshen up your refreshed computer");
    }

    // Assign a response handler function
    httpRequest.onreadystatechange = () => {
        // Ensure the response object is ready to be read (Response is finished, and was successful)
        if (httpRequest.readyState === 4 && httpRequest.status === 200) {
            console.log("Request recieved! Logging raw repsonse:");
            console.log(httpRequest.responseText);

            SetIdStartVal(RebuildState(httpRequest.responseText, tasklist) + 1);
            onLoadFunc(tasklist);
        }
        else if (httpRequest.readyState === 4 && httpRequest.status === 500) {
            if (retryCount > 0) {
                console.warn("Unknown server error on GET! Retrying...");
                PerformEventLogUpdate(tasklist, onLoadFunc, retryCount - 1, logoutOnAuthFailure);
            }
            else {
                console.warn("Failed to Get, ran out of retries on 500 response. Invoking the generic server-failure handler.");
                handleServerFailure("We couldn't fetch your data. Please try again later!");
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
                forceTokenRefresh(() => PerformEventLogUpdate(tasklist, onLoadFunc, retryCount, true));
            }
        }
        else if (httpRequest.readyState === 4) {
            // Unknown error if we get in here. Invoke the generic AJAX error handler for GET.
            console.warn("An Unknown request failure occurred. Invoking the generic GET error handler");
            handleUnknownGetFailure("We couldn't fetch your data. Please try again later!");
        }
    };
    
    // Send the request
    httpRequest.send();
}