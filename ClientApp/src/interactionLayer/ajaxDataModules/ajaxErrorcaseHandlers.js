// This file defines handler functions which the Poster and Model rebuilder can use to handle
// different kinds of error conditions.

// This should be set by the Application on startup.
// It is a function which is able to be called with an 'on completed' function as a parameter.
let refreshAuthenticationFunc = null;
export function setIdTokenRefreshFunction(func) {
    refreshAuthenticationFunc = func;
}
export function handleAuthFailure(retryAction) {
    // Simply request a refresh, then do the retry action!
    if (refreshAuthenticationFunc !== null) { refreshAuthenticationFunc(retryAction); }
}

// This should be set by the Application on startup.
// It is a function which is able to take an error message.
// TODO: This would probably just redirect to some 'something is wrong' page, but we are allowing the React view logic to specify what to do.
let serverFailureAction = null;
export function setServerFailureAction(func) {
    serverFailureAction = func;
}
export function handleServerFailuer(message) {
    if (serverFailureAction !== null) serverFailureAction(message);
}

// TODO: Add failed posts to queue (I.e. on AJAX timeout or some other unknown error)
export function handleUnknownPostFailure(failedEventData, automaticallyScheduleRetry) {
    // TODO
}