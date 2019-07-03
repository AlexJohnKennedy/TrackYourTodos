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
            showingBacklog: true,
            showingCompleted: false,
            showingGraveyard: false,
            tabId: 0,
            showingForm: false,
            deferredTaskViews: [],
            deferredTaskCreationFunc: null
        };
        
        this.handleActiveChange = this.handleActiveChange.bind(this);
        this.toggleTab = this.toggleTab.bind(this);
        this.toggleFormOn = this.toggleFormOn.bind(this);
        this.toggleFormOff = this.toggleFormOff.bind(this);
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
        ShortCutManager.registerShiftShortcut("Digit4", this.toggleFormOn);
        this.setupWithNewDataModelInstance();
    }
    componentDidUpdate(prevProps, prevState, snapshot) {
        if (prevProps.dataModelScope !== this.props.dataModelScope) {
            console.log("Backlog section got a newly instantiated data-model. We need to refresh our registrations, and re-render!");
            this.setupWithNewDataModelInstance();
        }
    }

    componentWillUnmount() {
        // TODO: Deregister shortcut here?
    }

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

    handleActiveChange() {
        let deferredTaskViews = this.activeTaskListAPI.GetActiveTasks().filter((task) => task.category === Category.Deferred).sort((a, b) => b.eventTimestamps.timeCreated - a.eventTimestamps.timeCreated);

        // Update this component's state; which will re-render everything!
        this.setState({
            deferredTaskViews : deferredTaskViews,
            completedTaskViews : this.activeTaskListAPI.GetCompletedTasks(),
            failedTaskViews : this.activeTaskListAPI.GetFailedTasks(),
            deferredTaskCreationFunc : this.activeTaskListAPI.GetCreationFunction(Category.Deferred, ColourIdTracker.useNextColour)
        });
    }

    toggleTab(tabId) {
        if (tabId < 0 || tabId > 2) throw new Error("BacklogSection passed invalid tab id in callback!");
        let bl = tabId === 0 ? true : false;
        let cm = tabId === 1 ? true : false;
        let gy = tabId === 2 ? true : false;

        // Toggle off the backlog creation form if the tab clicked is not the backlog tab.
        if (tabId > 0) {
            this.toggleFormOff();
        }

        this.setState({
            showingBacklog: bl,
            showingCompleted: cm,
            showingGraveyard: gy,
            tabId: tabId
        });
    }
    
    render() {
        return(
            <div className="BacklogSection">
                <NavigationStateWrapper
                    names={['Backlog', 'Completed', 'Graveyard']}
                    toggleCallback={this.toggleTab}
                    currActiveIndex={this.state.tabId}
                />
                <div className="spacer"/>
                <div className="wrapper">
                    { this.state.showingBacklog &&
                        <TaskList
                            tasks={this.state.deferredTaskViews}
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
                            formStateManager={this.props.formStateManager}
                        />
                    }
                    { this.state.showingCompleted &&
                        <TaskList
                            tasks={this.state.completedTaskViews}
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
                            formStateManager={this.props.formStateManager}
                        />
                    }
                    { this.state.showingGraveyard &&
                        <TaskList
                            tasks={this.state.failedTaskViews}
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
                            formStateManager={this.props.formStateManager}
                        />
                    }
                    <CreationForm
                            creationFunction={this.state.deferredTaskCreationFunc} 
                            showingForm={this.state.showingForm}
                            submitAction={this.toggleFormOff}
                            formStateManager={this.props.formStateManager}
                            formText={this.props.formText}
                            maxFieldLength={MAX_TASK_NAME_LEN}
                    />
                </div>
            </div>
        );
    }
}