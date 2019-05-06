import React, { Component } from 'react';
import { FlexibleXYPlot, VerticalBarSeries, XAxis, YAxis } from 'react-vis';

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
            <>
            <AxisContainer range={max}/>
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
            </>
        );
    }
}

class AxisContainer extends Component {
    render() {
        // Spread tick values over the [-range, range]
        const tickVals = [];
        for (let i = -this.props.range; i <= this.props.range; i++) {
            tickVals.push(i);
        }

        console.log(tickVals);

        return (
            // This is a hacky div containing only axes. The 'right' oriented axis is used to make the line and ticks appear
            // on the far right of the container, and the 'left' oriented axis has invisible lines, but makes the labels
            // appear with the correct label orientation. The negative padding is to move the labels over to the right, becuase the
            // axis they are attached to appear on the left of the box, and the labels (by default) on the left of that.. since it is
            // a 'left' orientated axis!
            <div className="axisContainer">
                <FlexibleXYPlot margin={{ left: 0, right: 0, top: 5, bottom: 13 }}>
                    <VerticalBarSeries opacity={0} data={[{ x: 0, y: this.props.range }]} />
                    <YAxis orientation="right" tickValues={tickVals} tickFormat={v => tickVals[v]} />
                    <YAxis orientation="left" tickValues={tickVals} tickFormat={v => tickVals[v]} tickPadding={-20} hideLine tickSize={0} />
                </FlexibleXYPlot>
            </div>
        );
    }
}