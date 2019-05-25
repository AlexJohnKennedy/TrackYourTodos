import React, { Component } from 'react';

const GOOGLE_BUTTON_ID = 'google-sign-in-button';

export class GoogleSignInButton extends Component {
    componentDidMount() {
        window.gapi.signin2.render(
            GOOGLE_BUTTON_ID,
            {
                width: 200,
                height: 50,
                onsuccess: this.onSuccess,
            },
        );
    }
    onSuccess(googleUser) {
        const profile = googleUser.getBasicProfile();
        console.log("Name: " + profile.getName());
    }
    onFailure() {
        console.log("Oops! Something failed :(");
    }
    render() {
        return (
            <div id={GOOGLE_BUTTON_ID}/>
        );
    }
}