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
import { BuildContextMappings } from '../../logicLayer/contextState';
import { initBrowserHistoryManipulation, onFormStateRegistrationAction } from '../../viewLogic/backButtonStateManager';
import { GetHSLAColour } from '../../viewLogic/colourMappings';

import { InstantiateNewDataModelScope } from '../../interactionLayer/viewLayerInteractionApi';
import { BuildDataEventHttpPostHandlers, RetryPostingFailedEvents } from '../../interactionLayer/ajaxDataModules/ajaxDataEventPoster';

import { setConflictingDataAction } from '../../interactionLayer/ajaxDataModules/ajaxErrorcaseHandlers';
import { SendRenameContextRequest, SendDeleteContextRequest, SendReviveContextRequest, SendUpdateContextColourRequest } from '../../interactionLayer/ajaxDataModules/ajaxContextChangeEventPoster';

import { DEFAULT_GLOBAL_CONTEXT_STRING, MAX_CONTEXT_NAME_LEN } from '../../logicLayer/Task';

import { toast } from 'react-toastify';

// Define constants which others may want to use.
export const MAX_SELECTABLE_CONTEXTS = 9;
export const CONTEXT_STATE_LOCAL_STORAGE_KEY = "prev-context-state";    // User id + this key will be the local storage key we search for.
export const GetContextStateLocalStorageKey = userId => userId + CONTEXT_STATE_LOCAL_STORAGE_KEY;

