// Simple logic for adding 'today', 'yesterday', 'two days ago', etc. spacer logic for closed-task tasklists.
export function mapToClosedTasklistWithSpacers(groupArray, buildTaskViewFunc) {
    let toRet = [];   // We will populate this list with taskViews and spacer objects, which the view layer will render.
    const taskIdsAlreadyTaken = new Set();

    // Do a pass through, examining each task in the list until we get sufficiently old
    let currDaysAgo = 0;
    const maxDaysAgoForSpacer = 10;
    const timenow = Date.now();    
    let placedSpacerForValueAlready = false;
    for (let group of groupArray) {
        for (let task of group.tasks) {

            let done = false;
            while (!done) {
                if (isNDaysAgo(task.eventTimestamps.timeClosed, timenow, currDaysAgo)) {
                    if (!placedSpacerForValueAlready) {
                        toRet.push({ isSpacer: true, showDay: true, time: getNDaysAgoTime(timenow, currDaysAgo) });
                        placedSpacerForValueAlready = true;
                    }
                    toRet.push(buildTaskViewFunc(task));
                    taskIdsAlreadyTaken.add(task.id);
                    done = true;
                }
                else {
                    currDaysAgo++;
                    placedSpacerForValueAlready = false;
                    if (currDaysAgo === maxDaysAgoForSpacer) done = true;
                }
            }
            if (currDaysAgo === maxDaysAgoForSpacer) { break; }
        }
        if (currDaysAgo === maxDaysAgoForSpacer) { break; }
    }

    // Okay, now filter out all groups which may or may not have had all of their tasks taken!
    const nonEmptyGroups = groupArray.filter(group => {
        for (let task of group.tasks) {
            if (!taskIdsAlreadyTaken.has(task.id)) return true;
        }
        return false;
    });

    // The only remainging groups are those which have tasks which fall outside of the 'today, yesterday, ...' custom groupings. Thus,
    // we can just shove the rest of the tasks in, using the natural grouping of monthly groups.
    nonEmptyGroups.forEach(group => {
        toRet.push({ isSpacer: true, showDay: false, time: group.time });
        toRet = toRet.concat(group.tasks.filter(t => !taskIdsAlreadyTaken.has(t.id)).map((task) => {
            return buildTaskViewFunc(task);
        }));
    });

    return toRet;
}

function isNDaysAgo(time, timenow, daysAgo) {
    let startOfDay = getNDaysAgoTime(timenow, daysAgo);
    return time > startOfDay.valueOf();
}
function getNDaysAgoTime(timenow, daysAgo) {
    let startOfDay = new Date(timenow);
    startOfDay.setDate(startOfDay.getDate() - daysAgo);
    startOfDay.setHours(0, 0, 0, 0);
    return new Date(startOfDay);
}