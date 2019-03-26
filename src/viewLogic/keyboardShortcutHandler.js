
// This object will handler all keyboard event listeners, and re-direct the invocation of events to
// handlers which register to this event.
export const ShortCutManager = BuildShortCutManager();

function BuildShortCutManager() {

    // These will store our handler functions, which are run when shortcut keys are pressed.
    let handlers = new Map();
    let shiftHandlers = new Map();

    function register(key, handlerFunc, map) {
        if (map.has(key)) {
            map.get(key).push(handlerFunc);
        }
        else {
            map.set(key, []);
            map.get(key).push(handlerFunc);
        }
    }
    function registerShortcut(key, handlerFunc) {
        register(key, handlerFunc, handlers);
    }
    function registerShiftShortcut(key, handlerFunc) {
        register(key, handlerFunc, shiftHandlers);
    }

    // Define a method which will handle all keyboard events.
    function globalHandler(event) {
        console.log(event.code);
        if (event.repeat) {
            return;     // Shortcuts all require ctrl to be pressed. We don't want successive repeats to trigger these either.
        }
        
        let map = (event.shiftKey) ? shiftHandlers : handlers;

        let key = event.code;
        if (map.has(key)) {
            for (let handler of map.get(key)) {
                // Call the handler!
                handler(event);
            }
            event.preventDefault();
        }
    }

    return Object.freeze({
        registerShortcut : registerShortcut,
        registerShiftShortcut : registerShiftShortcut,
        globalHandler : globalHandler
    });
};