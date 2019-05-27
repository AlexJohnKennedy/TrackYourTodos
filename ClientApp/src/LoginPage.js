import React, { Component } from 'react';
import { GoogleSignInButton } from './reactComponents/GoogleSignInButton';

// A simple page with a bog box, and a single Google sign in button.
export class LoginPage extends Component {
    render() {
        return (
            <div className="loginBackground">
                <div className="loginBox">
                    <div className="loginTitleText">
                        { this.props.titleText }
                    </div>
                    <GoogleSignInButton
                        width={400}
                        height={100}
                        useLongTitle={true}
                        onSuccess={this.props.onGoogleLoginSuccess}
                        onFailure={this.props.onGoogleLoginFailure}
                    />
                </div>
            </div>
        );
    }
}