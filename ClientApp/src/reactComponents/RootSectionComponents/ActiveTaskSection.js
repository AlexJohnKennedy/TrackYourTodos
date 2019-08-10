import React, { Component } from 'react';

import { MainSectionLayout } from './SectionLayouts';

import { Category } from '../../logicLayer/Task';
import { TaskList } from '../TaskList';
import { ColourIdTracker } from '../../viewLogic/colourSetManager';

import { SvgIconWrapper } from '../TaskButtons';

import { ReactComponent as TrophyIcon } from '../../icons/trophy.svg';
import { ReactComponent as WeekIcon } from '../../icons/calendar.svg';
import { ReactComponent as DailyCheckMarkIcon } from '../../icons/DailyCheckMark.svg';


export class ActiveTaskSection extends Component {
    constructor(props) {
        super(props);

        this.taskMap = null;    // This will be a map of taskViews based on id.
        this.state = {
            goalTaskViews : [],
            weekTaskViews : [],
            dayTaskViews : [],
            goalCreationFunc : () => {},
            weekCreationFunc : () => {},
            dayCreationFunc : () => {},
            highlightedTaskIds: [],
            completionAnimIds: [],
            failureAnimIds: [],
        };
        this.highlightedTaskIds = [];
        this.handleChange = this.handleChange.bind(this);
        this.registerForHighlights = this.registerForHighlights.bind(this);
        this.unregisterForHighlights = this.unregisterForHighlights.bind(this);
        this.registerForAnimation = this.registerForAnimation.bind(this);
        this.unregisterForAnimation = this.unregisterForAnimation.bind(this);
        this.initialCheck = null;
        this.intervalCheck = null;
    }
    setupWithNewDataModelInstance() {
        window.clearInterval(this.intervalCheck);
        window.clearTimeout(this.initialCheck);

        // Register to access, and recieve updates from, the active take list in the data-model instance handed to us.
        this.activeTaskListAPI = this.props.dataModelScope.RegisterToActiveTaskListAPI(this.handleChange);

        // Setup timing callbacks for task-failure checks. This will the be the callback we register for OnDataLoad callbacks.
        const checkAction = () => {
            console.log("Periodically checking for failed tasks now.");
            let ids = this.activeTaskListAPI.PerformFailureCheck(800, id => this.unregisterForAnimation(id, false));
            ids.forEach(id => this.registerForAnimation(id, false));
        };

        // Register for a 'failure check' and a state-query when the Server data loads, via the Data-model scope.
        this.props.dataModelScope.RegisterForOnInitialDataLoadCallback(() => {
            this.initialCheck = window.setTimeout(checkAction, 2000);   // Wait 2 seconds before 'melting' the failed tasks
            this.intervalCheck = window.setInterval(() => { 
                checkAction();
                this.props.dataModelScope.RefreshStatisticsModel();
            }, 3600000);  // Re-check for failures every hour, and refresh the statistics model every hour in case of day roll-over.
            this.handleChange();
        });
        this.props.dataModelScope.RegisterForOnDataRefreshCallback(this.handleChange);

        // Initialise state of this component
        this.handleChange();
    }
    componentDidMount() {
        this.setupWithNewDataModelInstance();
    }
    componentDidUpdate(prevProps, prevState, snapshot) {
        if (prevProps.dataModelScope !== this.props.dataModelScope) {
            this.setupWithNewDataModelInstance();
        }
    }
    componentWillUnmount() {
        window.clearInterval(this.intervalCheck);
        window.clearTimeout(this.initialCheck);
    }
    
    
    // Callback for when tasks are hovered over and we need to highlight them, and all their relatives.
    registerForHighlights(id) {
        let map = this.taskMap;
        let task = map.get(id);
        let relatives = [id];
        this.searchUp(map.get(task.parent), relatives, map);
        for (let childid of task.children) {
            this.searchDown(map.get(childid), relatives, map);
        }
        this.highlightedTaskIds = this.highlightedTaskIds.concat(relatives);
        this.setState({
            highlightedTaskIds: this.highlightedTaskIds
        });
    }
    unregisterForHighlights(id) {
        let map = this.taskMap;
        let task = map.get(id);
        let relatives = [id];
        this.searchUp(map.get(task.parent), relatives, map);
        for (let childid of task.children) {
            this.searchDown(map.get(childid), relatives, map);
        }
        this.highlightedTaskIds = this.highlightedTaskIds.filter((id) => !relatives.includes(id));
        this.setState({
            highlightedTaskIds: this.highlightedTaskIds
        });
    }
    registerForAnimation(id, completionAnim) {
        // Apply anim classname to this id, and all children.
        let map = this.taskMap;
        let task = map.get(id);
        let relatives = [id];
        task.children.forEach(childid => this.searchDown(map.get(childid), relatives, map));
        if (completionAnim) {
            this.setState((state, props) => ({
                completionAnimIds: state.completionAnimIds.concat({ root: id, relatives: relatives })
            }));
        }
        else {
            this.setState((state, props) => ({
                failureAnimIds: state.failureAnimIds.concat({ root: id, relatives: relatives })
            }));
        }
    }
    unregisterForAnimation(id, completionAnim) {
        if (completionAnim) {
            this.setState((state, props) => ({
                completionAnimIds: state.completionAnimIds.filter(obj => obj.root !== id)
            }));
        }
        else {
            this.setState((state, props) => ({
                failureAnimIds: state.failureAnimIds.filter(obj => obj.root !== id)
            }));
        }
    }
    searchUp(t, relatives, map) {
        if (t === null || t === undefined) return;
        relatives.push(t.id);
        this.searchUp(map.get(t.parent), relatives, map);
    }
    searchDown(t, relatives, map) {
        if (t === null || t === undefined || t > Category.Daily) return;
        relatives.push(t.id);
        for (let childid of t.children) {
            this.searchDown(map.get(childid), relatives, map);
        }
    }

