// This file contains the logic for storing and updating the context-state of the
// application. This stores the id-string -> name mappings, and id-string -> colourid
// mappings for the currently available contexts. This is here to support context
// editing and context-recolouring, and is populated by the backend.
import NewUuid from 'uuid/v4';

// Helpers
function makeMaps() {
    const nameMappings = new Map();
    const colourIdMappings = new Map();

    return Object.freeze({
        names: nameMappings,
        colours: colourIdMappings
    });
}
function cloneMaps(maps) {
    return Object.freeze({
        names: new Map(maps.names),
        colours: new Map(maps.colours)
    });
}

// Builds context mappings from the json data that the server will send to us on GET
// requests.
export function BuildContextMappingsFromJson(availableContextJsonData) {
    const maps = makeMaps();
    const data = JSON.parse(availableContextJsonData);
    data.forEach(contextdata => {
        maps.colours.set(contextdata.id, contextdata.colourid);
        maps.names.set(contextdata.id, contextdata.name);
    });

    return ContextMappings(maps);
}

// Builds the data type which is returned to the client
function ContextMappings(maps) {
    // State reader functions
    function getName(idString) {
        const name = maps.names.get(idString);
        return name === undefined || name === null ? idString : name;
    }
    function getColourId(idString) {
        return maps.names.get(idString);
    }
    function isNameTaken(name) {
        name = name.trim();
        for (let k of maps.names.keys()) {
            if (name === getName(k)) return true;
        }
        return false;
    }

    // Functional mutators. These return new instances that contain the updated data, requiring the old instances to be disposed of.
    function createNewContext(name, colourid) {
        if (isNameTaken(name)) {
            throw new Error("Not allowed to create a new context with a name which already exists");
        }
        let idTaken = false;
        maps.names.keys().forEach(k => {
            if (k === name) idTaken = true;
        });

        // If the key happens to already be taken, generate a random uuid to prefix onto the key, to avoid conflicts.
        // We are going to concatenate in a particular way which the backend can understand, so that the 'rename' is automatically saved
        // by the server when it see's a task with a prefixed-context-id-string.
        const id = idTaken ? NewUuid() + "$$" + name : name;
        const rename = idTaken ? name : null;
        
        // Clone maps, and add the new context to it.
        const newMaps = cloneMaps(maps);
        newMaps.names.set(id, rename);
        newMaps.colours.set(id, colourid);

        return ContextMappings(newMaps);
    }
    function renameContext(idString, newName) {
        if (isNameTaken(newName)) {
            throw new Error("Not allowed to rename a context to a name which already exists");
        }
        const newMaps = cloneMaps(maps);
        newMaps.names.set(idString, newName);
        return ContextMappings(newMaps);
    }
    function changeContextColour(idString, newColourid) {
        const newMaps = cloneMaps(maps);
        newMaps.colours.set(idString, newColourid);
        return ContextMappings(newMaps);
    }
    function deleteContext(idString) {
        const newMaps = cloneMaps(maps);
        newMaps.names.delete(idString);
        newMaps.colours.delete(idString);
        return ContextMappings(newMaps);
    }

    return Object.freeze({
        GetName: getName,
        GetColourId: getColourId,
        IsNameTaken: isNameTaken,
        CreateNewContext: createNewContext,
        Renamecontext: renameContext,
        ChangeContextColour: changeContextColour,
        DeleteContext: deleteContext
    });
}