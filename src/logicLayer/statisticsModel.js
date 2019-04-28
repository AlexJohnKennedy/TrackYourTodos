import { TimeGroupTypes, BuildNewTimeGroupedTaskList } from './dateGroupTaskList';

export class StatisticsModel {
    constructor(tasklist) {
        this.yearGroupsCompleted = BuildNewTimeGroupedTaskList(TimeGroupTypes.YEAR, false);
        this.yearGroupsFailed = BuildNewTimeGroupedTaskList(TimeGroupTypes.YEAR, false);
        this.monthGroupsCompleted = BuildNewTimeGroupedTaskList(TimeGroupTypes.MONTH, false);
        this.monthGroupsFailed = BuildNewTimeGroupedTaskList(TimeGroupTypes.MONTH, false);
        this.weekGroupsCompleted = BuildNewTimeGroupedTaskList(TimeGroupTypes.WEEK, false);
        this.weekGroupsFailed = BuildNewTimeGroupedTaskList(TimeGroupTypes.WEEK, false);
        this.dayGroupsCompleted = BuildNewTimeGroupedTaskList(TimeGroupTypes.DAY, false);
        this.dayGroupsFailed = BuildNewTimeGroupedTaskList(TimeGroupTypes.DAY, false);
        this.allCompleted = [];
        this.allFailed = [];

        // Populate lists
        tasklist.GetCompletedTasks().forEach(group => group.tasks.forEach(task => {
            this.yearGroupsCompleted.AddTask(task);
            this.monthGroupsCompleted.AddTask(task);
            this.weekGroupsCompleted.AddTask(task);
            this.dayGroupsCompleted.AddTask(task);
            this.allCompleted.push(task);
        }));
        tasklist.GetFailedTasks().forEach(group => group.tasks.forEach(task => {
            this.yearGroupsFailed.AddTask(task);
            this.monthGroupsFailed.AddTask(task);
            this.weekGroupsFailed.AddTask(task);
            this.dayGroupsFailed.AddTask(task);
            this.allFailed.push(task);
        }));

        console.log(this);
    }

    AddCompletedTask(task) {
        this.yearGroupsCompleted.AddTask(task);
        this.monthGroupsCompleted.AddTask(task);
        this.weekGroupsCompleted.AddTask(task);
        this.dayGroupsCompleted.AddTask(task);
        this.allCompleted.push(task);
    }
    AddFailedTask(task) {
        this.yearGroupsFailed.AddTask(task);
        this.monthGroupsFailed.AddTask(task);
        this.weekGroupsFailed.AddTask(task);
        this.dayGroupsFailed.AddTask(task);
        this.allFailed.push(task);
    }

    // OPTIONS:
    // {
    //      days:   <-- Number of days to go back. 0 means do not calculate daily stats
    //      weeks:  <-- Number of weeks to go back. 0 means do not calculate weekly stats
    //      months: <-- Number of months to go back. 0 means do not calculate monthly stats
    //      years:  <-- Number of years to go back. 0 means do not calculate yearly stats
    //      alltime: bool <-- Whether or not to calculate all time stats   
    // }
    GetStatistics(optionsObj) {
        let dayStats = this.calcStats(optionsObj.days, this.dayGroupsCompleted.GetAllGroupedTasks(), this.dayGroupsFailed.GetAllGroupedTasks(), date => new Date(date.setHours(0, 0, 0, 0)), date => new Date(date.setDate(date.getDate() - 1)));
        let weekStats = this.calcStats(optionsObj.weeks, this.weekGroupsCompleted.GetAllGroupedTasks(), this.weekGroupsFailed.GetAllGroupedTasks(), date => {
            date.setDate(date.getDate() - date.getDay());
            date.setHours(0, 0, 0, 0);
            return date;
        }, date => new Date(date.setDate(date.getDate() - 2)));
        let monthStats = this.calcStats(optionsObj.months, this.monthGroupsCompleted.GetAllGroupedTasks(), this.monthGroupsFailed.GetAllGroupedTasks(), date => new Date(date.getFullYear(), date.getMonth()), date => new Date(date.setDate(date.getDate() - 1)));
        let yearStats = this.calcStats(optionsObj.years, this.yearGroupsCompleted.GetAllGroupedTasks(), this.yearGroupsFailed.GetAllGroupedTasks(), date => new Date(date.getFullYear(), 0), date => new Date(date.setDate(date.getDate() - 5)));
        let alltimeStats = optionsObj.alltime ? this.calcAlltimeStats() : null;

        return {
            dayStats: dayStats,
            weekStats: weekStats,
            monthStats: monthStats,
            yearStats: yearStats,
            alltimeStats: alltimeStats
        };
    }
    
    calcAlltimeStats() {
        return {
            completedAggregate: this.allCompleted.length,
            failedAggregate: this.allFailed.length
        };
    }

    calcStats(numToGoBack, completedGroups, failedGroups, floorDateToKeyDateFunc, cycleBackFunc) {
        function cmpFunc(date, groupElem) {
            if (date.valueOf() > groupElem.time.valueOf()) {
                return -1;  // Go before (in the array) if our time is more recent, i.e., value is larger
            }
            else if (date.valueOf() < groupElem.time.valueOf()) {
                return 1;   // Go after (in the array) if our time is less recent, i.e., value is smaller
            }
            else {
                return 0;
            }
        };
        
        if (numToGoBack <= 0) return null;
        
        let completedArray = [];
        let failedArray    = [];
        let completedAggregate = 0;
        let failedAggregate    = 0;

        let currDate = floorDateToKeyDateFunc(new Date(Date.now()));

        for (let i=0; i < numToGoBack; i++) {
            let completedSearchResult = binarySearch(completedGroups, currDate, cmpFunc);
            if (completedSearchResult < 0) {
                completedArray.push(0);  // No completed tasks for this day
            }
            else {
                completedArray.push(completedGroups[completedSearchResult].tasks.length);
                completedAggregate += completedGroups[completedSearchResult].tasks.length;
            }

            let failedSearchResult = binarySearch(failedGroups, currDate, cmpFunc);
            if (failedSearchResult < 0) {
                failedArray.push(0);  // No completed tasks for this day
            }
            else {
                failedArray.push(failedGroups[failedSearchResult].tasks.length);
                failedAggregate += failedGroups[failedSearchResult].tasks.length;
            }

            // Cycle back one time-step, and look again
            currDate = cycleBackFunc(currDate);
            currDate = floorDateToKeyDateFunc(currDate);
        }

        return {
            numCompletedArray: completedArray,
            numFailedArray: failedArray,
            totalCompleted: completedAggregate,
            totalFailed: failedAggregate
        };
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