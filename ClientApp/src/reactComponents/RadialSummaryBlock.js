import React, { Component } from 'react';
import { FlexibleXYPlot, ArcSeries } from 'react-vis';

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
            {angle0: 0, angle: angle, opacity: 0.5, radius: 70, radius0: 35, color: "#169c1b"},
            {angle0: angle, angle: 2*Math.PI, opacity: 1, radius: 70, radius0: 35, color: "#333333"}
        ];

        return (
            <div className="RadialSummaryBlock">
                <div className="titleBlock">
                    {this.props.titleText}
                </div>
                <div className="summaryBlockFlexContainer">
                    <StatNums
                        completed={this.props.completed}
                        failed={this.props.failed}
                    />
                    <div className="chartWrapper">
                        <FlexibleXYPlot 
                            margin={{left: 0, right: 0, top: 0, bottom: 0}} 
                            xDomain={[-87.5, 87.5]} 
                            yDomain={[-87.5, 87.5]}
                            colorDomain={[0, 2*Math.PI]}
                            color="#169c1b">
                        <ArcSeries
                            animation
                            radiusType={'literal'}
                            center={{x: 0, y: 0}}
                            data={data}
                            colorType={'literal'}/>
                        </FlexibleXYPlot>
                    </div>
                </div>
            </div>
        );
    }
}

export class StatNums extends Component {
    render() {
        let percentage = 0;
        if (this.props.failed !== 0 || this.props.completed !== 0) {
            percentage = Math.floor(100 * this.props.completed / (this.props.failed + this.props.completed));
        }
        return (
            <div className="statNums">
                <div>
                    {percentage}%
                </div>
                <div>
                    {this.props.completed}/{this.props.completed + this.props.failed}
                </div>
            </div>
        );
    }
}