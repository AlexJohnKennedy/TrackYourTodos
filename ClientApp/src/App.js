import React, { Component } from 'react';
import './css/App.css';
import '../node_modules/react-vis/dist/style.css';
import { DataEventHttpPostHandlers } from './interactionLayer/ajaxDataModel/ajaxDataEventPoster';
import { RegisterForDataEvents } from './interactionLayer/viewLayerInteractionApi';
import { AppPage } from './AppPage';
import { LoadingPage, FailurePage } from './LoadingPage';
import { LoginPage } from './LoginPage';

class App extends Component {
  constructor(props) {
    super(props);

    // Register to POST our data events to the server
    RegisterForDataEvents(DataEventHttpPostHandlers);

    // Setup state which we will use for session-based routing.
    // If the google authentication library is not loaded yet, we will route to a 'loading' screen with some animation or something.
    // If the google authentication library IS loaded, but the user is not logged in, then we will route to a sign up page which just displas the google sign in button
    // Finally, if the user IS logged in, then we will route to the actual application page, until they press logout.
    this.state = {
      googleAuthApiLoaded: false,
      googleUserIsLoggedIn: false,
      googleLoginFailed: false
    }

    this.respondToGapiLoad = this.respondToGapiLoad.bind(this);
    this.setGoogleSignedIn = this.setGoogleSignedIn.bind(this);
    this.setGoogleSignedOut = this.setGoogleSignedOut.bind(this);
    this.setLoginFailureFlag = this.setLoginFailureFlag.bind(this);
  }

  componentDidMount() {
    console.log("Application is mounting!");

    // Register to receive a callback when google auth loads up. Doing this before polling the load, so that weird races don't happen.
    window.registerForGapiLoadedCallback(this.respondToGapiLoad);

    // Check if the Google authentication API is loaded yet. If it isn't, trigger a load.
    if (!window.isGoogleAuthReady) {
      console.log("Google authentication api is not loaded! Routing to the loading page, and waiting for load");
    }
    else {
      console.log("Google auth api was already loaded and setup by the time we mounted :O");
      this.setState({
        googleAuthApiLoaded: true
      });
    }
  }

  respondToGapiLoad() {
    if (this.state.googleAuthApiLoaded) return;
    console.log("I am the App component, and I was just told via a callback that the google Authentication api is ready! I will now route to either the sign in or the app page");
    this.setState({
      googleAuthApiLoaded: true
    });
  }

  // These callbacks will be passed down to child elements so that they can trigger a re-render of a different page
  // if a user signs in or out; for example if they sign in on the sign in page.
  setGoogleSignedIn() {
    this.setState({
      googleAuthApiLoaded: true,
      googleUserIsLoggedIn: true
    });
  }
  setGoogleSignedOut() {
    console.debug("Signed out!");
    console.debug(window.gapi.auth2.getAuthInstance().isSignedIn.get());
    this.setState({
      googleUserIsLoggedIn: false
    });
  }
  setLoginFailureFlag() {
    this.setState({
      googleLoginFailed: true
    });
  }

  render() {
    let PageToRender;
    
    if (this.state.googleLoginFailed) {
      PageToRender = <FailurePage/>
    }
    else if (!this.state.googleAuthApiLoaded) {
      PageToRender = <LoadingPage/>;
    }
    else if (!this.state.googleUserIsLoggedIn) {
      PageToRender = <LoginPage titleText="Sign in to start holding yourself accountable to your inevitable failures and laziness!" onGoogleLoginSuccess={this.setGoogleSignedIn} onGoogleLoginFailure={this.setLoginFailureFlag}/>;
    }
    else {
      PageToRender = <AppPage onSignOut={this.setGoogleSignedOut}/>;
    }

    return (
      <> {PageToRender} </>
    );
  }
}

export default App;