import React, { Component } from 'react';
import { RegisterToActiveTaskListAPI, RegisterForOnDataLoadCallback } from '../interactionLayer/viewLayerInteractionApi';
import { Category } from '../logicLayer/Task';
import { GoalBoard, WeeklyBoard, DailyBoard } from './Board';
import { ColourIdTracker } from '../viewLogic/colourSetManager';

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
        this.completionAnimIds = [];
        this.failureAnimIds = [];
        this.handleChange = this.handleChange.bind(this);
        this.registerForHighlights = this.registerForHighlights.bind(this);
        this.unregisterForHighlights = this.unregisterForHighlights.bind(this);
        this.registerForAnimation = this.registerForAnimation.bind(this);
        this.unregisterForAnimation = this.unregisterForAnimation.bind(this);
        this.initialCheck = null;
        this.intervalCheck = null;
    }
    componentDidMount() {
        // This is the 'root' component which receives callbacks from the interaction layer, and passes down
        // all of the data views down to the child components.
        this.activeTaskListAPI = RegisterToActiveTaskListAPI(this.handleChange);     // We must make sure the callback is bound to this class.

        // Setup timing callbacks for task-failure checks.
        const checkAction = () => {
            let ids = this.activeTaskListAPI.PerformFailureCheck(800, id => this.unregisterForAnimation(id, false));
            ids.forEach(id => this.registerForAnimation(id, false));
        };

        RegisterForOnDataLoadCallback(() => {
            this.initialCheck = window.setTimeout(checkAction, 2000);   // Wait 2 seconds before 'melting' the failed tasks
            this.intervalCheck = window.setInterval(checkAction, 3600000);  // Re-check for failures every hour.
            this.handleChange();
        });

        // Initialise state of this component
        this.handleChange();
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
            this.completionAnimIds = this.completionAnimIds.concat(relatives);
            this.setState({ completionAnimIds: this.completionAnimIds });
        }
        else {
            this.failureAnimIds = this.failureAnimIds.concat(relatives);
            this.setState({ failureAnimIds: this.failureAnimIds });
        }
    }
    unregisterForAnimation(id, completionAnim) {
        if (completionAnim) {
            this.completionAnimIds = this.completionAnimIds.filter(curr => curr !== id);
        }
        else {
            this.failureAnimIds = this.failureAnimIds.filter(curr => curr !== id);
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
        return (
            <div className="ActiveTaskSection">
                <GoalBoard 
                    tasks={this.state.goalTaskViews}
                    creationFunction={this.state.goalCreationFunc}
                    formStateManager={this.props.formStateManager}
                    highlights={this.state.highlightedTaskIds}
                    hightlightEventCallbacks={{
                        register: this.registerForHighlights,
                        unregister: this.unregisterForHighlights
                    }}
                    completionAnimIds={this.state.completionAnimIds}
                    failureAnimIds={this.state.failureAnimIds}
                    animTriggerCallbacks={{
                        register: this.registerForAnimation,
                        unregister: this.unregisterForAnimation
                    }}
                />
                <WeeklyBoard 
                    tasks={this.state.weekTaskViews}
                    creationFunction={this.state.weekCreationFunc}
                    formStateManager={this.props.formStateManager}
                    highlights={this.state.highlightedTaskIds}
                    hightlightEventCallbacks={{
                        register: this.registerForHighlights,
                        unregister: this.unregisterForHighlights
                    }}
                    completionAnimIds={this.state.completionAnimIds}
                    failureAnimIds={this.state.failureAnimIds}
                    animTriggerCallbacks={{
                        register: this.registerForAnimation,
                        unregister: this.unregisterForAnimation
                    }}
                />
                <DailyBoard 
                    tasks={this.state.dayTaskViews}
                    creationFunction={this.state.dayCreationFunc}
                    formStateManager={this.props.formStateManager}
                    highlights={this.state.highlightedTaskIds}
                    hightlightEventCallbacks={{
                        register: this.registerForHighlights,
                        unregister: this.unregisterForHighlights
                    }}
                    completionAnimIds={this.state.completionAnimIds}
                    failureAnimIds={this.state.failureAnimIds}
                    animTriggerCallbacks={{
                        register: this.registerForAnimation,
                        unregister: this.unregisterForAnimation
                    }}
                />
            </div>
        );
    }
}