import React, { Component } from 'react';

export class RetryPostToast extends Component {
    render() {
        return (
            <div className="postErrorPopup">
                <div className="text"> <p>A Server error ocurred! Your changes may not have saved</p> </div>
                <div className="button" onClick={this.props.clickAction}> Retry </div>
            </div>
        );
    }
}