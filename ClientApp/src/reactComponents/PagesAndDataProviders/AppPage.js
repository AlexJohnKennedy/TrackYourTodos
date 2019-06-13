import React, { Component } from 'react';
import { ActiveTaskSection } from '../RootSectionComponents/ActiveTaskSection';
import { TaskStatisticsSection } from '../RootSectionComponents/TaskStatisticsSection';
import { BacklogSection } from '../RootSectionComponents/BacklogSection';
import { Footer } from '../Footer';
import { Header } from '../Header';
import { ContextTabs } from '../ContextTabs';
import { ContextManagerPage } from './ContextManagerPage';

import { TemporaryStateManager } from '../../viewLogic/temporaryStateManager';
import { ShortCutManager } from '../../viewLogic/keyboardShortcutHandler';
import { ThemeId, currThemeId } from '../../viewLogic/colourSetManager';

import { InstantiateNewDataModelScope } from '../../interactionLayer/viewLayerInteractionApi';
import { BuildDataEventHttpPostHandlers } from '../../interactionLayer/ajaxDataModules/ajaxDataEventPoster';
import { setConflictingDataAction } from '../../interactionLayer/ajaxDataModules/ajaxErrorcaseHandlers';

import { DEFAULT_GLOBAL_CONTEXT_STRING, MAX_CONTEXT_NAME_LEN } from '../../logicLayer/Task';

// Define a constant which others may want to use.
export const MAX_SELECTABLE_CONTEXTS = 5;

// A wrapper for the application 'page' itself, which will be rendered by react-router.
// This basically acts as the subtree-root for the actual todo-app page.
export class AppPage extends Component {
    constructor(props) {
        super(props);

        this.state = {
            currentContext: DEFAULT_GLOBAL_CONTEXT_STRING,
            visibleContexts: [],     // Empty means that global is being rendered. Must be empty since we havne't loaded anything yet.
            availableContexts: [DEFAULT_GLOBAL_CONTEXT_STRING],   // This should be re-populated by the GET request handler.
            selectableContexts: [DEFAULT_GLOBAL_CONTEXT_STRING],
            dataModelScope: InstantiateNewDataModelScope(DEFAULT_GLOBAL_CONTEXT_STRING),
            showingContextManagerPage: false
        }

        // Create a temporary state context for creation forms
        this.formStateManager = TemporaryStateManager();

        this.cleanUpFormStates = this.cleanUpFormStates.bind(this);
        this.switchContext = this.switchContext.bind(this);
        this.createNewContext = this.createNewContext.bind(this);
        this.updateAvailableContexts = this.updateAvailableContexts.bind(this);
        this.togglePage = this.togglePage.bind(this);
        this.addSelectableContext = this.addSelectableContext.bind(this);
        this.removeSelectableContext = this.removeSelectableContext.bind(this);
    }
    setupInitialDataFetch() {
        const conflictingDataAction = () => this.state.dataModelScope.TriggerEventLogDataRefresh(this.state.visibleContexts);
        setConflictingDataAction(conflictingDataAction);

        // Register for some response handlers
        this.state.dataModelScope.RegisterForOnInitialDataLoadCallback(availableContexts => this.updateAvailableContexts(availableContexts));
        this.state.dataModelScope.RegisterForOnDataRefreshCallback(availableContexts => this.updateAvailableContexts(availableContexts));

        // All of our children will have mounted by the time we mount, thus, they should have registered their update handlers.
        // Thus, we should now trigger a 'fetch and load data' operation, since everything is now instantiated correctly.
        this.state.dataModelScope.RegisterForDataEvents(BuildDataEventHttpPostHandlers(this.props.failedEventCacheInstance));
        this.state.dataModelScope.TriggerEventLogInitialDataFetch(this.state.visibleContexts);
    }
    componentDidMount() {
        // Access the global keyboard shortcut manager, and register the form cleanup function as 'esc' key.
        ShortCutManager.registerShortcut('Escape', this.cleanUpFormStates);
        this.setupInitialDataFetch();
    }
    componentWillUnmount() {
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
        if (prevState.dataModelScope !== this.state.dataModelScope) {
            this.setupInitialDataFetch();
        }
    }

    cleanUpFormStates() {
        this.formStateManager.triggerCleanup();
        if (this.state.showingContextManagerPage) {
            this.setState({
                showingContextManagerPage: false
            });
        }
    }

