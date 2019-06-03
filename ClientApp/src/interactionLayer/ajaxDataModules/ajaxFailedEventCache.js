// This file acts as a backlog/cache for events which this client has generated, but failed to POST and save with
// the server for whatever reason. The purpose of this cache is to allow subsequent POSTs to hopefully save these
// events, rather than ending up with a) dropped events, and b) subsequent events be considered invalid due to
// dependence on a previously-dropped event.
// This cache must be cleared when a new user logs in; i.e., re-instantaited and registered with the AJAX poster.
// Whenever the data event poster posts a new event, it MUST include any previously-failed tasks along with that
// request.

// This function instantiates a new failed-event-cache, and returns it to the user via an interface object.
export function InstantiateNewFailedEventCacheScope() {
    // Instantiate a fresh batch
    const FailedEventQueue = [];

    // Exported function.
    function IsEmpty() {
        return FailedEventQueue.length > 0;
    }

    // Exported function. Fetches all the currently stored failed events as correctly serialised strings, and
    // removes them from the event queue.
    function FetchAndPopAll() {
        // TODO
    }

    // Exported function. Places all of the events back into the cache queue, then sorts the queue based on event
    // timestamp, to ensure subsequently fetched events are correctly ordered.
    function InsertEventsIntoCache(eventArray) {
        // TODO
    }

    return Object.freeze({
        IsEmpty: IsEmpty,
        FetchAndPopAll: FetchAndPopAll,
        InsertEventsIntoCache: InsertEventsIntoCache
    });
}