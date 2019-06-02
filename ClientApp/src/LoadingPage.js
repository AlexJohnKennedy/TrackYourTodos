import React, { Component } from 'react';

export class LoadingPage extends Component {
    render() {
        return (
            <div className="utilityPageBox"> NOW LOADING :O (dw i'll make this look nicer soon) </div>
        );
    }
}

export class ErrorPage extends Component {
    render() {
        return (
            <div className="utilityPageBox">
                <div className="ErrorPromptTextLarge">
                    {this.props.textLarge}
                </div>
                <div className="ErrorPromptTextSmall">
                    {this.props.textSmall}
                </div>
                <div className="ErrorMessage">
                    {this.props.errorMessage}
                </div>
            </div>
        );
    }
}