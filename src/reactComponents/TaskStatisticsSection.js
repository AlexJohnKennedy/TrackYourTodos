import React, { Component } from 'react';
import { RadialSummaryBlock } from './RadialSummaryBlock';
import { SelectableChildrenWithController } from './SelectableChildrenWithController';
import { ScrollableBarChart } from './ScrollableBarChart';
import { RegisterForStatisticsModel } from '../interactionLayer/viewLayerInteractionApi';
import { FlexibleXYPlot, YAxis } from 'react-vis/dist';


export class TaskStatisticsSection extends Component {
    constructor(props) {
        super(props);

        this.state = {
            statsObject: {
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
            }
        };

        this.handleChange = this.handleChange.bind(this);
    }
    componentDidMount() {
        this.statisticsModelApi = RegisterForStatisticsModel(this.handleChange, this.handleChange);
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

        this.setState({
            statsObject: stats
        });
    }
    
    render() {
        // One summary block for the last week, one for last month, and one for all time. (subject to change).
        let dayCompleted = 0;
        let dayFailed = 0;
        for (let i=0; i < 7; i++) {
            dayCompleted += this.state.statsObject.dayStats.numCompletedArray[i];
            dayFailed += this.state.statsObject.dayStats.numFailedArray[i];
        }
        const monthCompleted = this.state.statsObject.dayStats.totalCompleted;
        const monthFailed    = this.state.statsObject.dayStats.totalFailed;
        const alltimeCompleted = this.state.statsObject.alltimeStats.completedAggregate;
        const alltimeFailed = this.state.statsObject.alltimeStats.failedAggregate;

        return(
            <div className="TaskStatisticsSection">
                <RadialSummaryBlock titleText="Last 7 days" completed={dayCompleted} failed={dayFailed}/>
                <RadialSummaryBlock titleText="Last 30 days" completed={monthCompleted} failed={monthFailed}/>
                <RadialSummaryBlock titleText="All time"  completed={alltimeCompleted} failed={alltimeFailed}/>
                <div className="historyBarChartWrapper">
                <SelectableChildrenWithController defaultIndex={0} numControllerComponents={2}>
                    <SelectionController key={0}/>
                    <AxisContainer key={1}/>
                    <ScrollableBarChart key={2} groupingTypeText="Daily"/>
                    <ScrollableBarChart key={3} groupingTypeText="Weekly"/>
                    <ScrollableBarChart key={4} groupingTypeText="Monthly"/>
                </SelectableChildrenWithController>
                </div>
            </div>
        );
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

class AxisContainer extends Component {
    render() {
        return (
            <div className="axisContainer">
                <FlexibleXYPlot margin={{left:0, right:0, top:5, bottom:5}}>
                    <YAxis tickValues={[0, 1, 3, 4, 5]}/>
                </FlexibleXYPlot>
            </div>
        );
    }
}