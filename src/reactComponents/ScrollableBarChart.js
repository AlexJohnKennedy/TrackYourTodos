import React, { Component } from 'react';
import { XYPlot, FlexibleXYPlot, VerticalGridLines, HorizontalGridLines, XAxis, YAxis, LineSeries, ArcSeries, VerticalBarSeries } from 'react-vis';

export class ScrollableBarChart extends Component {
    render() {
        return ( 
            <div className="barChartWrapper"> 
                <FlexibleXYPlot margin={{left: 5, right: 5, top: 5, bottom: 5}} xDomain={[0, 10]} yDomain={[0, 10]}>
                    <YAxis/>
                    <VerticalBarSeries
                        color='green'
                        data={[
                            {x: 0, y: 1},
                            {x: 1, y: 3},
                            {x: 2, y: 5},
                            {x: 3, y: 2}
                        ]}
                        barWidth={0.975}
                    />
                    
                </FlexibleXYPlot>
            </div>
        );
    }
}