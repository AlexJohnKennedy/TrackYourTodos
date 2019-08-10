import React, { Component } from 'react';
import { NavigationStateWrapper } from '../NavigationTabs';
import { Category, MAX_TASK_NAME_LEN  } from '../../logicLayer/Task';

import { TaskList } from '../TaskList';
import { CreationForm } from '../CreationForm';

import { ShortCutManager } from '../../viewLogic/keyboardShortcutHandler';
import { ColourIdTracker } from '../../viewLogic/colourSetManager';

export class BacklogSection extends Component {
    constructor(props) {
        super(props);

        this.state = {
            deferredTaskViews: [],
            deferredTaskCreationFunc: null
        };
        
        this.handleActiveChange = this.handleActiveChange.bind(this);
    }
    setupWithNewDataModelInstance() {
        // Register to access and recieve updates from the ActiveTaskList from the Data-model instance handed to us.
        this.activeTaskListAPI = this.props.dataModelScope.RegisterToActiveTaskListAPI(this.handleActiveChange);
        this.props.dataModelScope.RegisterForOnInitialDataLoadCallback(this.handleActiveChange);
        this.props.dataModelScope.RegisterForOnDataRefreshCallback(this.handleActiveChange);

        // Initialise state of this component.
        this.handleActiveChange();
    }
    componentDidMount() {
        this.setupWithNewDataModelInstance();
    }
    componentDidUpdate(prevProps, prevState, snapshot) {
        if (prevProps.dataModelScope !== this.props.dataModelScope) {
            this.setupWithNewDataModelInstance();
        }
    }

    handleActiveChange() {
        let deferredTaskViews = this.activeTaskListAPI.GetDeferredTasks();

        // Update this component's state; which will re-render everything!
        this.setState({
            deferredTaskViews : deferredTaskViews,
            completedTaskViews : this.activeTaskListAPI.GetCompletedTasks(),
            failedTaskViews : this.activeTaskListAPI.GetFailedTasks(),
            deferredTaskCreationFunc : this.activeTaskListAPI.GetCreationFunction(Category.Deferred, ColourIdTracker.useNextColour)
        });
    }

    render() {

        return(
            <SidebarSectionLayout
                names={['Backlog', 'Completed', 'Graveyard']}
                creationFunction={this.state.deferredTaskCreationFunc} 
                formStateManager={this.props.formStateManager}
                formText={this.props.formText}
                tasklists={[
                    buildInactiveTasklist(this.state.deferredTaskViews, this.props.formStateManager, this.props.colourGetter),
                    buildInactiveTasklist(this.state.completedTaskViews, this.props.formStateManager, this.props.colourGetter),
                    buildInactiveTasklist(this.state.failedTaskViews, this.props.formStateManager, this.props.colourGetter)
                ]}
            />
        );
    }
}

// helper
function buildInactiveTasklist(taskViews, formStateManager, colourGetter) {
    return <TaskList
        tasks={taskViews}
        highlights={[]}
        hightlightEventCallbacks={{ 
            register : (id) => id,
            unregister : (id) => id
        }}
        completionAnimIds={[]}
        failureAnimIds={[]}
        animTriggerCallbacks={{
            register : id => id,
            unregister : id => id
        }}
        formStateManager={formStateManager}
        colourGetter={colourGetter}
    />;
}


// Contains all the layout-related state management, such as the currently visible tab and form state.
export class SidebarSectionLayout extends Component {
    constructor(props) {
        super(props);

        this.state = {
            tabId: 0,
            showingForm: false
        };

        this.toggleTab = this.toggleTab.bind(this);
        this.toggleFormOn = this.toggleFormOn.bind(this);
        this.toggleFormOff = this.toggleFormOff.bind(this);
    }
    componentDidMount() {
        ShortCutManager.registerShiftShortcut("Digit4", this.toggleFormOn);
    }
    // TODO: Deregister shortcut in componentWillUnmount() ?

    toggleFormOn() {
        this.props.formStateManager.triggerCleanup();
        this.toggleTab(0);
        this.setState({
            showingForm: true
        });
    }
    toggleFormOff() {
        this.setState({
            showingForm: false
        });
    }
    toggleTab(tabId) {
        if (tabId < 0 || tabId >= this.props.names.length) throw new Error("SidebarSectionLayout passed invalid tab id in callback!");
        this.setState({
            tabId: tabId,
            showingForm: false
        });
    }

    render() {
        const clearFormStateCallbacks = () => this.props.formStateManager.clearCallbacks();

        return(
            <div className="BacklogSection">
                <NavigationStateWrapper
                    names={this.props.names}
                    toggleCallback={this.toggleTab}
                    currActiveIndex={this.state.tabId}
                />
                <div className="spacer"/>
                <div className="wrapper">
                    {this.props.tasklists[this.state.tabId]}
                    <CreationForm
                        creationFunction={this.props.creationFunction} 
                        showingForm={this.state.showingForm}
                        submitAction={() => { clearFormStateCallbacks(); this.toggleFormOff(); }}
                        formStateManager={this.props.formStateManager}
                        formText={this.props.formText}
                        maxFieldLength={MAX_TASK_NAME_LEN}
                    />
                </div>
            </div>
        );
    }
}