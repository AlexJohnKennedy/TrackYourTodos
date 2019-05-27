import React, { Component } from 'react';
import { ActiveTaskSection } from './reactComponents/ActiveTaskSection';
import { TaskStatisticsSection } from './reactComponents/TaskStatisticsSection';
import { BacklogSection } from './reactComponents/BacklogSection';
import { TemporaryStateManager } from './viewLogic/temporaryStateManager';
import { ShortCutManager } from './viewLogic/keyboardShortcutHandler';
import { ThemeId, currThemeId } from './viewLogic/colourSetManager';
import { Footer } from './reactComponents/Footer';
import { Header } from './reactComponents/Header';

// A wrapper for the application 'page' itself, which will be rendered by react-router.
// This basically acts as the subtree-root for the actual todo-app page.
export class AppPage extends Component {
    constructor(props) {
        super(props);
        
        // bind this method before we instantiate the FormState manager, so that it is in scope        
        this.cleanUpFormStates = this.cleanUpFormStates.bind(this);

        // Create a temporary state context for creation forms
        this.formStateManager = TemporaryStateManager();

        // Access the global keyboard shortcut manager, and register the form cleanup function as 'esc' key.
        ShortCutManager.registerShortcut('Escape', this.cleanUpFormStates);
    }
    componentDidMount() {
        // TODO: Trigger data-model instantiation HERE, and only here!
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
                <div id="appPageRoot">
                    <Header onSignOut={this.props.onSignOut}/>
                    <BacklogSection formStateManager={this.formStateManager} />
                    <ActiveTaskSection formStateManager={this.formStateManager} />
                    <TaskStatisticsSection formStateManager={this.formStateManager} />
                    <Footer />
                </div>
            </ThemeId.Provider>
        );
    }
}