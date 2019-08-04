// This file contains the logic for storing and updating the context-state of the
// application. This stores the id-string -> name mappings, and id-string -> colourid
// mappings for the currently available contexts. This is here to support context
// editing and context-recolouring, and is populated by the backend.
import NewUuid from 'uuid/v4';

// Helpers
function makeMaps() {
    const nameMappings = new Map();
    const colourIdMappings = new Map();
    const deletedFlags = new Map();

    return Object.freeze({
        names: nameMappings,
        colours: colourIdMappings,
        deletedflags: deletedFlags
    });
}
function cloneMaps(maps) {
    return Object.freeze({
        names: new Map(maps.names),
        colours: new Map(maps.colours),
        deletedflags: new Map(maps.deletedflags)
    });
}

// Builds context mappings from the json data that the server will send to us on GET
// requests.
export function BuildContextMappings(data) {
    const maps = makeMaps();
    data.forEach(contextdata => {
        maps.colours.set(contextdata.id, contextdata.colourid);
        maps.names.set(contextdata.id, contextdata.name);
        maps.deletedflags.set(contextdata.id, contextdata.deleted);
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
        return maps.colours.get(idString);
    }
    function isNameTaken(name) {
        name = name.trim();
        for (let k of maps.names.keys()) {
            if (name === getName(k)) return true;
        }
        return false;
    }
    function getIdForName(name) {
        for (let k of maps.names.keys()) {
            if (name === getName(k)) return k;
        }
        return null;
    }
    function getUniqueIdForName(name) {
        // If the key happens to already be taken, generate a random uuid to prefix onto the key, to avoid conflicts.
        // We are going to concatenate in a particular way which the backend can understand, so that the 'rename' is automatically saved
        // by the server when it see's a task with a prefixed-context-id-string.
        return maps.names.has(name) ? NewUuid() + "$$" + name : name;
    }
    function isDeleted(id) {
        return maps.deletedflags.get(id);
    }


    // Functional mutators. These return new instances that contain the updated data, requiring the old instances to be disposed of.
    function createNewContext(id, name, colourid) {
        console.log("creating new context");
        if (name != null && isNameTaken(name)) {
            throw new Error("Not allowed to create a new context with a name which already exists: " + name);
        }
        if (maps.names.has(id)) {
            throw new Error("Not allowed to create a new context with an id which already exists: " + id + ". Use 'getUniqueIdForName()' to get a unique one instead");
        }
        
        // Clone maps, and add the new context to it.
        const newMaps = cloneMaps(maps);
        newMaps.names.set(id, name);
        newMaps.colours.set(id, colourid);
        newMaps.deletedflags.set(id, false);

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
    function deleteContext(idString) {
        const newMaps = cloneMaps(maps);
        newMaps.deletedflags.set(idString, true);
        return ContextMappings(newMaps);
    }
    function reviveContext(idString) {
        const newMaps = cloneMaps(maps);
        newMaps.deletedflags.set(idString, false);
        return ContextMappings(newMaps);
    }
    function changeContextColour(idString, newColourid) {
        const newMaps = cloneMaps(maps);
        newMaps.colours.set(idString, newColourid);
        return ContextMappings(newMaps);
    }
    function mergeOtherMappingsIntoThis(otherContextMappings) {
        const newMaps = cloneMaps(maps);
        
        // data in THIS object is prioritised over data in the other mapping object, in the same idstring has different results in the other
        for (let [id, name, colourid, deleted] of otherContextMappings) {
            if (!newMaps.names.has(id)) {
                newMaps.names.set(id, name);
                newMaps.colours.set(id, colourid);
                newMaps.deletedflags.set(id, deleted);
            }
        }

        return ContextMappings(newMaps);
    }

    return Object.freeze({
        GetName: getName,
        GetColourId: getColourId,
        IsNameTaken: isNameTaken,
        GetIdForName: getIdForName,
        HasId: id => maps.names.has(id),
        GetUniqueIdForName: getUniqueIdForName,
        IsDeleted: isDeleted,
        CreateNewContext: createNewContext,
        RenameContext: renameContext,
        ChangeContextColour: changeContextColour,
        DeleteContext: deleteContext,
        ReviveContext: reviveContext,
        MergeOtherMappingsIntoThis: mergeOtherMappingsIntoThis,
        IdArray: [ ...maps.names.keys()],
        NamesArray: [ ...maps.names.values()],
        DeletedFlagsArray: [ ...maps.deletedflags.values()],
        ColourIdsArray: [ ...maps.colours.values()],

        // Generator function, which iterates. Makes this an iterable object
        *[Symbol.iterator]() {
            for (let [id, name] of maps.names) {
                yield [id, name, maps.colours.get(id), maps.deletedflags.get(id)];
            }
        }
    });
}