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
import React from 'react';

// Set up a context value to define the theme. (Default value 0).
const themes = {
    blueboys: 1,
    multineonboys: 0,
    purpleboys: 2
};
export const currThemeId = themes.multineonboys;
export const ThemeId = React.createContext({ themeId: themes.blueboys});

const maps = SetupColourSets();
export const ColourIdTracker = CreateNewColourTracker(maps[currThemeId].size);
export function GetColourMapping(themeId) {
    return Object.freeze(maps[themeId]);
}

function SetupColourSets() {
    const maps = [];
    
    // For now, only default theme exists
    let map = new Map();
    map.set(0, "#007ACC");
    map.set(2, "#CF3333");      // map.set(1, "#004D81");
    map.set(1, "#D48E00");      // map.set(2, "#8800B0");
    map.set(3, "#AC33CF");
    maps.push(map);

    map = new Map();
    map.set(0, "#007ACC");
    maps.push(map);

    map = new Map();
    map.set(0, "#AC33CF");
    maps.push(map);

    return maps;
}

function CreateNewColourTracker(numColours) {
    console.log("Num colours: "+numColours);
    function Colour(value) {
        return {
            value: value,
            usages: 0
        };
    }

    // Track the front of the list with a pointer.
    let colours = [];
    let front = 0;
    for (let i=0; i < numColours; i++) {
        addNew(i);
    }
    function addNew(id) {
        colours.push(Colour(id));
    }

    // Returns the front colour value, increments its usage, and moves it to the back of the list.
    function useNextColour() {
        let c = colours[front];
        c.usages++;
        front = cycleFront(front);
        console.log("returning: " + c.value + " front: " + front);
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
        function inc(x) {
            x++;
            if (x === colours.length) x = 0;
            return x;
        }
        let i = startPoint;
        let usageTarget = 0;    // Look for next colour with this many current usages.
        let prevFront = i;
        i = inc(i);
        while (colours[i].usages > usageTarget) {
            i = inc(i);
            if (i === prevFront) {
                usageTarget++;
                i = inc(i);    // avoid immediately picking the same colour as previous in this occurance
            }
        }
        return i;
    }

    return Object.freeze({
        useNextColour: useNextColour,
        peekColours: peekColours,
        defer: defer
    });
}