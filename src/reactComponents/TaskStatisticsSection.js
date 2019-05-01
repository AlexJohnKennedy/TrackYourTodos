import React, { Component } from 'react';
import {RadialSummaryBlock } from './RadialSummaryBlock';
import { RegisterForStatisticsModel } from '../interactionLayer/viewLayerInteractionApi';


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
                <RadialSummaryBlock completed={dayCompleted} failed={dayFailed}/>
                <RadialSummaryBlock completed={monthCompleted} failed={monthFailed}/>
                <RadialSummaryBlock completed={alltimeCompleted} failed={alltimeFailed}/>
            </div>
        );
    }
}