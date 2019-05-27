import React, { Component } from 'react';

export class Header extends Component {
    constructor(props) {
        super(props);

        this.signOut = this.signOut.bind(this);
    }

    signOut() {
        // Initiate a sign out, and then invoke the 'onSignedOut' callback which should take
        // the user back to the login screen.
        const signOutCallback = this.props.onSignOut;
        window.gapi.auth2.getAuthInstance().isSignedIn.listen(flag => {
            if (!flag) {
                signOutCallback();
            }
        });
        window.gapi.auth2.getAuthInstance().signOut();
    }

    render() {
        // Get access to the Google Auth api, in order to gain access to profile information
        const basicProfile = window.gapi.auth2.getAuthInstance().currentUser.get().getBasicProfile();

        return (
            <div className="Header">
                <div className="greetingText"> Hi, {basicProfile.getGivenName()} </div>
                <div className="signOutButton" onClick={this.signOut}>
                    <div> Sign out </div>
                    <img src={basicProfile.getImageUrl()} alt="Google account profile pic"/>
                </div>
            </div>
        );
    }
}