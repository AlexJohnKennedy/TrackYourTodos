import React, { Component } from 'react';
import { RegisterToActiveTaskListAPI } from '../interactionLayer/interactionApi';
import { Category } from '../logicLayer/Task';
import { GoalBoard, WeeklyBoard, DailyBoard } from './Board';

export class ActiveTaskSection extends Component {
    constructor(props) {
        super(props);
        this.state = {
            goalTaskViews : [],
            weekTaskViews : [],
            dayTaskViews : [],
            goalCreationFunc : () => {},
            weekCreationFunc : () => {},
            dayCreationFunc : () => {}
        };
        this.handleChange = this.handleChange.bind(this)
    }
    componentDidMount() {
        // This is the 'root' component which receives callbacks from the interaction layer, and passes down
        // all of the data views down to the child components.
        this.activeTaskListAPI = RegisterToActiveTaskListAPI(this.handleChange);     // We must make sure the callback is bound to this class.

        // Initialise state of this component
        this.handleChange();

        console.log("Finished mounting");
        console.log(this.state);
    }

    // Update callback. In this design, the entire list will re-populate all tasks upon any change.
    handleChange() {
        let allTaskViews = this.activeTaskListAPI.GetActiveTasks();

        // Filter into three different lists based on category
        let goalTaskViews = allTaskViews.filter((task) => task.category === Category.Goal);
        let weekTaskViews = allTaskViews.filter((task) => task.category === Category.Weekly);
        let dayTaskViews  = allTaskViews.filter((task) => task.category === Category.Daily);

        // Update this component's state; which will re-render everything!
        this.setState({
            goalTaskViews : goalTaskViews,
            weekTaskViews : weekTaskViews,
            dayTaskViews : dayTaskViews,
            goalCreationFunc : this.activeTaskListAPI.GetCreationFunction(Category.Goal),
            weekCreationFunc : this.activeTaskListAPI.GetCreationFunction(Category.Weekly),
            dayCreationFunc : this.activeTaskListAPI.GetCreationFunction(Category.Daily)
        });
    }

    // Render the child elements and pass in the correct callbacks and taskviews from our react-state.
    render() {
        return (
            <React.Fragment>
                <GoalBoard 
                tasks={this.state.goalTaskViews}
                creationFunction={this.state.goalCreationFunc}
                />
                <WeeklyBoard 
                    tasks={this.state.weekTaskViews}
                    creationFunction={this.state.weekCreationFunc}
                />
                <DailyBoard 
                    tasks={this.state.dayTaskViews}
                    creationFunction={this.state.dayCreationFunc}
                />
            </React.Fragment>
        );
    }
}