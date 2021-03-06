import { SetIdStartVal } from '../../logicLayer/Task';
import { RebuildState } from '../../logicLayer/StateRebuilder';
import { forceTokenRefresh, handleAuthFailure, handleServerFailure, handleUnknownGetFailure } from './ajaxErrorcaseHandlers';
import { API_ENDPOINT } from './apiEndpointConfiguration';

// This function sends an HTTP request to fetch the latest data-log, and applies the returned logs onto the state object.
// For now, we are just going to blindly apply the returned logs to the state! This means that calling this twice on the
// same data object will double-apply the data events... this is not ideal, but it is working for the current design since
// we are confident that this is only called once per data-model-instance.
// TODO: Make this idempotent for the same returned log of events. I.e., do a pass through to detect duplicate events.
// (This might mean we have to store the log in memory.. ? and have the caller pass in all previous logs.. ?)
export function ScheduleEventLogUpdate(tasklist, undoStack, visibleContexts, onLoadFunc) {
    PerformEventLogUpdate(tasklist, undoStack, visibleContexts, onLoadFunc, 2, false);    
}

// For logging and debugging purposes, we will track an id for each request our client makes.
let postRequestNumber = 0;
const getPostRequestNumber = () => postRequestNumber++;

function PerformEventLogUpdate(tasklist, undoStack, visibleContexts, onLoadFunc, retryCount, logoutOnAuthFailure) {
    const reqNum = getPostRequestNumber();  // For logging

    // We need to be authenticated on our backend using the google JWT. Thus, we must fetch it from our saved location in local storage.
    // The local storage key to place it is written in App.js as of 28th May 2019.
    const googleToken = window.localStorage.getItem("googleIdToken");
    if (googleToken === null || googleToken === undefined || googleToken === "") {
        throw new Error("Unable to fetch data, there was no JWT token saved in local storage for us to authenticate with!");
    }

    // Setup a request.
    let httpRequest = new XMLHttpRequest();

    // Construct GET query string. This is the base URL + visible contexts as query-string values as 'contexts'.
    const baseUrl = API_ENDPOINT;
    let contructedUrl;
    if (visibleContexts === undefined || visibleContexts === null || visibleContexts.length === 0) {
        contructedUrl = baseUrl;
    }
    else {
        contructedUrl = baseUrl + visibleContexts.reduce((result, context) => result + 'contexts=' + encodeURIComponent(context) + '&', '?');
    }
    httpRequest.open('GET', contructedUrl, true);

    // Setup Authorization details, carried in header. Specify the 'Bearer' authentication scheme, under Authorization header.
    httpRequest.setRequestHeader("Authorization", "Bearer " + googleToken);

    // Define a retry function, which we will attach to certain event types.
    function buildRetryHandler(retryLogMsg, noMoreRetriesLogMsg) {
        return () => {
            if (retryCount > 0) {
                console.log(retryLogMsg);
                PerformEventLogUpdate(tasklist, undoStack, visibleContexts, onLoadFunc, retryCount - 1, logoutOnAuthFailure);
            }
            else {
                console.log(noMoreRetriesLogMsg);
                handleUnknownGetFailure("Oh dear. Was your PC snoozing? Maybe a nice, refreshing refresh will freshen up your refreshed computer");
            }
        };
    }

    // Setup AJAX timeout action. We MUST set a timeout otherwise uncaught exceptions will be thrown in scenarios where the browser is unable to complete reqeusts. (e.g. PC is asleep)
    httpRequest.timeout = 10000;
    httpRequest.ontimeout = buildRetryHandler("GET #" + reqNum + " request timed out. Retrying: " + contructedUrl, "GET #" + reqNum + " request timed out. Ran out of retries. Invoking get failure handler.");

    // Setup AJAX error action. This is invoked if an unknown network error occurs, such that the server was never reached or the connection was dropped before completing.
    httpRequest.onerror = buildRetryHandler("Network error on GET #" + reqNum + ". Retrying: " + contructedUrl, "Network error on GET #" + reqNum + ". Ran out of retries. Invoking get failure handler.");

    // Assign a response handler function
    httpRequest.onreadystatechange = () => {
        // Ensure the response object is ready to be read (Response is finished, and was successful)
        if (httpRequest.readyState === 4 && httpRequest.status === 200) {
            console.log("GET #" + reqNum + " Response recieved (200). Eventlog loaded successfully.");

            const responseData = JSON.parse(httpRequest.responseText);

            SetIdStartVal(RebuildState(responseData.eventLog, tasklist, undoStack) + 1);
            onLoadFunc(tasklist, undoStack, responseData.availableContexts);
        }
        else if (httpRequest.readyState === 4 && httpRequest.status === 500) {
            if (retryCount > 0) {
                console.log("Server Error on GET #" + reqNum + " (500) Retrying: " + contructedUrl);
                PerformEventLogUpdate(tasklist, undoStack, visibleContexts, onLoadFunc, retryCount - 1, logoutOnAuthFailure);
            }
            else {
                console.log("Server Error on GET #" + reqNum + " (500). Ran out of retries. Invoking 'server failure' handler.");
                handleServerFailure("Our system fell down the stairs! Give us a sec, and try again?");
            }
        }
        else if (httpRequest.readyState === 4 && httpRequest.status === 401) {
            // Authentication error. Try to force an id_token token refresh and then try again, or just handle auth failure.
            if (logoutOnAuthFailure) {
                console.log("Authentication failure on GET #" + reqNum + " (401). No more retries remaining. Invoking 'Auth Error' handler.");
                handleAuthFailure("We are having trouble accessing your Google account at the moment. It's probably their fault... probably. Please try again later!");
            }
            else {
                console.log("Authentication failure on GET #" + reqNum + " (401). Forcing a token refresh, and retrying: " + contructedUrl);                
                forceTokenRefresh(() => PerformEventLogUpdate(tasklist, undoStack, visibleContexts, onLoadFunc, retryCount, true));
            }
        }
        else if (httpRequest.readyState === 4 && (httpRequest.status === 400 || httpRequest.status === 403 || httpRequest.status === 404)) {
            // Bad requests. Do not retry these.
            console.log("Bad request Error on GET #" + reqNum + " (" + httpRequest.status + "). Invoking the generic GET error handler.");
            handleUnknownGetFailure("Oh dear, we screwed up. Please try again later!");
        }
    };
    
    // Send the request
    console.log("Sending GET #" + reqNum + " request: " + contructedUrl);
    httpRequest.send();
}