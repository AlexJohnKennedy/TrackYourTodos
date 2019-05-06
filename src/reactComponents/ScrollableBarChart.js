import React, { Component } from 'react';
import { FlexibleXYPlot, VerticalBarSeries, XAxis } from 'react-vis';

export class ScrollableBarChart extends Component {
    render() {
        let max = 0;
        let i=0;
        const completedData = this.props.stats.numCompletedArray.map(c => {
            if (c > max) max = c;
            return {x: i++, y: c};
        });
        i=0;
        const failedData = this.props.stats.numFailedArray.map(f => {
            if (f > max) max = f;
            return {x: i++, y: f}
        });

        if (max < 5) max = 5;   // Don't ever have a range less than five

        // Define an array for all of the points which should have a little 'tick' in the center.
        const centralTickVals = [];
        for (let j=0; j<this.props.numBars; j++) centralTickVals.push(j+0.5);

        function tickFormatter(index, formatFunc, barWidth) {
            // Hide ticks for indexes which are not whole numbers.
            if (Math.floor(index) !== index) return "";
            // else return the result of a passed-in formatting func, which ofc creates little date strings depending on which type of grouping
            else return formatFunc(index, barWidth);
        }

        return ( 
            <div className="barChartWrapper">
                <div className="subChartContainer" style={{width: this.props.barWidth * this.props.numBars}}>
                <FlexibleXYPlot margin={{left: 0, right: 0, top: 5, bottom: 2}} xDomain={[0, this.props.numBars-1]} yDomain={[0, max]}>
                    <VerticalBarSeries
                        yRange={[93, 0]}
                        color='green'
                        data={completedData}
                        barWidth={0.95}
                    />
                    <XAxis hideLine orientation="bottom" tickSize={3} tickValues={centralTickVals}/>
                </FlexibleXYPlot>
                </div>
                <div className="subChartContainer" style={{width: this.props.barWidth * this.props.numBars}}>
                <FlexibleXYPlot margin={{left: 0, right: 0, top: 2, bottom: 5}} xDomain={[0, this.props.numBars-1]} yDomain={[0, max]}>
                    <VerticalBarSeries
                        yRange={[0, 93]}
                        color='red'
                        data={failedData}
                        barWidth={0.95}
                    />
                    <XAxis hideLine orientation="top" tickSize={3} tickValues={centralTickVals}/>
                    <XAxis hideLine tickSize={0} tickPadding={-10} tickFormat={(index) => tickFormatter(index, this.props.tickFormatFunc, this.props.barWidth)}/>
                </FlexibleXYPlot>
                </div>
            </div>
        );
    }
}