// A wrapper for the application 'page' itself, which will be rendered by react-router.
// This basically acts as the subtree-root for the actual todo-app page.
export class AppPage extends Component {
    constructor(props) {
        super(props);

        this.state = {
            currentContext: DEFAULT_GLOBAL_CONTEXT_STRING,
            dataModelScope: InstantiateNewDataModelScope(DEFAULT_GLOBAL_CONTEXT_STRING),
            showingContextManagerPage: false,
            
            // Context mappings defined in 'contextData', and Visible, Available, and Selectable contexts are identified in these arrays as their "id strings". 
            contextMappings: BuildContextMappings([{ id: DEFAULT_GLOBAL_CONTEXT_STRING, name: null, colourid: 0 }]),
            visibleContexts: [],     // Empty means that global is being rendered. Must be empty since we havne't loaded anything yet.
            availableContexts: [DEFAULT_GLOBAL_CONTEXT_STRING],   // This should be re-populated by the GET request handler.
            selectableContexts: [DEFAULT_GLOBAL_CONTEXT_STRING]
        }

        this.cleanUpFormStates = this.cleanUpFormStates.bind(this);
        this.switchContext = this.switchContext.bind(this);
        this.createNewContext = this.createNewContext.bind(this);
        this.updateAvailableContexts = this.updateAvailableContexts.bind(this);
        this.togglePage = this.togglePage.bind(this);
        this.addSelectableContext = this.addSelectableContext.bind(this);
        this.removeSelectableContext = this.removeSelectableContext.bind(this);
        this.updateSelectableContextsInLocalStorage = this.updateSelectableContextsInLocalStorage.bind(this);
        this.deleteContext = this.deleteContext.bind(this);
        this.reviveContext = this.reviveContext.bind(this);
        this.renameContext = this.renameContext.bind(this);
        this.updateContextColour = this.updateContextColour.bind(this);
        
        // Create a temporary state context for creation forms. Pass in the callback which the backButtonStateManager provides, for the purposes of history manipulation.
        this.formStateManager = TemporaryStateManager(onFormStateRegistrationAction);

        // Register for some response handlers
        this.state.dataModelScope.RegisterForOnInitialDataLoadCallback(availableContexts => this.updateAvailableContexts(availableContexts));
        this.state.dataModelScope.RegisterForOnDataRefreshCallback(availableContexts => this.updateAvailableContexts(availableContexts));
        
        // Setup browser-history manipulation, which will prevent the browser from navigating away from the app page if 'back' is pressed while a form is open.
        const areFormsOpen = () => this.formStateManager.length() > 0 || this.state.showingContextManagerPage;
        initBrowserHistoryManipulation(areFormsOpen, this.cleanUpFormStates);
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
    // The parameter passed here should be the ID STRING of the context we are switching to, not the name!
    performSwitch(context) {
        if (!this.props.failedEventCacheInstance.IsEmpty()) {
            RetryPostingFailedEvents(this.props.failedEventCacheInstance);
        }
        
        this.formStateManager.triggerCleanup();

        if (context === DEFAULT_GLOBAL_CONTEXT_STRING) {
            this.state.dataModelScope.ClearAllRegisteredCallbacks();
            this.setState({
                currentContext: context,
                visibleContexts: [],   // Empty means everything is visible.
                dataModelScope: InstantiateNewDataModelScope(context)
            });
        }
        else if (!this.state.selectableContexts.includes(context)) {
            // Oops! We gotta hotswap it in. Remember to update the localStorage state to reflect the new selectable-contexts list...
            this.setState((state, props) => {
                // If the selectable contexts list is full, then we will simply replace the last item in the list, sorry bro!
                let newSelectables = state.selectableContexts;
                if (state.selectableContexts.length === MAX_SELECTABLE_CONTEXTS) {
                    newSelectables[newSelectables.length - 1] = context;
                }
                else {
                    newSelectables = newSelectables.concat([context]);
                }
                this.updateSelectableContextsInLocalStorage(newSelectables);
                return {
                    currentContext: context,
                    visibleContexts: [context],
                    selectableContexts: newSelectables,
                    dataModelScope: InstantiateNewDataModelScope(context)
                }
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

    // Pased down to our children, allowing them to create new contexts.
    createNewContext(newContextName) {
        newContextName = this.validateContextString(newContextName);
        if (newContextName === null) { return; }

        if (this.state.contextMappings.IsNameTaken(newContextName) || newContextName === DEFAULT_GLOBAL_CONTEXT_STRING) {
            this.performSwitch(this.state.contextMappings.GetIdForName(newContextName));
        }
        else {
            if (!this.props.failedEventCacheInstance.IsEmpty()) {
                RetryPostingFailedEvents(this.props.failedEventCacheInstance);
            }
            
            // Aquire unique id string for this name. The ColourId always defaults to '-1' which means no explicitly assigned colour.
            const id = this.state.contextMappings.GetUniqueIdForName(newContextName);
            const colourId = -1;

            this.state.dataModelScope.ClearAllRegisteredCallbacks();
            this.setState((state, props) => {
                // If the selectable contexts list is full, then we will simply replace the last item in the list, sorry bro!
                let newSelectables = state.selectableContexts;
                if (state.selectableContexts.length === MAX_SELECTABLE_CONTEXTS) {
                    newSelectables[newSelectables.length - 1] = id;
                }
                else {
                    newSelectables = newSelectables.concat([id]);
                }
                this.updateSelectableContextsInLocalStorage(newSelectables);
                const newState = state.contextMappings.CreateNewContext(id, newContextName, colourId);
                console.log("New state after creation:", newState);
                return {
                    contextMappings: newState,
                    currentContext: id,
                    visibleContexts: [id],
                    availableContexts: state.availableContexts.concat([id]),
                    selectableContexts: newSelectables,
                    dataModelScope: InstantiateNewDataModelScope(id)
                };
            });
        }
    }

    // Used as a callback for when data loads, to populate the 'available contexts' so that users can select them.
    updateAvailableContexts(contextData) {
        if (contextData === undefined || contextData === null) throw new Error("Cannot parse null contexts to updateAvailableContexts.");

        // Merge the incoming mappings with the ones we have, but make sure the incoming mappings take precedence
        const contextState = BuildContextMappings(contextData).MergeOtherMappingsIntoThis(this.state.contextMappings);

        // Merges the recieved context id-strings with the current ones and the default, then removes the duplicates by placing them in a set, and converting back to an array. 
        const validatedStrings = [ ...new Set([DEFAULT_GLOBAL_CONTEXT_STRING].concat(this.state.availableContexts).concat(contextState.IdArray).filter(s => s !== null && s !== undefined)) ];

        // Now, lookup (for the current user id) any saved selectable-contexts and current contexts from local storage, so that the state remains for the user after reloads.
        const prevContextStateData = window.localStorage.getItem(GetContextStateLocalStorageKey(this.props.userId));
        if (prevContextStateData !== null) {
            // If there was saved information, then parse it, and add the selectable contexts and current context state, provided they exist in the loaded availableContexts!
            const parsedData = JSON.parse(prevContextStateData);
            const prevSelectableContexts = [ ...new Set([DEFAULT_GLOBAL_CONTEXT_STRING].concat(parsedData).map(s => this.validateContextString(s)).filter(s => s !== null && contextState.HasId(s) && !contextState.IsDeleted(s))) ];
            this.setState({
                contextMappings: contextState,
                availableContexts: validatedStrings,
                selectableContexts: prevSelectableContexts
            });
        }
        else {
            this.setState({
                contextMappings: contextState,
                availableContexts: validatedStrings
            });
        }
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
        this.setState((prevState, prevProps) => {
            const newSelectableContexts = prevState.selectableContexts.concat(context);
            this.updateSelectableContextsInLocalStorage(newSelectableContexts);
            return {
                selectableContexts: newSelectableContexts
            }
        });
    }
    removeSelectableContext(context) {
        context = this.validateContextString(context);
        if (context === null || !this.state.selectableContexts.includes(context)) return;

        // If the context we are removing is also the currently selected context, then we will simply default back to the global context.
        if (context === this.state.currentContext) {
            this.setState((prevState, prevProps) => {
                const newSelectableContexts = prevState.selectableContexts.filter(s => s !== context);
                this.updateSelectableContextsInLocalStorage(newSelectableContexts);
                return {
                    currentContext: DEFAULT_GLOBAL_CONTEXT_STRING,
                    visibleContexts: [],     // Empty means global
                    selectableContexts: newSelectableContexts,
                    dataModelScope: InstantiateNewDataModelScope(context)   // Because we are essentially switching contexts in this case.
                }
            });
        }
        else {
            this.setState((prevState, prevProps) => {
                const newSelectableContexts = prevState.selectableContexts.filter(s => s !== context);
                this.updateSelectableContextsInLocalStorage(newSelectableContexts);
                return {
                    selectableContexts: newSelectableContexts
                };
            });
        }
    }
    updateSelectableContextsInLocalStorage(newSelectableContextsArray) {
        // Takes an array of strings, and save it in local storage, overwriting whatever was there before. This saves the IDs of the contexts.
        window.localStorage.setItem(GetContextStateLocalStorageKey(this.props.userId), JSON.stringify(newSelectableContextsArray));
    }

    validateContextString(context) {
        if (context === null || context === undefined || context === "" || context.trim().length === 0 || context.trim().length > MAX_CONTEXT_NAME_LEN) {
            console.warn("Invalid context passed to ContextState! Just doing nothing instead of crashing. Context was: " + context);
            return null;
        }
        return context.trim().toLowerCase();
    }

    renameContext(idString, newName) {
        newName = this.validateContextString(newName);
        if (newName === null) return;
        if (newName === DEFAULT_GLOBAL_CONTEXT_STRING || this.state.contextMappings.IsNameTaken(newName)) {
            toast.info(this.state.contextMappings.IsDeleted(this.state.contextMappings.GetIdForName(newName)) ? "That name is already taken by an archived context! Rename that one first if you want to use this name again" : "That name is already taken!");
            return;
        }

        // Simply reset the state, applying the modification, and send a PUT request to the backend to make the change!
        SendRenameContextRequest(idString, newName, 2);

        this.setState((state, props) => {
            return {
                contextMappings: state.contextMappings.RenameContext(idString, newName)
            };
        });
    }
    deleteContext(idString) {
        if (!this.state.contextMappings.HasId(idString)) {
            throw new Error("illegal id-string passed to delete-context function: " + idString);
        }

        SendDeleteContextRequest(idString);
        this.setState((state, props) => {
            return {
                contextMappings: state.contextMappings.DeleteContext(idString)
            };
        });

        // Deleted contexts should no longer be selectable
        this.removeSelectableContext(idString);
    }
    reviveContext(idString) {
        if (!this.state.contextMappings.HasId(idString)) {
            throw new Error("illegal id-string passed to revive-context function: " + idString);
        }
        SendReviveContextRequest(idString);
        this.setState((state, props) => {
            return {
                contextMappings: state.contextMappings.ReviveContext(idString)
            };
        });
    }
    updateContextColour(idString, colourid) {
        if (!this.state.contextMappings.HasId(idString)) {
            throw new Error("illegal id-string passed to revive-context function: " + idString);
        }
        SendUpdateContextColourRequest(idString, colourid);
        this.setState((state, props) => {
            return {
                contextMappings: state.contextMappings.ChangeContextColour(idString, colourid)
            };
        });
    }

    render() {
        // If we have more than one context visible, then the 'colour getter' function reads from the context mappings.
        // If only one, then we use the task's id.
        const getTaskColour = this.state.visibleContexts.length !== 1 ? 
        taskView => {console.log("getting colour for context", taskView, this.state.contextMappings, GetHSLAColour(this.state.contextMappings.GetColourId(taskView.context))); return GetHSLAColour(this.state.contextMappings.GetColourId(this.state.contextMappings.GetIdForName(taskView.context)))} :
        taskView => {console.log("getting colour for task", GetHSLAColour(taskView.colourid)); return GetHSLAColour(taskView.colourid)};

        return (
            // Return each 'section' of the app as siblings, so that the root div can arrange them using CSS Grid!
            <ThemeId.Provider value={{ themeId: currThemeId }}> 
                <div id="appPageRoot">
                    <div className="HeaderLeftBlock"/>
                    <Header onSignOut={this.props.onSignOut}/>
                    <div className="HeaderRightBlock"/>
                    <ContextTabs 
                        togglePage={() => this.togglePage(true)} 
                        switchContext={this.switchContext} 
                        currentContext={this.state.currentContext} 
                        selectableContexts={this.state.selectableContexts}
                        contextMappings={this.state.contextMappings}
                        dataModelScope={this.state.dataModelScope}
                    />
                    <BacklogSection dataModelScope={this.state.dataModelScope} formStateManager={this.formStateManager} colourGetter={getTaskColour}/>
                    <ActiveTaskSection dataModelScope={this.state.dataModelScope} formStateManager={this.formStateManager} colourGetter={getTaskColour}/>
                    <TaskStatisticsSection dataModelScope={this.state.dataModelScope} formStateManager={this.formStateManager} />
                    { this.state.showingContextManagerPage &&
                        <ContextManagerPage 
                            togglePage={() => this.togglePage(false)} 
                            createNewContext={this.createNewContext}
                            contextMappings={this.state.contextMappings}
                            availableContexts={this.state.availableContexts} 
                            selectableContexts={this.state.selectableContexts}
                            addSelectableContext={this.addSelectableContext}
                            removeSelectableContext={this.removeSelectableContext}
                            formStateManager={this.formStateManager}
                            maxSelectable={MAX_SELECTABLE_CONTEXTS}
                            renameContext={this.renameContext}
                            reviveContext={this.reviveContext}
                            deleteContext={this.deleteContext}
                            updateContextColour={this.updateContextColour}
                        />
                    }
                    <Footer />
                </div>
            </ThemeId.Provider>
        );
    }
}