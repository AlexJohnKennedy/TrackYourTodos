import React, { Component } from 'react';

const GOOGLE_BUTTON_ID = 'google-sign-in-button';

export class GoogleSignInButton extends Component {
    componentDidMount() {
        window.gapi.signin2.render(
            GOOGLE_BUTTON_ID,
            {
                width: this.props.width,
                height: this.props.height,
                onsuccess: this.props.onSuccess,
                onfailure: this.props.onFailure,
                scope: 'profile email openid',
                longtitle: this.props.useLongTitle
            },
        );
    }
    
    render() {
        return (
            <div id={GOOGLE_BUTTON_ID}/>
        );
    }
}