    // Passed down to our children, allowing them to switch contexts between the currently available ones.
    switchContext(context) {
        console.log("Attempting to switch to: " + context);
        context = this.validateContextString(context);
        console.log("String after validation: " + context);
        console.log("Currently available contexts:");
        console.log(this.state.availableContexts);
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
            this.state.dataModelScope.ClearAllRegisteredCallbacks();
            this.setState({
                currentContext: context,
                visibleContexts: [],   // Empty means everything is visible.
                dataModelScope: InstantiateNewDataModelScope(context)
            });
        }
        else {
            // We must ensure that the context we are switching to is acutally contained in the selectable list, otherwise things will break.
            if (!this.state.selectableContexts.includes(context)) {
                // Oops! We gotta hotswap it in.
                this.setState((state, props) => {
                    // If the selectable contexts list is full, then we will simply replace the last item in the list, sorry bro!
                    let newSelectables = state.selectableContexts;
                    if (state.selectableContexts.length === MAX_SELECTABLE_CONTEXTS) {
                        console.log(newSelectables.length)
                        newSelectables[newSelectables.length - 1] = context;
                    }
                    else {
                        newSelectables = newSelectables.concat([context]);
                    }
                    return {
                        currentContext: context,
                        visibleContexts: [context],
                        selectableContexts: newSelectables,
                        dataModelScope: InstantiateNewDataModelScope(context)
                    }
                });
            }
            this.state.dataModelScope.ClearAllRegisteredCallbacks();
            this.setState({
                currentContext: context,
                visibleContexts: [context],
                dataModelScope: InstantiateNewDataModelScope(context)
            });
        }
    }

    // Pased down to our children, allowing them to create new contexts.
    createNewContext(newContext) {
        console.log("Creating new context!");
        newContext = this.validateContextString(newContext);
        if (newContext === null) { return; }
        if (this.state.availableContexts.includes(newContext) || newContext === DEFAULT_GLOBAL_CONTEXT_STRING) {
            this.performSwitch(newContext);
        }
        else {
            this.state.dataModelScope.ClearAllRegisteredCallbacks();
            this.setState((state, props) => {
                // If the selectable contexts list is full, then we will simply replace the last item in the list, sorry bro!
                let newSelectables = state.selectableContexts;
                if (state.selectableContexts.length === MAX_SELECTABLE_CONTEXTS) {
                    console.log(newSelectables.length)
                    newSelectables[newSelectables.length - 1] = newContext;
                }
                else {
                    newSelectables = newSelectables.concat([newContext]);
                }
                return {
                    currentContext: newContext,
                    visibleContexts: [newContext],
                    availableContexts: state.availableContexts.concat([newContext]),
                    selectableContexts: newSelectables,
                    dataModelScope: InstantiateNewDataModelScope(newContext)
                }
            });
        }
    }

    // Used as a callback for when data loads, to populate the 'available contexts' so that users can select them.
    updateAvailableContexts(contextStrings) {
        if (contextStrings === undefined || contextStrings === null) throw new Error("Cannot parse null contexts to updateAvailableContexts.");
        // converts all strings with validator, filters out the failed ones (null), then build a set out of them to remove duplicats, then place
        // the de-duplicated values back into an array using the spread (...) operator on the set.
        const validatedStrings = [ ...new Set([DEFAULT_GLOBAL_CONTEXT_STRING].concat(this.state.availableContexts).concat(contextStrings).map(s => this.validateContextString(s)).filter(s => s !== null)) ];
        this.setState({
            availableContexts: validatedStrings
        });
    }

    togglePage(isSettings) {
        this.cleanUpFormStates();
        if (isSettings !== this.state.showingContextManagerPage) {
            this.setState({
                showingContextManagerPage: isSettings
            });
        }
    }

    addSelectableContext(context) {
        context = this.validateContextString(context);
        if (context === null || this.state.selectableContexts.includes(context)) return;
        this.setState((prevState, prevProps) => ({
            selectableContexts: prevState.selectableContexts.concat(context)
        }));
    }
    removeSelectableContext(context) {
        context = this.validateContextString(context);
        if (context === null || !this.state.selectableContexts.includes(context)) return;

        // If the context we are removing is also the currently selected context, then we will simply default back to the global context.
        if (context === this.state.currentContext){
            this.setState((prevState, prevProps) => ({
                currentContext: DEFAULT_GLOBAL_CONTEXT_STRING,
                visibleContexts: [],     // Empty means global
                selectableContexts: prevState.selectableContexts.filter(s => s !== context)
            }));
        }
        else {
            this.setState((prevState, prevProps) => ({
                selectableContexts: prevState.selectableContexts.filter(s => s !== context)
            }));
        }
    }

    validateContextString(context) {
        if (context === null || context === undefined || context === "" || context.trim().length === 0 || context.trim().length > MAX_CONTEXT_NAME_LEN) {
            console.warn("Invalid context passed to ContextState! Just doing nothing instead of crashing. Context was: " + context);
            return null;
        }
        return context.trim().toLowerCase();
    }

    render() {
        return (
            // Return each 'section' of the app as siblings, so that the root div can arrange them using CSS Grid!
            <ThemeId.Provider value={{ themeId: currThemeId }}> 
                <div id="appPageRoot">
                    <div className="HeaderLeftBlock"/>
                    <Header onSignOut={this.props.onSignOut}/>
                    <div className="HeaderRightBlock"/>
                    <ContextTabs togglePage={() => this.togglePage(true)} switchContext={this.switchContext} currentContext={this.state.currentContext} selectableContexts={this.state.selectableContexts}/>
                    <BacklogSection dataModelScope={this.state.dataModelScope} formStateManager={this.formStateManager} />
                    <ActiveTaskSection dataModelScope={this.state.dataModelScope} formStateManager={this.formStateManager} />
                    <TaskStatisticsSection dataModelScope={this.state.dataModelScope} formStateManager={this.formStateManager} />
                    { this.state.showingContextManagerPage &&
                        <ContextManagerPage 
                            togglePage={() => this.togglePage(false)} 
                            createNewContext={this.createNewContext} 
                            availableContexts={this.state.availableContexts} 
                            selectableContexts={this.state.selectableContexts}
                            addSelectableContext={this.addSelectableContext}
                            removeSelectableContext={this.removeSelectableContext}
                            formStateManager={this.formStateManager}
                            maxSelectable={MAX_SELECTABLE_CONTEXTS}
                        />
                    }
                    <Footer />
                </div>
            </ThemeId.Provider>
        );
    }
}