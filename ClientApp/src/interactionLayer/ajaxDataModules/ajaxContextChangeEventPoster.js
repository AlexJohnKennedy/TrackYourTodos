import { forceTokenRefresh, handleAuthFailure, handleServerFailure } from './ajaxErrorcaseHandlers';
import { API_ADDRESS } from './apiEndpointConfiguration';

import { toast } from 'react-toastify';
import { RetryPostToast } from '../../reactComponents/RetryPostToast';
import React from 'react';


// For logging and debugging purposes, we will track an id for each request our client makes.
let postRequestNumber = 0;
const getPostRequestNumber = () => postRequestNumber++;

export function SendRenameContextRequest(idstring, name, retryCount) {
    const url = API_ADDRESS + "/contexts?contextid=" + encodeURIComponent(idstring) + "&name=" + encodeURIComponent(name);
    sendRequest('PUT', url, retryCount);
}
export function SendDeleteContextRequest(idstring, retryCount) {
    const url = API_ADDRESS + "/contexts?contextid=" + encodeURIComponent(idstring);
    sendRequest('DELETE', url, retryCount);
}
export function SendReviveContextRequest(idstring, retryCount) {
    const url = API_ADDRESS + "/revivecontext?contextid=" + encodeURIComponent(idstring);
    sendRequest('PUT', url, retryCount);
}

function sendRequest(httpMethod, url, retryCount) {
    const reqNum = getPostRequestNumber();  // For logging

    // We need to be authenticated on our backend using the google JWT. Thus, we must fetch it from our saved location in local storage.
    const googleToken = window.localStorage.getItem("googleIdToken");
    if (googleToken === null || googleToken === undefined || googleToken === "") {
        throw new Error("Unable to fetch data, there was no JWT token saved in local storage for us to authenticate with!");
    }

    // Setup a request.
    let httpRequest = new XMLHttpRequest();
    httpRequest.open(httpMethod, url, true);
    httpRequest.setRequestHeader("Authorization", "Bearer " + googleToken);

    // Define a retry function, which we will attach to certain event types.
    function buildRetryHandler(retryLogMsg, noMoreRetriesLogMsg) {
        return () => {
            if (retryCount > 0) {
                console.log(retryLogMsg);
                sendRequest(httpMethod, url, retryCount - 1);
            }
            else {
                console.log(noMoreRetriesLogMsg);
                toast.error(<RetryPostToast clickAction={() => sendRequest(httpMethod, url, 1)}/>);
            }
        };
    }

    httpRequest.timeout = 5000;
    httpRequest.ontimeout = buildRetryHandler("Context Update Req. #" + reqNum + " timed out. Retrying: " + url, "Context Update Req. #" + reqNum + " timed out. Ran out of retries. Invoking failure handler.");
    httpRequest.onerror = buildRetryHandler("Network error on Context Update Req. #" + reqNum + ". Retrying: " + url, "Network error on Context Update Req. #" + reqNum + ". Ran out of retries. Invoking failure handler.");

    // Assign a response handler function
    httpRequest.onreadystatechange = () => {
        // Ensure the response object is ready to be read (Response is finished, and was successful)
        if (httpRequest.readyState === 4 && httpRequest.status === 200) {
            console.log("Context Update Req. #" + reqNum + " Completed successfully (200).");
        }
        else if (httpRequest.readyState === 4 && httpRequest.status === 500) {
            if (retryCount > 0) {
                console.log("Server Error on Context Update Req. #" + reqNum + " (500). Retrying...");
                sendRequest(httpMethod, url, retryCount - 1);
            }
            else {
                handleServerFailure("Oopsie whoopsie! Try again later my dear friendo!");
            }
        }
        else if (httpRequest.readyState === 4 && httpRequest.status === 401) {
            // Authentication error. Try to force an id_token token refresh and then try again, or just handle auth failure.
            if (retryCount <= 0) {
                console.log("Authentication failure on Context Update Req. #" + reqNum + " (401). No more retries remaining. Invoking 'Auth Error' handler.");
                handleAuthFailure("We are having trouble accessing your Google account at the moment. It's probably their fault... probably. Please try again later!");
            }
            else {
                console.log("Authentication failure on Context Update Req. #" + reqNum + " (401). Forcing a token refresh, and retrying: " + url);                
                forceTokenRefresh(() => sendRequest(httpMethod, url, retryCount - 1));
            }
        }
        else if (httpRequest.readyState === 4 && (httpRequest.status === 400 || httpRequest.status === 403 || httpRequest.status === 404)) {
            // Bad requests. Do not retry these.
            console.log("Bad request Error on Context Update Req. #" + reqNum + " (" + httpRequest.status + ").");
            handleServerFailure("Oh dear, we screwed up. Please try again later!");
        }
    };
    
    // Send the request
    console.log("Sending Context Update Req. #" + reqNum + " request: " + url);
    httpRequest.send();
}