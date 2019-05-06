import React, { Component } from 'react';
import { RadialSummaryBlock } from './RadialSummaryBlock';
import { SelectableChildrenWithController } from './SelectableChildrenWithController';
import { ScrollableBarChart } from './ScrollableBarChart';
import { RegisterForStatisticsModel } from '../interactionLayer/viewLayerInteractionApi';
import { FlexibleXYPlot, YAxis, VerticalBarSeries } from 'react-vis/dist';


export class TaskStatisticsSection extends Component {
    constructor(props) {
        super(props);

        const emptyStatsObj = {
            dayStats: {
                numCompletedArray: [],
                numFailedArray: [],
                totalCompleted: 0,
                totalFailed: 0
            },
            monthStats: {
                numCompletedArray: [],
                numFailedArray: [],
                totalCompleted: 0,
                totalFailed: 0
            },
            weekStats: {
                numCompletedArray: [],
                numFailedArray: [],
                totalCompleted: 0,
                totalFailed: 0
            },
            yearStats: {
                numCompletedArray: [],
                numFailedArray: [],
                totalCompleted: 0,
                totalFailed: 0
            },
            alltimeStats: {
                completedAggregate: 0,
                failedAggregate: 0
            }
        };

        this.state = {
            statsObject: emptyStatsObj,
            historyStats: emptyStatsObj,
            numBars: 11
        };

        this.handleChange = this.handleChange.bind(this);
    }
    componentDidMount() {
        this.statisticsModelApi = RegisterForStatisticsModel(this.handleChange, this.handleChange);
        //this.statisticsModelApi = this.statisticsModelApi.bind(this);
        this.handleChange(null, null);
    }
    handleChange(task, tasklist) {
        // Ignore the paramters from the callback. Whenever this is called, we should simply refresh our stats.
        const stats = this.statisticsModelApi.GetStatistics({
            days: 30,
            weeks: 6,
            months: 6,
            years: 1,
            alltime: true
        });
        const historyStats = this.statisticsModelApi.GetStatistics({
            days: this.state.numBars,
            weeks: this.state.numBars,
            months: this.state.numBars,
            years: 0,
            alltime: false
        });

        this.setState({
            statsObject: stats,
            historyStats: historyStats
        });
    }

    render() {
        // One summary block for the last week, one for last month, and one for all time. (subject to change).
        let dayCompleted = 0;
        let dayFailed = 0;
        for (let i = 0; i < 7; i++) {
            dayCompleted += this.state.statsObject.dayStats.numCompletedArray[i];
            dayFailed += this.state.statsObject.dayStats.numFailedArray[i];
        }
        const monthCompleted = this.state.statsObject.dayStats.totalCompleted;
        const monthFailed = this.state.statsObject.dayStats.totalFailed;
        const alltimeCompleted = this.state.statsObject.alltimeStats.completedAggregate;
        const alltimeFailed = this.state.statsObject.alltimeStats.failedAggregate;

        return (
            <div className="TaskStatisticsSection">
                <RadialSummaryBlock titleText="Last 7 days" completed={dayCompleted} failed={dayFailed} />
                <RadialSummaryBlock titleText="Last 30 days" completed={monthCompleted} failed={monthFailed} />
                <RadialSummaryBlock titleText="All time" completed={alltimeCompleted} failed={alltimeFailed} />
                <div className="historyBarChartWrapper">
                    <SelectableChildrenWithController defaultIndex={0} numControllerComponents={1}>
                        <SelectionController key={0} />
                        <ScrollableBarChart key={1} groupingTypeText="Daily" numBars={this.state.numBars} barWidth={100}
                            stats={this.state.historyStats.dayStats} tickFormatFunc={dayTickFormatter} />
                        <ScrollableBarChart key={2} groupingTypeText="Weekly" numBars={this.state.numBars} barWidth={100}
                            stats={this.state.historyStats.weekStats} tickFormatFunc={weekTickFormatter} />
                        <ScrollableBarChart key={3} groupingTypeText="Monthly" numBars={this.state.numBars} barWidth={100}
                            stats={this.state.historyStats.monthStats} tickFormatFunc={monthTickFormatter} />
                    </SelectableChildrenWithController>
                </div>
            </div>
        );
    }
}

