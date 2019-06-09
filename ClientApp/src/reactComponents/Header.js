import React, { Component } from 'react';

export class Header extends Component {
    render() {
        // Get access to the Google Auth api, in order to gain access to profile information
        const basicProfile = window.gapi.auth2.getAuthInstance().currentUser.get().getBasicProfile();
        const capitaliseFirstLetter = s => s.charAt(0).toUpperCase() + s.slice(1);

        return (
            <div className="Header">
                <div className="context"> Current context: {capitaliseFirstLetter(this.props.currentContext)} </div>
                <div className="userDetails">
                    <div className="greetingText"> Hi, {basicProfile.getGivenName()} </div>
                    <div className="signOutButton" onClick={this.props.onSignOut}>
                        <div> Sign out </div>
                        <img src={basicProfile.getImageUrl()} alt="Google account profile pic"/>
                    </div>
                </div>
            </div>
        );
    }
}