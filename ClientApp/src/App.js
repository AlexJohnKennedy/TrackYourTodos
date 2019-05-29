import React, { Component } from 'react';
import './css/App.css';
import '../node_modules/react-vis/dist/style.css';
import { AppPage } from './AppPage';
import { LoadingPage } from './LoadingPage';
import { LoginPage } from './LoginPage';

class App extends Component {
  constructor(props) {
    super(props);

    // Setup state which we will use for session-based routing.
    // If the google authentication library is not loaded yet, we will route to a 'loading' screen with some animation or something.
    // If the google authentication library IS loaded, but the user is not logged in, then we will route to a sign up page which just displas the google sign in button
    // Finally, if the user IS logged in, then we will route to the actual application page, until they press logout.
    this.state = {
      googleAuthApiLoaded: false,
      googleAuthApiCrashed: false,
      googleUserIsLoggedIn: false
    }

    this.respondToGapiLoad = this.respondToGapiLoad.bind(this);
    this.setGoogleSignedIn = this.setGoogleSignedIn.bind(this);
    this.setGoogleSignedOut = this.setGoogleSignedOut.bind(this);
    this.handleGoogleLoginFailure = this.handleGoogleLoginFailure.bind(this);
  }

  componentDidMount() {
    console.log("Application is mounting!");

    // Register to receive a callback when google auth loads up. Doing this before polling the load, so that weird races don't happen.
    window.registerForGapiLoadedCallback(this.respondToGapiLoad);

    // Check if the Google authentication API is loaded yet. If it isn't, trigger a load.
    if (!window.isGoogleAuthReady && !window.isGoogleAuthCrashed) {
      console.log("Google authentication api is not loaded! Routing to the loading page, and waiting for load");
    }
    else if (window.isGoogleAuthReady) {
      console.log("Google auth api was already loaded and setup by the time we mounted :O");
      this.setState({
        googleAuthApiLoaded: true,
        googleAuthApiCrashed: false
      });
    }
    else {
      console.log("Google auth api had already crashed before the app mounted");
      this.setState({
        googleAuthApiLoaded: false,
        googleAuthApiCrashed: true
      });
    }
  }

  respondToGapiLoad(successful) {
    if (this.state.googleAuthApiLoaded || this.state.googleAuthApiCrashed) return;

    if (successful) {
      console.log("I am the App component, and I was just told via a callback that the google Authentication api is ready! I will now route to either the sign in or the app page");
      this.setState({
        googleAuthApiLoaded: true,
        googleAuthApiCrashed: false
      });
    }
    else {
      this.setState({
        googleAuthApiLoaded: false,
        googleAuthApiCrashed: true
      });
    }
  }

  // These callbacks will be passed down to child elements so that they can trigger a re-render of a different page
  // if a user signs in or out; for example if they sign in on the sign in page.
  setGoogleSignedIn(GoogleUserObj) {
    const googleIdToken = GoogleUserObj.getAuthResponse().id_token;   // This should be sent with AJAX as a header, (HTTPS only!!)

    console.log(GoogleUserObj.getBasicProfile());
    console.log(GoogleUserObj.getBasicProfile().getId());

    // Store the token in local storage, so it can be accessed later.
    window.localStorage.setItem("googleIdToken", googleIdToken);

    // TODO: Schedule a token refresh request every 55 minutes, so that we stay logged in longer than that!

    this.setState({
      googleAuthApiLoaded: true,
      googleUserIsLoggedIn: true
    });
  }
  setGoogleSignedOut() {
    // Remove the saved google id token from local storage.
    window.localStorage.removeItem("googleIdToken");

    // TODO: Cancel the shceduled token refresh operation here.

    this.setState({
      googleUserIsLoggedIn: false
    });
  }
  handleGoogleLoginFailure() {
    // For now, we will just log the error for dev purposes and do nothing.
    console.log("A google sign-in attempt failed! This typically means the user closed the popup or denied the permissions.");
  }

  render() {
    let PageToRender;

    if (!this.state.googleAuthApiLoaded && !this.state.googleAuthApiCrashed) {
      PageToRender = <LoadingPage />;
    }
    else if (this.state.googleAuthApiCrashed) {
      PageToRender = <LoginPage
        titleText="Sign in to start holding yourself accountable to your inevitable failures and laziness!" onGoogleLoginSuccess={() => {}} onGoogleLoginFailure={() => {}}
        useGoogleSignIn={false} googlePromptTextLarge={"Oops!"} googlePromptTextSmall={"Google sign in couldn't load. Make sure you have 3rd party cookies enabled in your browser, and give it another shot."}
      />;
    }
    else if (!this.state.googleUserIsLoggedIn) {
      PageToRender = <LoginPage 
        titleText="Sign in to start holding yourself accountable to your inevitable failures and laziness!" onGoogleLoginSuccess={this.setGoogleSignedIn} onGoogleLoginFailure={this.handleGoogleLoginFailure} 
        useGoogleSignIn={true} googlePromptTextLarge={null} googlePromptTextSmall={null}
      />;
    }
    else {
      PageToRender = <AppPage onSignOut={this.setGoogleSignedOut} />;
    }

    return (
      <> {PageToRender} </>
    );
  }
}

export default App;