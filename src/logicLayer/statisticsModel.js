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

    GetStatistics() {

    }
}