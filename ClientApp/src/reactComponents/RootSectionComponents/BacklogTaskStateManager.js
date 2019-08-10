import React, { Component } from 'react';

import { SidebarSectionLayout } from './SectionLayouts';
import { Category } from '../../logicLayer/Task';
import { TaskList } from '../TaskList';
import { ColourIdTracker } from '../../viewLogic/colourSetManager';

export class BacklogTaskStateManager extends Component {
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
    componentDidMount() {
        this.setupWithNewDataModelInstance();
    }
    componentDidUpdate(prevProps, prevState, snapshot) {
        if (prevProps.dataModelScope !== this.props.dataModelScope) {
            this.setupWithNewDataModelInstance();
        }
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
