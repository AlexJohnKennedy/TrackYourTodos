import React, { Component } from 'react';
import { ActiveTaskSection } from '../RootSectionComponents/ActiveTaskSection';
import { TaskStatisticsSection } from '../RootSectionComponents/TaskStatisticsSection';
import { BacklogSection } from '../RootSectionComponents/BacklogSection';
import { Footer } from '../Footer';
import { Header } from '../Header';

import { TemporaryStateManager } from '../../viewLogic/temporaryStateManager';
import { ShortCutManager } from '../../viewLogic/keyboardShortcutHandler';
import { ThemeId, currThemeId } from '../../viewLogic/colourSetManager';

import { InstantiateNewDataModelScope } from '../../interactionLayer/viewLayerInteractionApi';
import { BuildDataEventHttpPostHandlers } from '../../interactionLayer/ajaxDataModules/ajaxDataEventPoster';
import { setConflictingDataAction } from '../../interactionLayer/ajaxDataModules/ajaxErrorcaseHandlers';

import { DEFAULT_GLOBAL_CONTEXT_STRING } from '../../logicLayer/Task';


// A wrapper for the application 'page' itself, which will be rendered by react-router.
// This basically acts as the subtree-root for the actual todo-app page.
export class AppPage extends Component {
    constructor(props) {
        super(props);

        console.log("AppPage constructor");

        this.state = {
            currentContext: DEFAULT_GLOBAL_CONTEXT_STRING,
            visibleContexts: [],     // Empty means that global is being rendered. Must be empty since we havne't loaded anything yet.
            availableContexts: [DEFAULT_GLOBAL_CONTEXT_STRING, "tytodos development"],
            dataModelScope: InstantiateNewDataModelScope(DEFAULT_GLOBAL_CONTEXT_STRING)
        }

        // Create a temporary state context for creation forms
        this.formStateManager = TemporaryStateManager();

        this.cleanUpFormStates = this.cleanUpFormStates.bind(this);
        this.switchContext = this.switchContext.bind(this);
        this.createNewContext = this.createNewContext.bind(this);
    }
    setupInitialDataFetch() {
        const conflictingDataAction = () => this.state.dataModelScope.TriggerEventLogDataRefresh(this.state.visibleContexts);
        setConflictingDataAction(conflictingDataAction);

        // All of our children will have mounted by the time we mount, thus, they should have registered their update handlers.
        // Thus, we should now trigger a 'fetch and load data' operation, since everything is now instantiated correctly.
        this.state.dataModelScope.RegisterForDataEvents(BuildDataEventHttpPostHandlers(this.props.failedEventCacheInstance));
        this.state.dataModelScope.TriggerEventLogInitialDataFetch(this.state.visibleContexts);
    }
    componentDidMount() {
        console.log("AppPage mounted");

        // Access the global keyboard shortcut manager, and register the form cleanup function as 'esc' key.
        ShortCutManager.registerShortcut('Escape', this.cleanUpFormStates);

        this.setupInitialDataFetch();

        const action = () => { console.log("============ TESTING THE SET STATE! =============="); this.switchContext("tytodos development") };
        setTimeout(action, 8000); 
    }
    componentWillUnmount() {
        console.log("AppPage AppPage unmounted");

        // Short cuts should only be active while the application page is mounted/rendered.
        ShortCutManager.clearAllShortcuts();

        // If the App page unmounts, then the data-model instance it controls should no longer exist. To make sure nothing whack
        // happens if React secretly maintains the un-mounted instance, we should now EXPLICITLY wipe out all registered handlers
        // as the last thing we do. Now, our children should also de-register their callbacks when they unmount, because there is
        // a chance some children will mount and un-mount independently of the AppPage itself.
        // WARNING: No other component except the 'data model owner' (root component who passes the instance down) should 'clear all'
        // like this!
        this.state.dataModelScope.ClearAllRegisteredCallbacks();
    }
    componentDidUpdate(prevProps, prevState, snapshot) {
        console.log("AppPage did-update");
        if (prevState.dataModelScope !== this.state.dataModelScope) {
            this.setupInitialDataFetch();
        }
    }

    cleanUpFormStates() {
        this.formStateManager.triggerCleanup();
    }

    // Passed down to our children, allowing them to switch contexts between the currently available ones.
    switchContext(context) {
        context = this.validateContextString(context);
        if (context === null || !this.state.availableContexts.includes(context)) {
            console.warn("Invalid context passed to context switch! You must pick a context which is already availble. Use 'CreateNewContext' to make a new one. Param was: " + context);
            return;
        }
        if (this.state.currentContext === context) {
            return;
        }

        this.performSwitch(context);
    }
    // Encapsultates the logic for choosing the visible contexts for a given current context. E.g., global => all are visible. 
    // If we end up implemented nested contexts, then for a given current context, we would search and make the current's entire
    // subtree visible as well! But for now, it's either global, or just one.
    performSwitch(context) {
        if (context === DEFAULT_GLOBAL_CONTEXT_STRING) {
            this.setState({
                currentContext: context,
                visibleContexts: this.state.availableContexts   // Everything is visible!
            });
        }
        else {
            this.state.dataModelScope.ClearAllRegisteredCallbacks();
            this.setState({
                currentContext: context,
                visibleContexts: [context],
                dataModelScope: InstantiateNewDataModelScope(context)
            });
        }
    }

    // Pased fown to our children, allowing them to create new contexts.
    createNewContext(newContext) {
        newContext = this.validateContextString(newContext);
        if (newContext === null) { return null; }
        if (this.state.availableContexts.includes(newContext) || newContext === DEFAULT_GLOBAL_CONTEXT_STRING) { 
            this.performSwitch(newContext);
        }
        else {
            this.state.dataModelScope.ClearAllRegisteredCallbacks();
            this.setState({
                currentContext: newContext,
                visibleContexts: newContext,
                availableContexts: this.state.availableContexts.concat([newContext]),
                dataModelScope: InstantiateNewDataModelScope(newContext)
            });
        }
    }

    validateContextString(context) {
        if (context === null || context === undefined || context === "" || context.trim().length === 0) {
            console.warn("Invalid context passed to ContextState! Just doing nothing instead of crashing. Context was: " + context);
            return null;
        }
        return context.trim();
    }



    render() {
        console.log("AppPage render");


        return (
            // Return each 'section' of the app as siblings, so that the root div can arrange them using CSS Grid!
            <ThemeId.Provider value={{ themeId: currThemeId }}>
                <div id="appPageRoot">
                    <Header onSignOut={this.props.onSignOut}/>
                    <BacklogSection dataModelScope={this.state.dataModelScope} formStateManager={this.formStateManager} />
                    <ActiveTaskSection dataModelScope={this.state.dataModelScope} formStateManager={this.formStateManager} />
                    <TaskStatisticsSection dataModelScope={this.state.dataModelScope} formStateManager={this.formStateManager} />
                    <Footer />
                </div>
            </ThemeId.Provider>
        );
    }
}