import React, { Component } from 'react';
import './css/App.css';
import '../node_modules/react-vis/dist/style.css';
import { ActiveTaskSection } from './reactComponents/ActiveTaskSection';
import { TaskStatisticsSection } from './reactComponents/TaskStatisticsSection';
import { BacklogSection } from './reactComponents/BacklogSection';
import { TemporaryStateManager } from './viewLogic/temporaryStateManager';
import { ShortCutManager } from './viewLogic/keyboardShortcutHandler';
import { ThemeId, currThemeId } from './viewLogic/colourSetManager';
import { Footer } from './reactComponents/Footer';
import { Header } from './reactComponents/Header';
import { DataEventHttpPostHandlers } from './interactionLayer/ajaxDataModel/ajaxDataEventPoster';
import { RegisterForDataEvents } from './interactionLayer/viewLayerInteractionApi';
import { loadscript } from './asyncScriptLoader';

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
      googleUserIsLoggedIn: false
    }
  }

  componentDidMount() {
    console.log("Application is mounting!");
    
    // Check if the Google authentication API is loaded yet. If it isn't, trigger a load.
    if (!window.gapi) {
      console.log("Google authentication api is not loaded! Routing to the loading page, and waiting for load");
      this.loadGoogleApiScriptThenLoadAuthThenInitAuth();
    }
    window.BOOP();
  }
  
  render() {
    return (
      // For now, no routing is actually occuring
      <AppPage/>
    );
  }
}

export default App;

// A wrapper for the application 'page' itself, which will be rendered by react-router
class AppPage extends Component {
  componentDidMount() {
    // Create a temporary state context for creation forms
    this.formStateManager = TemporaryStateManager();
    this.cleanUpFormStates = this.cleanUpFormStates.bind(this);

    // Access the global keyboard shortcut manager, and register the form cleanup function as 'esc' key.
    ShortCutManager.registerShortcut('Escape', this.cleanUpFormStates);
  }
  componentWillUnmount() {
    // Short cuts should only be active while the application page is mounted/rendered.
    ShortCutManager.clearAllShortcuts();
  }

  cleanUpFormStates() {
    this.formStateManager.triggerCleanup();
  }

  render() {
    return (
      // Return each 'section' of the app as siblings, so that the root div can arrange them using CSS Grid!
      <ThemeId.Provider value={{ themeId: currThemeId }}>
        <Header/>
        <BacklogSection formStateManager={this.formStateManager}/>
        <ActiveTaskSection formStateManager={this.formStateManager}/>
        <TaskStatisticsSection formStateManager={this.formStateManager}/>
        <Footer/>
      </ThemeId.Provider>
    );
  }
}