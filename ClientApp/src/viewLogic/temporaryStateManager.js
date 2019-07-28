// This function returns an object which is used to track temporary states
// which can all be 'cleared' when required.
// Each time this function is called, it will return a new object, with its
// own context. I.e., if you have two independent temp-state managers, then
// when one clears its state, the other will persist.
export function TemporaryStateManager() {
    let cleanUpCallbacks = [];
    function registerCleanUpCallback(func) {
        console.log("registering");
        cleanUpCallbacks.push(func);
        if (window.history.state === null || window.history.state === undefined || !window.history.state.formIsOpen) {
            console.log("pushing history state");
            window.history.pushState({ formIsOpen: true }, "temporary state is open");
        }
    }
    function triggerCleanup() {
        console.log("cleaning up");
        for (let f of cleanUpCallbacks) {
            f();
        }
        cleanUpCallbacks = [];
    }

    return Object.freeze({
        registerCleanUpCallback : registerCleanUpCallback,
        triggerCleanup : triggerCleanup,
        length : () => cleanUpCallbacks.length
    });
}