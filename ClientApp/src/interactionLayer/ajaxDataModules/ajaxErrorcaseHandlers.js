// This file defines handler functions which the Poster and Model rebuilder can use to handle
// different kinds of error conditions.

// This should be set by the Application on startup.
// It is a function which is able to be called with an 'on completed' function as a parameter.
// The 'on completed' or 'retry action' is another function with no parameters.
let refreshAuthenticationFunc = null;
export function setIdTokenRefreshFunction(func) {
    refreshAuthenticationFunc = func;
}
export function forceTokenRefresh(retryAction) {
    // Simply request a refresh, then do the retry action!
    if (refreshAuthenticationFunc !== null) { refreshAuthenticationFunc(retryAction); }
}

// This should be set by the Application on startup. It is a funciton which is able to take an error message.
let authFailureHandler = null;
export function setAuthFailureHandler(func) {
    authFailureHandler = func;
}
export function handleAuthFailure(message) {
    if (authFailureHandler !== null) { authFailureHandler(message); }
}

// This should be set by the Application on startup.
// It is a function which is able to take an error message.
let serverFailureAction = null;
export function setServerFailureAction(func) {
    serverFailureAction = func;
}
export function handleServerFailure(message) {
    if (serverFailureAction !== null) serverFailureAction(message);
}

export function handleUnknownGetFailure(message) {
    handleServerFailure(message);   // For now, treat this exactly the same way.
}

// This should be set by the Application on startup.
// It is a function which forces the client side app to respond to 409 'conflict' responses, I.e., something we sent was conflicting with the
// the current server side state. This might occur if multiple devices are simultaneously logged into the same account and are sending events
// which conflict with each other! For now, I think a reasonable and simple solution is to force the client to refresh its data in order to
// re-sync with the server. Later, we should implement some sort of 'reconcile with server data' operation which attempts to merge the server's
// event log with the client's in-memory event log. It should find the point at which they diverged, and then replay each event from BOTH sources,
// in timestamp order, but throw away any client-stored events which are invalid at replay-time. The server stored logs should never be thrown
// away; it is treated as the source of truth. Once this operation exists (in the logic-layer, of course), then we could perhaps perform it before
// any event is posted, and, periodically also, so that if a user is logged in with multiple devices, things stay in sync. Alternatively, we could
// just figure out how to make the server send a push to all logged-in clients.. but that might be hard considering I implemented client-side
// sessions. Well, I suppose we could remember the clients who made an authenticated GET or POST to our API in the last hour, or something! Hmm..
let conflictingDataAction = null;
export function setConflictingDataAction(func) {
    conflictingDataAction = func;
}
export function handleConflictingDataOccurrance(postedData) {
    if (conflictingDataAction !== null) conflictingDataAction(postedData);
}

let unknownErrorAction = null;
export function setUnknownErrorAction(func) {
    unknownErrorAction = func;
}
export function handleUnknownError(message) {
    if (unknownErrorAction !== null) unknownErrorAction(message);
}

// Add failed posts to queue (I.e. on AJAX timeout or some other unknown error)
export function handleUnknownPostFailure(failedEventData, failedCacheInstance) {
    if (failedEventData === null || failedEventData === undefined || failedEventData.length === 0) return;
    failedCacheInstance.InsertEventsIntoCache(failedEventData);
}
