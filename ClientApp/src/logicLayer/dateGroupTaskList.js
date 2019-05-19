// This exports a data structure used to group tasks into a 'time bracket' (e.g. month), and then store all
// tasks into an array based on that grouping, such that a list of all tasks in time-sorted order can be
// restored.

// Represents the possible grouping types.
export const TimeGroupTypes = Object.freeze({
    DAY: 0,
    WEEK: 1,
    MONTH: 2,
    YEAR: 3
});

export function BuildNewTimeGroupedTaskList(groupingType, sortByActivationTime = false) {
    // Sort tasks by either activation time, or time closed, depending on parameter.
    let timeKeyFunc = sortByActivationTime ? t => t.eventTimestamps.timeActivated : t => t.eventTimestamps.timeClosed;

    if (groupingType === TimeGroupTypes.DAY) {
        return new GroupedTaskList(timeKeyFunc, TimeGroupTypes.DAY, (timestamp) => {
            let timestampDate = new Date(timestamp);
            timestampDate.setHours(0, 0, 0, 0);
            return timestampDate;
        });
    }
    else if (groupingType === TimeGroupTypes.WEEK) {
        return new GroupedTaskList(timeKeyFunc, TimeGroupTypes.WEEK, (timestamp) => {
            let timestampDate = new Date(timestamp);
            timestampDate.setDate(timestampDate.getDate() - (timestampDate.getDay()-1)%7);
            timestampDate.setHours(0, 0, 0, 0);
            return timestampDate;
        });
    }
    else if (groupingType === TimeGroupTypes.MONTH) {
        return new GroupedTaskList(timeKeyFunc, TimeGroupTypes.MONTH, (timestamp) => {
            let timestampDate = new Date(timestamp);
            return new Date(timestampDate.getFullYear(), timestampDate.getMonth());
        });
    }
    else if (groupingType === TimeGroupTypes.YEAR) {
        return new GroupedTaskList(timeKeyFunc, TimeGroupTypes.YEAR, (timestamp) => {
            let timestampDate = new Date(timestamp);
            return new Date(timestampDate.getFullYear(), 0);    // 0'th month to indicate start of year
        });
    }
    else {
        throw new Error("Illegal grouping type passed to BuildNewTimeGroupedTaskList: " + groupingType);
    }
}

class GroupedTaskList {
    constructor(taskTimeKeyFunction, groupingType, dateConversionFunction) {
        this.groups = [];
        this.taskTimeKeyFunction = taskTimeKeyFunction;
        this.dateConversionFunction = dateConversionFunction;
        this.groupingType = groupingType;
    }

    GetGroupingType() {
        return this.groupingType;
    }

    AddTask(task) {
        let timeStamp = this.taskTimeKeyFunction(task);
        if (timeStamp === null || timeStamp === undefined) { throw new Error('error is time key func. Returned undefined!'); }

        let date = this.dateConversionFunction(timeStamp);

        // Okay. We know the groups array is sorted by months, so just cycle that list until we find the correct 'insertion point'.
        let searchResult = binarySearch(this.groups, date, (date, groupElem) => {
            if (date.valueOf() > groupElem.time.valueOf()) {
                return -1;  // Go before (in the array) if our time is more recent, i.e., value is larger
            }
            else if (date.valueOf() < groupElem.time.valueOf()) {
                return 1;   // Go after (in the array) if our time is less recent, i.e., value is smaller
            }
            else {
                return 0;
            }
        })
        if (searchResult < 0) {
            // No match was found, thus, we need to add a new 'group' at position (-searchResult - 1)
            this.groups.splice((-searchResult-1), 0, {
                time: date,
                tasks: [task]
            });
        }
        else {
            // Need to add this task into the matched group.
            let taskList = this.groups[searchResult].tasks;
            let innerSearchResult = binarySearch(taskList, task, (a, b) => {
                return this.taskTimeKeyFunction(b) - this.taskTimeKeyFunction(a);
            });
            if (innerSearchResult < 0) {
                this.groups[searchResult].tasks.splice((-innerSearchResult-1), 0, task);
            }
            else {
                this.groups[searchResult].tasks.splice(innerSearchResult, 0, task);
            }
        }
    }

    GetAllGroupedTasks() {
        return this.groups.slice(0);    // Shallow copy.
    }

    GetLimitedGroupedTasks(numGroupsBackToGo) {
        if (this.groups.length <= numGroupsBackToGo) {
            return this.GetAllGroupedTasks();
        }
        else {
            return this.groups.slice(0, numGroupsBackToGo);
        }
    }
}

/*
 * Binary search in JavaScript.
 * Returns the index of of the element in a sorted array or (-n-1) where n is the insertion point for the new element.
 * Parameters:
 *     ar - A sorted array
 *     el - An element to search for
 *     compare_fn - A comparator function. The function takes two arguments: (a, b) and returns:
 *        a negative number  if a is less than b;
 *        0 if a is equal to b;
 *        a positive number of a is greater than b.
 * The array may contain duplicate elements. If there are more than one equal elements in the array, 
 * the returned value can be the index of any one of the equal elements.
 */
function binarySearch(ar, el, compare_fn) {
    var m = 0;
    var n = ar.length - 1;
    while (m <= n) {
        var k = (n + m) >> 1;
        var cmp = compare_fn(el, ar[k]);
        if (cmp > 0) {
            m = k + 1;
        } else if(cmp < 0) {
            n = k - 1;
        } else {
            return k;
        }
    }
    return -m - 1;
}
