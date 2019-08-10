import React, { Component } from 'react';

import { MainSectionLayout, SidebarSectionLayout } from './SectionLayouts';
import { Category } from '../../logicLayer/Task';
import { TaskList } from '../TaskList';
import { ColourIdTracker } from '../../viewLogic/colourSetManager';

import { SvgIconWrapper } from '../TaskButtons';
import { ReactComponent as TrophyIcon } from '../../icons/trophy.svg';

export class BacklogTaskStateManager extends Component {
    constructor(props) {
        super(props);

        this.state = {
            deferredTaskViews: [],
            completedTaskViews: [],
            failedTaskViews: [],

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
            <>
            { this.props.showActiveTasksAsMain &&
                <SidebarSectionLayout
                    names={['Backlog', 'Completed', 'Graveyard']}
                    useCreationForm={true}
                    creationFunction={this.state.deferredTaskCreationFunc} 
                    formStateManager={this.props.formStateManager}
                    formText={this.props.formText}
                    tasklists={[
                        buildInactiveTasklist(this.state.deferredTaskViews, this.props.formStateManager, this.props.colourGetter),
                        buildInactiveTasklist(this.state.completedTaskViews, this.props.formStateManager, this.props.colourGetter),
                        buildInactiveTasklist(this.state.failedTaskViews, this.props.formStateManager, this.props.colourGetter)
                    ]}
                />
            }
            { !this.props.showActiveTasksAsMain &&
                <MainSectionLayout
                    formStateManager={this.props.formStateManager}
                    creationFunctions={[this.state.deferredTaskCreationFunc, null, null]}
                    titles={["Backlog Tasks", "Completed Tasks", "Failed Tasks"]}
                    tooltips={["Create a new task on the backlog", "", ""]}
                    formText={["New backlog task", "", ""]}
                    shortcutkeys={["Digit1", "", ""]}
                    icons={[
                        <SvgIconWrapper clickAction={() => {}} className="iconWrapper goalIcon">
                            <TrophyIcon className="icon"/>
                        </SvgIconWrapper>,
                        <SvgIconWrapper clickAction={() => {}} className="iconWrapper goalIcon">
                            <TrophyIcon className="icon"/>
                        </SvgIconWrapper>,
                        <SvgIconWrapper clickAction={() => {}} className="iconWrapper goalIcon">
                            <TrophyIcon className="icon"/>
                        </SvgIconWrapper>
                    ]}
                    tasklists={[
                        buildInactiveTasklist(this.state.deferredTaskViews, this.props.formStateManager, this.props.colourGetter),
                        buildInactiveTasklist(this.state.completedTaskViews, this.props.formStateManager, this.props.colourGetter),
                        buildInactiveTasklist(this.state.failedTaskViews, this.props.formStateManager, this.props.colourGetter)
                    ]}
                />
            }
            </>
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
