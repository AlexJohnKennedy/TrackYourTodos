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

        console.debug("AppPage is being constructed");
        
        // Create a temporary state context for creation forms
        this.formStateManager = TemporaryStateManager();
        console.log(this.formStateManager);
        // Access the global keyboard shortcut manager, and register the form cleanup function as 'esc' key.
        ShortCutManager.registerShortcut('Escape', this.cleanUpFormStates);

        this.cleanUpFormStates = this.cleanUpFormStates.bind(this);
    }
    componentDidMount() {
        console.debug("AppPage is being Mounted");
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
                <Header />
                <BacklogSection formStateManager={this.formStateManager} />
                <ActiveTaskSection formStateManager={this.formStateManager} />
                <TaskStatisticsSection formStateManager={this.formStateManager} />
                <Footer />
            </ThemeId.Provider>
        );
    }
}