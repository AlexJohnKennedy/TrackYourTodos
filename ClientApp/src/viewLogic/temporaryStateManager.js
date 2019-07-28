// This function returns an object which is used to track temporary states
// which can all be 'cleared' when required.
// Each time this function is called, it will return a new object, with its
// own context. I.e., if you have two independent temp-state managers, then
// when one clears its state, the other will persist.

// You can optionally provide a function which will be called each time "registerCleanUpCallback" is called.
export function TemporaryStateManager(onRegisterFunc = null) {
    let cleanUpCallbacks = [];
    function registerCleanUpCallback(func) {
        cleanUpCallbacks.push(func);
        if (onRegisterFunc !== null) { onRegisterFunc(); }
    }
    
    function triggerCleanup() {
        for (let f of cleanUpCallbacks) {
            f();
        }
        cleanUpCallbacks = [];
    }

    function clearCallbacks() {
        cleanUpCallbacks = [];
    }

    return Object.freeze({
        registerCleanUpCallback : registerCleanUpCallback,
        triggerCleanup : triggerCleanup,
        clearCallbacks : clearCallbacks,
        length : () => cleanUpCallbacks.length
    });
}