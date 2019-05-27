import React, { Component } from 'react';

export class LoadingPage extends Component {
    render() {
        return (
            <div className="loadingPageBackground"> NOW LOADING :O (dw i'll make this look nicer soon) </div>
        );
    }
}

export class FailurePage extends Component {
    render() {
        return (
            <div className="failurePageBackground"> OH FUCK! Something went wrong over here :( ...try again later? </div>
        );
    }
}