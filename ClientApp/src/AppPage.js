import React, { Component } from 'react';
import { ActiveTaskSection } from './reactComponents/ActiveTaskSection';
import { TaskStatisticsSection } from './reactComponents/TaskStatisticsSection';
import { BacklogSection } from './reactComponents/BacklogSection';
import { Footer } from './reactComponents/Footer';
import { Header } from './reactComponents/Header';

import { TemporaryStateManager } from './viewLogic/temporaryStateManager';
import { ShortCutManager } from './viewLogic/keyboardShortcutHandler';
import { ThemeId, currThemeId } from './viewLogic/colourSetManager';

import { InstantiateNewDataModelScope } from './interactionLayer/viewLayerInteractionApi';
import { DataEventHttpPostHandlers } from './interactionLayer/ajaxDataModules/ajaxDataEventPoster';


// A wrapper for the application 'page' itself, which will be rendered by react-router.
// This basically acts as the subtree-root for the actual todo-app page.
export class AppPage extends Component {
    constructor(props) {
        super(props);
        
        // Whenever this page is constructed, we will re-instantiate a fresh scope and data model instance to pass to our children.
        this.dataModelScope = InstantiateNewDataModelScope();

        // Create a temporary state context for creation forms
        this.formStateManager = TemporaryStateManager();
               
        this.cleanUpFormStates = this.cleanUpFormStates.bind(this);
    }
    componentDidMount() {
        // Access the global keyboard shortcut manager, and register the form cleanup function as 'esc' key.
        ShortCutManager.registerShortcut('Escape', this.cleanUpFormStates);

        // All of our children will have mounted by the time we mount, thus, they should have registered their update handlers.
        // Thus, we should now trigger a 'fetch and load data' operation, since everything is now instantiated correctly.
        this.dataModelScope.RegisterForDataEvents(DataEventHttpPostHandlers);
        this.dataModelScope.TriggerEventLogDataFetch();
    }
    componentWillUnmount() {
        // Short cuts should only be active while the application page is mounted/rendered.
        ShortCutManager.clearAllShortcuts();

        // If the App page unmounts, then the data-model instance it controls should no longer exist. To make sure nothing whack
        // happens if React secretly maintains the un-mounted instance, we should now EXPLICITLY wipe out all registered handlers
        // as the last thing we do. Now, our children should also de-register their callbacks when they unmount, because there is
        // a chance some children will mount and un-mount independently of the AppPage itself.
        // WARNING: No other component except the 'data model owner' (root component who passes the instance down) should do this.
        this.dataModelScope.ClearAllRegisteredCallbacks();
        this.dataModelScope = null;
    }

    cleanUpFormStates() {
        this.formStateManager.triggerCleanup();
    }

    render() {
        return (
            // Return each 'section' of the app as siblings, so that the root div can arrange them using CSS Grid!
            <ThemeId.Provider value={{ themeId: currThemeId }}>
                <div id="appPageRoot">
                    <Header onSignOut={this.props.onSignOut}/>
                    <BacklogSection dataModelScope={this.dataModelScope} formStateManager={this.formStateManager} />
                    <ActiveTaskSection dataModelScope={this.dataModelScope} formStateManager={this.formStateManager} />
                    <TaskStatisticsSection dataModelScope={this.dataModelScope} formStateManager={this.formStateManager} />
                    <Footer />
                </div>
            </ThemeId.Provider>
        );
    }
}