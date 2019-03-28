import { start } from "repl";

// This file is responsible for producing objects which contain the colour values for
// each respective 'colourId'; I.e., tasks have associated colour ids, and then each
// id should be mapped to an actual colour value to be rendered by react. This manager
// is view-layer logic which defines a mapping to colour values from colour ids. The
// reason this is done in a separate file is so that mappings can by changed at will
// by asking for a different mapping 'preset' (i.e. change task colouring themes, or
// develop a new one through the UI).

// This manager will also track which colour id's are currently 'occupied' by existing
// task objects, and try to make sure that new tasks are assigned an id which is not
// used yet. The UI will render colour-swatches in the creation forms and possibly in
// the sidebar, such that whenever a new task is created, the 'next' colour will
// be chosen automatically unless overriden by the user on the creation form.
export function GetColourSet(themeId) {
    return sets.getSet(themeId);
}

const sets = BuildColourSets();

function BuildColourSets() {
    let colourSets = [];

    // TODO Define colour sets here
    let defaultSet = CreateNewColourSet();
    defaultSet.addColourToFrontOfList("#007ACC");
    defaultSet.addColourToBackOfList("#CBCB41");
    defaultSet.addColourToBackOfList("#587C0C");
    defaultSet.addColourToBackOfList("#36A3F0");
    colourSets.push(defaultSet);

    function getSet(id) {
        if (id < 0 || id >= colourSets.length) {
            return null;
        }
        return colourSets[id];
    }
    return Object.freeze({
        getSet: getSet
    });
}

function CreateNewColourSet() {
    function Colour(value) {
        return {
            value: value,
            usages: 0
        };
    }

    // Track the front of the list with a pointer.
    let colours = [];
    let front = 0;

    function addColourToFrontOfList(value) {
        colours.splice(front, 0, Colour(value));
    }
    function addColourToBackOfList(value) {
        colours.splice(front, 0, Colour(value));
        front = front + 1;
    }

    // Returns the front colour value, increments its usage, and moves it to the back of the list.
    function useNextColour() {
        let c = colours[front];
        c.usages++;
        front = cycleFront(front);
        return c.value;
    }

    // Returns the front most 'numToPeek' colours, but does not use them, and does not cycle the front
    // of the list at all.
    function peekColours(numToPeek) {
        let ret = []
        ret.push(colours[front].value);
        let val = front;
        for (let i=0; i < numToPeek - 1; i++) {
            val = cycleFront(val);
            ret.push(colours[val]);
        }
        return ret;
    }

    // Moves the front of the list to the n'th next colour
    function defer(n) {
        if (n === 0) return;
        for (let i=0; i < n; i++) {
            front = cycleFront(front);
        }
    }
    
    // helper
    function cycleFront(startPoint) {
        let i = startPoint;
        let usageTarget = 0;    // Look for next colour with this many current usages.
        let prevFront = i++;
        if (i === colours.length) i = 0;
        while (colours[i].usages > usageTarget) {
            i++;
            if (i === colours.length) {
                i = 0;
            }
            if (i === prevFront) {
                usageTarget++;
            }
        }
        return i;
    }

    return Object.freeze({
        addColourToFrontOfList: addColourToFrontOfList,
        addColourToBackOfList: addColourToBackOfList,
        useNextColour: useNextColour,
        peekColours: peekColours,
        defer: defer
    });
}