import React, { Component } from 'react';
import { RadialSummaryBlock } from '../RadialSummaryBlock';
import { SelectableChildrenWithController } from '../SelectableChildrenWithController';
import { ScrollableBarChart } from '../ScrollableBarChart';

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
            startIndex: 0,
            stopIndex: 60,
            barWidth: 40
        };

        this.handleChange = this.handleChange.bind(this);
        this.adjustRange = this.adjustRange.bind(this);
        this.adjustBarWidth = this.adjustBarWidth.bind(this);
    }
    setupWithNewDataModelInstance() {
        // Register to access and receive updates from the statistics model in the Data-model scope handed to us from our parent.
        this.statisticsModelApi = this.props.dataModelScope.RegisterForStatisticsModel(this.handleChange, this.handleChange, this.handleChange);
        this.props.dataModelScope.RegisterForOnInitialDataLoadCallback(() => this.handleChange(null, null));
        this.props.dataModelScope.RegisterForOnDataRefreshCallback(() => this.handleChange(null, null));

        this.handleChange(null, null);
    }
    componentDidMount() {
        this.setupWithNewDataModelInstance();
    }
    componentDidUpdate(prevProps, prevState, snapshot) {
        if (prevProps.dataModelScope !== this.props.dataModelScope) {
            this.setupWithNewDataModelInstance();
        }
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
            days: this.state.stopIndex,
            weeks: this.state.stopIndex,
            months: this.state.stopIndex,
            years: 0,
            alltime: false
        });

        this.setState({
            statsObject: stats,
            historyStats: historyStats
        });
    }
    adjustRange(inc, start) {
        if (inc) {
            if (start && this.state.stopIndex > this.state.startIndex + 5) {
                this.setState({
                    startIndex: this.state.startIndex + 1
                });
            }
            else if (!start) {
                // There is the potential for the history stats to need a re-read. Lets check!
                if (this.state.stopIndex + 1 > this.state.historyStats.dayStats.numCompletedArray.length) {
                    const historyStats = this.statisticsModelApi.GetStatistics({
                        days: this.state.stopIndex + 1,
                        weeks: this.state.stopIndex + 1,
                        months: this.state.stopIndex + 1,
                        years: 0,
                        alltime: false
                    });
                    this.setState({
                        stopIndex: this.state.stopIndex + 1,
                        historyStats: historyStats
                    });
                }
                else {
                    this.setState({
                        stopIndex: this.state.stopIndex + 1
                    });
                }
            }
        }
        else {
            if (start && this.state.startIndex > 0) {
                this.setState({
                    startIndex: this.state.startIndex - 1
                });
            }
            else if (!start && this.state.stopIndex > this.state.startIndex + 5) {
                this.setState({
                    stopIndex: this.state.stopIndex - 1
                });
            }
        }
    }
    adjustBarWidth(event) {
        if (event.target.value === null || event.target.value === this.state.barWidth) {
            return;
        }
        this.setState({ barWidth: event.target.value });
    }

    render() {
        // One summary block for the last week, one for last month, and one for all time. (subject to change).
        let dayCompleted = 0;
        let dayFailed = 0;
        const len = Math.min(7, this.state.statsObject.dayStats.numCompletedArray.length, this.state.statsObject.dayStats.numFailedArray.length);
        for (let i = 0; i < len; i++) {
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
                        <SelectionController key={0} startIndex={this.state.startIndex} stopIndex={this.state.stopIndex}
                            startincrement={() => this.adjustRange(true, true)} stopincrement={() => this.adjustRange(true, false)}
                            startdecrement={() => this.adjustRange(false, true)} stopdecrement={() => this.adjustRange(false, false)}
                            minBarWidth={15} maxBarWidth={70} handleBarWidthChange={this.adjustBarWidth} barWidth={this.state.barWidth} />
                        <ScrollableBarChart key={1} groupingTypeText="Daily" stopIndex={this.state.stopIndex} startIndex={this.state.startIndex} barWidth={this.state.barWidth}
                            stats={this.state.historyStats.dayStats} tickFormatFunc={dayTickFormatter} />
                        <ScrollableBarChart key={2} groupingTypeText="Weekly" stopIndex={this.state.stopIndex} startIndex={this.state.startIndex} barWidth={this.state.barWidth}
                            stats={this.state.historyStats.weekStats} tickFormatFunc={weekTickFormatter} />
                        <ScrollableBarChart key={3} groupingTypeText="Monthly" stopIndex={this.state.stopIndex} startIndex={this.state.startIndex} barWidth={this.state.barWidth}
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
            <div className="groupingControllerBlock">
                <div className="button" title="Group chart by day" onClick={() => this.props.indexToggleFunc(0)}> Days </div>
                <div className="button" title="Group chart by week" onClick={() => this.props.indexToggleFunc(1)}> Weeks </div>
                <div className="button" title="Group chart by month" onClick={() => this.props.indexToggleFunc(2)}> Months </div>
                <Slider min={this.props.minBarWidth} max={this.props.maxBarWidth} value={this.props.barWidth} step={1} onChange={this.props.handleBarWidthChange} text="Zoom" />
            </div>
        );
    }
}

//class SelectionControllerOLD extends Component {
//    render() {
//        let startText;
//        let endText;
//        if (this.props.currentIndex === 0) {
//            startText = "Start day";
//            endText = "End day"
//        }
//        else if (this.props.currentIndex === 1) {
//            startText = "Start week";
//            endText = "End week";
//        }
//        else {
//            startText = "Start month";
//            endText = "End month";
//        }
//
//        return (
//            <div className="groupingControllerBlock">
//                <div className="title"> Group by: </div>
//                <button onClick={() => this.props.indexToggleFunc(0)}> Day </button>
//                <button onClick={() => this.props.indexToggleFunc(1)}> Week </button>
//                <button onClick={() => this.props.indexToggleFunc(2)}> Month </button>
//                <div className="rangeSelectors">
//                    <RangeSelectionBlock text={startText} value={this.props.startIndex} increment={this.props.startincrement} decrement={this.props.startdecrement} />
//                    <RangeSelectionBlock text={endText} value={this.props.stopIndex} increment={this.props.stopincrement} decrement={this.props.stopdecrement} />
//                </div>
//                <Slider min={this.props.minBarWidth} max={this.props.maxBarWidth} value={this.props.barWidth} step={1} onChange={this.props.handleBarWidthChange} text="Zoom" />
//            </div>
//        );
//    }
//}

//class RangeSelectionBlock extends Component {
//    render() {
//        return (
//            // TODO: Make the button look less shit, and implement a 'hold down' rapid increment and decrement ability
//            <div>
//                <button onClick={this.props.increment}> + </button>
//                <div> {this.props.value} </div>
//                <button onClick={this.props.decrement}> - </button>
//                <div className="text"> {this.props.text} </div>
//            </div>
//        );
//    }
//}

class Slider extends Component {
    render() {
        return (
            <div className="slider">
                <input type="range" min={this.props.min} max={this.props.max} value={this.props.value} step={this.props.step} onChange={this.props.onChange} />
                <div className="text"> {this.props.text} </div>
            </div>
        );
    }
}