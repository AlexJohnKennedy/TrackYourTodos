export function SerialiseTaskObject(task) {
    return JSON.stringify(task, taskReplacer);
}

function taskReplacer(key, value) {
    // Handle serialisation of related task objects. We should just store their ids, rather than nesting.
    if (key === "parent") {
        return (value === null) ? null : value.id; 
    }
    else if (key === "children") {
        // Return an array of child ids, which will be recursively serialised.
        return value.map(child => child.id);
    }
    // Anything else should be handled normally
    else {
        return value;
    }
}