import React, { Component } from 'react';
import { RegisterToActiveTaskListAPI } from '../interactionLayer/interactionApi';
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
            highlightedTaskIds: []
        };
        this.highlightedTaskIds = [];
        this.handleChange = this.handleChange.bind(this);
        this.registerForHighlights = this.registerForHighlights.bind(this);
        this.unregisterForHighlights = this.unregisterForHighlights.bind(this);
    }
    componentDidMount() {
        // This is the 'root' component which receives callbacks from the interaction layer, and passes down
        // all of the data views down to the child components.
        this.activeTaskListAPI = RegisterToActiveTaskListAPI(this.handleChange);     // We must make sure the callback is bound to this class.

        // Initialise state of this component
        this.handleChange();
    }

    // Callback for when tasks are hovered over and we need to highlight them, and all their relatives.
    registerForHighlights(id) {
        console.log("ENTERED: " + id);
        let map = this.taskMap;
        let task = map.get(id);
        console.log(task);
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
        console.log("EXITED: " + id);
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
    searchUp(t, relatives, map) {
        if (t === null || t === undefined) return;
        relatives.push(t.id);
        this.searchUp(map.get(t.parent), relatives, map);
    }
    searchDown(t, relatives, map) {
        if (t === null || t === undefined) return;
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
                />
            </div>
        );
    }
}