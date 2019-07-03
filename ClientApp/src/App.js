import React, { Component } from 'react';
import './css/App.css';
import '../node_modules/react-vis/dist/style.css';
import { AppPage } from './reactComponents/PagesAndDataProviders/AppPage';
import { LoadingPage, ErrorPage } from './reactComponents/PagesAndDataProviders/LoadingPage';
import { LoginPage } from './reactComponents/PagesAndDataProviders/LoginPage';

// Setters for application-level handlers for AJAX and Network errors. E.g. token expired, GET or POST failure, Authorization failed.
import { setIdTokenRefreshFunction, setServerFailureAction, setAuthFailureHandler, setUnknownErrorAction } from './interactionLayer/ajaxDataModules/ajaxErrorcaseHandlers';
import { InstantiateNewFailedEventCacheScope } from './interactionLayer/ajaxDataModules/ajaxFailedEventCache';
import { RetryPostingFailedEvents } from './interactionLayer/ajaxDataModules/ajaxDataEventPoster';

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
      googleUserIsLoggedIn: false,
      errorOccurred: false,
      errorMessage: "",
      ajaxFailedEventCacheInstance: null
    }

    this.respondToGapiLoad = this.respondToGapiLoad.bind(this);
    this.setGoogleSignedIn = this.setGoogleSignedIn.bind(this);
    this.setGoogleSignedOut = this.setGoogleSignedOut.bind(this);
    this.handleGoogleLoginFailure = this.handleGoogleLoginFailure.bind(this);
    this.signUserOut = this.signUserOut.bind(this);
    this.setErrorPage = this.setErrorPage.bind(this);
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
      
      // Setup a listener for global sign-in/sign-out events. This means our app will respond even if another tab signs us out, or in!
      window.gapi.auth2.getAuthInstance().isSignedIn.listen(justSignedIn => {
        console.log("GOOGLE API: Sign-in state listener triggered! The sign in state just changed to " + justSignedIn);
        if (justSignedIn) {
          console.log("User just signed in: Name is" + window.gapi.auth2.getAuthInstance().currentUser.get().getBasicProfile().getName());
          // User just signed in!
          this.setGoogleSignedIn(window.gapi.auth2.getAuthInstance().currentUser.get());
        }
        else {
          console.log("===> User just signed out <===");
          // User just signed out.
          this.setGoogleSignedOut();
        }
      });
      
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

  // These callbacks can be passed down to child elements so that they can trigger a re-render of a different page
  // if a user signs in or out; for example if they sign in on the sign in page.
  setGoogleSignedIn(GoogleUserObj) {
    const googleIdToken = GoogleUserObj.getAuthResponse().id_token;   // This should be sent with AJAX as a header, (HTTPS only!!)

    console.log(GoogleUserObj.getBasicProfile());
    console.log(GoogleUserObj.getBasicProfile().getId());

    // Store the token in local storage, so it can be accessed later.
    window.localStorage.setItem("googleIdToken", googleIdToken);

    // Since a new user has logged in, we will need to provide the app with a fresh 'failed event cache', which will not contain
    // any left-over events from the previous user. We are constructing it here (above the AppPage component) because it should
    // persist across context sessions, even if the user rebuilds the AppPage state. It should only clear if the user logs out,
    // and only then, after the cache has triggered!
    const ajaxFailedEventCacheInstance = InstantiateNewFailedEventCacheScope();

    // Schedule a token refresh request for the time at which the current id_token expires, so that we stay logged in.
    const expiresInSeconds = GoogleUserObj.getAuthResponse(false).expires_in;
    const action = (refreshedAuthResponse) => {
      let newcanceltoken = window.setTimeout(() => refreshUserToken(GoogleUserObj, action), refreshedAuthResponse.expires_in*1000 - 5000);
      setCancellationToken(newcanceltoken);
    };
    cancelTokenRefresh();   // Cancel previous scheduled refreshes whenever we schedule a new one.
    let scheduledTokenRefresh = window.setTimeout(() => refreshUserToken(GoogleUserObj, action), expiresInSeconds*1000 - 5000);
    setCancellationToken(scheduledTokenRefresh);

    // Setup the error handling actions on the Ajax sub-system so that AJAX can force a token refresh if required, and so on.
    setIdTokenRefreshFunction((onCompleted) => {
      refreshUserToken(GoogleUserObj, (throwAwayAuthResponse) => onCompleted());
    });
    setAuthFailureHandler((message) => {
      console.warn("Authentication Failure occurred.");
      this.signUserOut();
    });
    setServerFailureAction((message) => {
      console.warn("Server failure action invoked.");
      this.setErrorPage(message);
    });
    setUnknownErrorAction(() => {
      console.warn("App is triggering the 'unknown error' action. Often this is a timeout occurrance.");
      this.setErrorPage("Hmm... things don't seem to be working. Maybe... try turning it off and on again?");
    });

    this.setState({
      googleAuthApiLoaded: true,
      googleUserIsLoggedIn: true,
      ajaxFailedEventCacheInstance: ajaxFailedEventCacheInstance,
      userId: GoogleUserObj.getBasicProfile().getId() // Used by the app page to save selected and available contexts into localstorage, for temp consistency
    });
  }

  setErrorPage(message) {
    this.setState({
      errorOccurred: true,
      errorMessage: message
    });
  }
  signUserOut() {
    // Trigger 'failed event cache send' here, which triggers if and only if the queue is not empty. This happens before the sign
    // out is triggered, as a last ditch effort to save the user's data.
    if (!this.state.ajaxFailedEventCacheInstance.IsEmpty()) {
      RetryPostingFailedEvents(this.state.ajaxFailedEventCacheInstance);
    }

    window.gapi.auth2.getAuthInstance().signOut();
  }
  setGoogleSignedOut() {
    // Remove the saved google id token from local storage.
    window.localStorage.removeItem("googleIdToken");

    // Cancel auto-refresh
    cancelTokenRefresh();

    // Clear the set 'refresh action on the Ajax sub-system
    setIdTokenRefreshFunction(null);

    this.setState({
      googleUserIsLoggedIn: false,
      ajaxFailedEventCacheInstance: null
    });
  }
  handleGoogleLoginFailure() {
    // For now, we will just log the error for dev purposes and do nothing.
    console.warn("A google sign-in attempt failed! This typically means the user closed the popup or denied the permissions.");
  }

  render() {
    let PageToRender;

    if (this.state.errorOccurred) {
      PageToRender = <ErrorPage textLarge={"Oops!"} textSmall={"Something went wrong :("} errorMessage={this.state.errorMessage} />;
    }
    else if (!this.state.googleAuthApiLoaded && !this.state.googleAuthApiCrashed) {
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
      PageToRender = <AppPage userId={this.state.userId} onSignOut={this.signUserOut} failedEventCacheInstance={this.state.ajaxFailedEventCacheInstance}/>;
    }

    return (
      <> {PageToRender} </>
    );
  }
}

export default App;

function refreshUserToken(GoogleUserObj, actionOnCompletion) {
  console.log("STARTING TO REFRESH TOKEN");
  GoogleUserObj.reloadAuthResponse().then(refreshedAuthResponse => {
    window.localStorage.setItem("googleIdToken", refreshedAuthResponse.id_token);
    actionOnCompletion(refreshedAuthResponse);
  });
}
let cancellationToken = null;
function setCancellationToken(t) {
  console.log("new scheduled id job token was recieved: " + t);
  cancellationToken = t;
}
function cancelTokenRefresh() {
  console.log("Cancelling scheduled id token update job: " + cancellationToken + ". A user probably just logged in or out.")
  if (cancellationToken !== null) {
    window.clearTimeout(cancellationToken);
  }
}