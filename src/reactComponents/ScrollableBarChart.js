import React, { Component } from 'react';
import { XYPlot, FlexibleXYPlot, VerticalGridLines, HorizontalGridLines, XAxis, YAxis, VerticalRectSeries, VerticalBarSeries } from 'react-vis';

export class ScrollableBarChart extends Component {
    render() {
        let i=0;
        const completedData = this.props.stats.numCompletedArray.map(c => ({x: i++, y: c}));
        i=0;
        const failedData = this.props.stats.numFailedArray.map(f => ({x: i++, y: f}));
        
        console.log(completedData);
        console.log(failedData);

        return ( 
            <div className="barChartWrapper">
                <div className="subChartContainer" style={{width: this.props.barWidth * this.props.numBars}}>
                <FlexibleXYPlot margin={{left: 0, right: 0, top: 5, bottom: 2}} xDomain={[0, this.props.numBars-1]} yDomain={[0, 10]}>
                    <VerticalBarSeries
                        yRange={[93, 0]}
                        color='green'
                        data={completedData}
                        barWidth={0.95}
                    />
                </FlexibleXYPlot>
                </div>
                <div className="subChartContainer" style={{width: this.props.barWidth * this.props.numBars}}>
                <FlexibleXYPlot margin={{left: 0, right: 0, top: 2, bottom: 5}} xDomain={[0, this.props.numBars-1]} yDomain={[0, 10]}>
                    <VerticalBarSeries
                        yRange={[0, 93]}
                        color='red'
                        data={failedData}
                        barWidth={0.95}
                    />
                </FlexibleXYPlot>
                </div>
            </div>
        );
    }
}