// Some functions which build tick labels based on 'how far back' from today a label refers to, depending on bar width.
// These will be passed into the ScrollableBarCharts, which will use them to gneerate the ticks on their charts.
function dayTickFormatter(index, barWidth) {
    function large(index) {
        if (index === 0) {
            return "Today";
        }
        else if (index === 1) {
            return "Yesterday";
        }
        else {
            // Go back 'index' days from now, and generate a date string that just has 'day month'
            let now = new Date(Date.now());
            now.setDate(now.getDate() - index);
            return now.toLocaleDateString("en-GB", { weekday: 'short', day: 'numeric', month: 'short' });
        }
    }
    function medium(index) {
        if (index === 0) {
            return "Today";
        }
        else {
            let now = new Date(Date.now());
            now.setDate(now.getDate() - index);
            return now.toLocaleDateString("en-GB", { weekday: 'short', day: 'numeric' });
        }
    }
    function small(index) {
        let now = new Date(Date.now());
        now.setDate(now.getDate() - index);
        return now.toLocaleDateString("en-GB", { weekday: 'short' });
    }
    function verySmall(index) {
        let now = new Date(Date.now());
        now.setDate(now.getDate() - index);
        return now.toLocaleDateString("en-GB", { weekday: 'narrow' });
    }

    // Determine which size label to use, based on barWidth
    if (barWidth >= 60) {
        return large(index);
    }
    else if (barWidth >= 45) {
        return medium(index);
    }
    else if (barWidth >= 30) {
        return small(index);
    }
    else if (barWidth >= 20) {
        return verySmall(index);
    }
    else {
        return "";  // Bars are so narrow, there is no point trying to label anything anyway!
    }
}
function weekTickFormatter(index, barWidth) {
    function large(index) {
        if (index === 0) {
            return "This week";
        }
        else if (index === 1) {
            return "Last week";
        }
        else {
            // Go back 'index' weeks from now, and generate a date string that just has 'day month', for the monday of that week
            let now = new Date(Date.now());
            now.setDate(now.getDate() - (index * 7));
            now.setDate(now.getDate() - (now.getDay() - 1) % 7);
            return "Week of " + now.toLocaleDateString("en-GB", { day: 'numeric', month: 'short' });
        }
    }
    function medium(index) {
        if (index === 0) {
            return "This week";
        }
        else if (index === 1) {
            return "Last week";
        }
        else {
            let now = new Date(Date.now());
            now.setDate(now.getDate() - (index * 7));
            now.setDate(now.getDate() - (now.getDay() - 1) % 7);
            return now.toLocaleDateString("en-GB", { day: 'numeric', month: 'short' });
        }
    }
    function small(index) {
        let now = new Date(Date.now());
        now.setDate(now.getDate() - (index * 7));
        now.setDate(now.getDate() - (now.getDay() - 1) % 7);
        return now.toLocaleDateString("en-GB", { day: 'numeric', month: 'short' });
    }
    function verySmall(index) {
        let now = new Date(Date.now());
        now.setDate(now.getDate() - (index * 7));
        now.setDate(now.getDate() - (now.getDay() - 1) % 7);
        return now.toLocaleDateString("en-GB", { day: 'numeric', month: 'numeric' });
    }

    // Determine which size label to use, based on barWidth
    if (barWidth >= 90) {
        return large(index);
    }
    else if (barWidth >= 60) {
        return medium(index);
    }
    else if (barWidth >= 42) {
        return small(index);
    }
    else if (barWidth >= 35) {
        return verySmall(index);
    }
    else {
        return "";  // Bars are so narrow, there is no point trying to label anything anyway!
    }
}
function monthTickFormatter(index, barWidth) {
    function large(index) {
        if (index === 0) {
            return "This month";
        }
        else {
            // Go back 'index' weeks from now, and generate a date string that just has 'day month', for the monday of that week
            let now = new Date(Date.now());
            now.setMonth(now.getMonth() - index);
            return now.toLocaleDateString("en-GB", { month: 'long' });
        }
    }
    function medium(index) {
        // Go back 'index' weeks from now, and generate a date string that just has 'day month', for the monday of that week
        let now = new Date(Date.now());
        now.setMonth(now.getMonth() - index);
        return now.toLocaleDateString("en-GB", { month: 'short' });
    }
    function small(index) {
        // Go back 'index' weeks from now, and generate a date string that just has 'day month', for the monday of that week
        let now = new Date(Date.now());
        now.setMonth(now.getMonth() - index);
        return now.toLocaleDateString("en-GB", { month: 'narrow' });
    }

    // Determine which size label to use, based on barWidth
    if (barWidth >= 70) {
        return large(index);
    }
    else if (barWidth >= 30) {
        return medium(index);
    }
    else if (barWidth >= 20) {
        return small(index);
    }
    else {
        return "";  // Bars are so narrow, there is no point trying to label anything anyway!
    }
}

class SelectionController extends Component {
    render() {
        return (
            <div className="controllerBlock">
                <button onClick={() => this.props.indexToggleFunc(0)}> Daily </button>
                <button onClick={() => this.props.indexToggleFunc(1)}> Weekly </button>
                <button onClick={() => this.props.indexToggleFunc(2)}> Monthly </button>
            </div>
        );
    }
}