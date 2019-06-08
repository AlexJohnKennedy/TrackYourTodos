import React, { Component } from 'react';
import { GoogleSignInButton } from '../GoogleSignInButton';

// A simple page with a bog box, and a single Google sign in button.
export class LoginPage extends Component {
    render() {
        return (
            <div className="utilityPageBox">
                <div className="loginTitleText">
                    {this.props.titleText}
                </div>
                { this.props.googlePromptTextLarge !== null && this.props.googlePromptTextLarge !== undefined &&
                    <div className="googlePromptTextLarge">
                        {this.props.googlePromptTextLarge}
                    </div>
                }
                { this.props.googlePromptTextSmall !== null && this.props.googlePromptTextSmall !== undefined &&
                    <div className="googlePromptTextSmall">
                        {this.props.googlePromptTextSmall}
                    </div>
                }
                { this.props.useGoogleSignIn &&
                    <GoogleSignInButton
                        width={325}
                        height={60}
                        useLongTitle={true}
                        onSuccess={this.props.onGoogleLoginSuccess}
                        onFailure={this.props.onGoogleLoginFailure}
                    />
                }
            </div>
        );
    }
}