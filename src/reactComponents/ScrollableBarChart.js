import React, { Component } from 'react';
import { XYPlot, FlexibleXYPlot, VerticalGridLines, HorizontalGridLines, XAxis, YAxis, VerticalRectSeries, VerticalBarSeries } from 'react-vis';

export class ScrollableBarChart extends Component {
    render() {
        return ( 
            <div className="barChartWrapper">
                <div className="subChartContainer">
                <FlexibleXYPlot margin={{left: 5, right: 5, top: 5, bottom: 2}} xDomain={[0, 5]} yDomain={[0, 10]}>
                    <VerticalBarSeries
                        yRange={[93, 0]}
                        color='green'
                        data={[
                            {x: 0, y: 10},
                            {x: 1, y: 3},
                            {x: 2, y: 5},
                            {x: 3, y: 0},
                            {x: 4, y: 6},
                            {x: 5, y: 6},
                            {x: 6, y: 2},
                            {x: 7, y: 9},
                            {x: 8, y: 1},
                            {x: 9, y: 6},
                            {x: 10, y: 10},
                        ]}
                        barWidth={0.975}
                    />
                </FlexibleXYPlot>
                </div>
                <div className="subChartContainer">
                <FlexibleXYPlot margin={{left: 5, right: 5, top: 2, bottom: 5}} xDomain={[0, 5]} yDomain={[0, 10]}>
                    <VerticalBarSeries
                        yRange={[0, 93]}
                        color='red'
                        data={[
                            {x: 0, y: 4},
                            {x: 1, y: 2},
                            {x: 2, y: 8},
                            {x: 3, y: 5},
                            {x: 4, y: 0},
                            {x: 5, y: 1},
                            {x: 6, y: 2},
                            {x: 7, y: 2},
                            {x: 8, y: 7},
                            {x: 9, y: 3},
                            {x: 10, y: 5},
                        ]}
                        barWidth={0.975}
                    />
                </FlexibleXYPlot>
                </div>
            </div>
        );
    }
}