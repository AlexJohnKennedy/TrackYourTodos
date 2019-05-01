import React, { Component } from 'react';
import { XYPlot, FlexibleXYPlot, VerticalGridLines, HorizontalGridLines, XAxis, YAxis, LineSeries, ArcSeries } from 'react-vis';

// This component is the building block for the 'summary' statistics section, which shows a
// radial graph and some numbers.
export class RadialSummaryBlock extends Component {
    render() {
        let angle;
        if (this.props.completed === 0) {
            angle = 0;
        }
        else if (this.props.failed === 0) {
            angle = 2 * Math.PI;
        }
        else {
            angle = 2 * Math.PI * this.props.completed / (this.props.completed + this.props.failed);
        }

        const data = [
            {angle0: 0, angle: angle, opacity: 1, radius: 70, radius0: 35}
        ];

        return (
            <div className="summaryBlockFlexContainer">
                <StatNums/>
                <div className="chartWrapper">
                    <FlexibleXYPlot margin={{left: 0, right: 0, top: 0, bottom: 0}} xDomain={[-87.5, 87.5]} yDomain={[-87.5, 87.5]}>
                    <ArcSeries
                        animation
                        radiusType={'literal'}
                        center={{x: 0, y: 0}}
                        data={data}
                        colorType={'literal'}/>
                    </FlexibleXYPlot>
                </div>
            </div>
        );
    }
}

export class StatNums extends Component {
    render() {
        return (
            <div className="statNums">
                MEMES
            </div>
        );
    }
}