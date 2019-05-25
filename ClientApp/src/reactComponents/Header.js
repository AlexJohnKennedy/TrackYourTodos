import React, { Component } from 'react';
import { GoogleSignInButton } from './GoogleSignInButton';

export class Header extends Component {
    render() {
        return (
            <div className="Header">
                <h1> Track Your TODOs </h1>
                <GoogleSignInButton/>
            </div>
        );
    }
}