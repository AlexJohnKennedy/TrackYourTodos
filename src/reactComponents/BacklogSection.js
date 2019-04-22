import React, { Component } from 'react';
import { NavigationStateWrapper } from './NavigationTabs';
import { RegisterToActiveTaskListAPI } from '../interactionLayer/interactionApi';
import { ColourIdTracker } from '../viewLogic/colourSetManager';
import { Category } from '../logicLayer/Task';
import { TaskList } from './TaskList';
import { ShortCutManager } from '../viewLogic/keyboardShortcutHandler';
import { CreationForm } from './CreationForm';

export class BacklogSection extends Component {
    constructor(props) {
        super(props);

        this.state = {
            showingBacklog: true,
            showingCompleted: false,
            showingGraveyard: false,
            tabId: 0,

            showingForm: true,

            deferredTaskViews: [],
            deferredTaskCreationFunc: null
        };
        
        this.handleActiveChange = this.handleActiveChange.bind(this);
        this.toggleTab = this.toggleTab.bind(this);
        this.toggleFormOn = this.toggleFormOn.bind(this);
        this.toggleFormOff = this.toggleFormOff.bind(this);
    }
    componentDidMount() {
        this.activeTaskListAPI = RegisterToActiveTaskListAPI(this.handleActiveChange);

        // Initialise state of this component.
        this.handleActiveChange();

        ShortCutManager.registerShiftShortcut("Digit4", this.toggleFormOn);
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
        let deferredTaskViews = this.activeTaskListAPI.GetActiveTasks().filter((task) => task.category === Category.Deferred);

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
                            formStateManager={ null }
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
                            formStateManager={ null }
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
                            formStateManager={ null }
                        />
                    }
                    <CreationForm
                            creationFunction={this.state.deferredTaskCreationFunc} 
                            showingForm={this.state.showingForm}
                            submitAction={this.toggleFormOff}
                            formStateManager={this.props.formStateManager}
                            formText={this.props.formText}
                    />
                </div>
            </div>
        );
    }
}