import React, { Component } from 'react';
import './css/App.css';
import { ActiveTaskSection } from './reactComponents/ActiveTaskSection';
import { TaskStatisticsSection } from './reactComponents/TaskStatisticsSection';
import { BacklogSection } from './reactComponents/BacklogSection';
import { TemporaryStateManager } from './viewLogic/temporaryStateManager';
import { ShortCutManager } from './viewLogic/keyboardShortcutHandler';
import { ThemeId, currThemeId } from './viewLogic/colourSetManager';
import { Footer } from './reactComponents/Footer';
import { DataEventHandlers, DataEventSerialisationHandlers } from './interactionLayer/dataEventLogger';
import { RegisterForDataEvents } from './interactionLayer/viewLayerInteractionApi';

class App extends Component {
  constructor(props) {
    super(props);

    // Register the logger to receive data event updates sent from the view-layer triggers.
    // RegisterForDataEvents(DataEventHandlers);
    RegisterForDataEvents(DataEventSerialisationHandlers);

    // For development purposes, log change events
    // LogDummyDataEventObjects();

    // Create a temporary state context for creation forms
    this.formStateManager = TemporaryStateManager();
    this.cleanUpFormStates = this.cleanUpFormStates.bind(this);

    // Access the global keyboard shortcut manager, and register the form cleanup function as 'esc' key.
    ShortCutManager.registerShortcut('Escape', this.cleanUpFormStates);
  }

  cleanUpFormStates() {
    this.formStateManager.triggerCleanup();
  }
  
  render() {
    return (
      // Return each 'section' of the app as siblings, so that the root div can arrange them using CSS Grid!
      <ThemeId.Provider value={{ themeId: currThemeId }}>
        <BacklogSection formStateManager={this.formStateManager}/>
        <ActiveTaskSection formStateManager={this.formStateManager}/>
        <TaskStatisticsSection formStateManager={this.formStateManager}/>
        <Footer/>
      </ThemeId.Provider>
    );
  }
}

export default App;