    // Update callback. In this design, the entire list will re-populate all tasks upon any change.
    handleChange() {
        let allTaskViews = this.activeTaskListAPI.GetActiveTasks();

        // Filter into three different lists based on category
        let goalTaskViews = allTaskViews.filter((task) => task.category === Category.Goal);
        let weekTaskViews = allTaskViews.filter((task) => task.category === Category.Weekly);
        let dayTaskViews  = allTaskViews.filter((task) => task.category === Category.Daily);

        // Put all of the taskviews into the id map
        this.taskMap = new Map();
        allTaskViews.map((task) => this.taskMap.set(task.id, task));

        // Update this component's state; which will re-render everything!
        this.setState({
            goalTaskViews : goalTaskViews,
            weekTaskViews : weekTaskViews,
            dayTaskViews : dayTaskViews,
            goalCreationFunc : this.activeTaskListAPI.GetCreationFunction(Category.Goal, ColourIdTracker.useNextColour),
            weekCreationFunc : this.activeTaskListAPI.GetCreationFunction(Category.Weekly, ColourIdTracker.useNextColour),
            dayCreationFunc : this.activeTaskListAPI.GetCreationFunction(Category.Daily, ColourIdTracker.useNextColour)
        });
    }

    // Render the child elements and pass in the correct callbacks and taskviews from our react-state.
    render() {
        const completionAnimIdsArray = [];
        this.state.completionAnimIds.forEach(o => o.relatives.forEach(id => completionAnimIdsArray.push(id)));
        const failureAnimIdsArray = [];
        this.state.failureAnimIds.forEach(o => o.relatives.forEach(id => failureAnimIdsArray.push(id)));

        const tasklistBuilder = buildBuilder(this.props.formStateManager, this.props.colourGetter, this.state.highlightedTaskIds, completionAnimIdsArray,
            failureAnimIdsArray, this.registerForAnimation, this.unregisterForAnimation, this.registerForHighlights, this.unregisterForHighlights);

        return (
            <MainSectionLayout
                formStateManager={this.props.formStateManager}
                creationFunctions={[this.state.goalCreationFunc, this.state.weekCreationFunc, this.state.dayCreationFunc]}
                titles={["Goal", "Weekly Tasks", "Daily Tasks"]}
                tooltips={["Create a new goal task", "Create new weekly task", "Create new daily task"]}
                formText={["New goal", "New weekly task", "New daily task"]}
                shortcutkeys={["Digit1", "Digit2", "Digit3"]}
                icons={[
                    <SvgIconWrapper clickAction={() => {}} className="iconWrapper goalIcon">
                        <TrophyIcon className="icon"/>
                    </SvgIconWrapper>,
                    <SvgIconWrapper clickAction={() => {}} className="iconWrapper weekIcon">
                        <WeekIcon className="icon" />
                    </SvgIconWrapper>,
                    <SvgIconWrapper clickAction={() => {}} className="iconWrapper dayIcon">
                        <DailyCheckMarkIcon className="icon"/>
                    </SvgIconWrapper>
                ]}
                tasklists={[
                    tasklistBuilder(this.state.goalTaskViews),
                    tasklistBuilder(this.state.weekTaskViews),
                    tasklistBuilder(this.state.dayTaskViews)
                ]}
            />
        );
    }
}

// helper
function buildBuilder(formStateManager, colourGetter, highlightIds, completeAnimIds, failAnimIds, regAnim, unregAnim, regHighlight, unregHighlight) {
    return function buildActiveTasklist(taskViews) {
        return <TaskList
            tasks={taskViews}
            highlights={highlightIds}
            hightlightEventCallbacks={{
                register: regHighlight,
                unregister: unregHighlight
            }}
            completionAnimIds={completeAnimIds}
            failureAnimIds={failAnimIds}
            animTriggerCallbacks={{
                register: regAnim,
                unregister: unregAnim
            }}
            formStateManager={formStateManager}
            colourGetter={colourGetter}
        />;
    }
}
