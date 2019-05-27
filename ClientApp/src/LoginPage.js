import React, { Component } from 'react';
import { GoogleSignInButton } from './reactComponents/GoogleSignInButton';

// A simple page with a bog box, and a single Google sign in button.
export class LoginPage extends Component {
    render() {
        return (
            <div className="loginBox">
                <div className="loginTitleText">
                    {this.props.titleText}
                </div>
                <GoogleSignInButton
                    width={325}
                    height={60}
                    useLongTitle={true}
                    onSuccess={this.props.onGoogleLoginSuccess}
                    onFailure={this.props.onGoogleLoginFailure}
                />
            </div>
        );
    }
}