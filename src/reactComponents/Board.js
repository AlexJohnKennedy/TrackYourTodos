import React, { Component } from 'react';
import { Task } from './Task';
import { NewTaskButton } from './NewTaskButton.js';
import { CreationForm } from './CreationForm.js';
import { ShortCutManager } from '../viewLogic/keyboardShortcutHandler';

// the 'Board' component generically represents an active task list.
// E.g., each of the three main 'lists' are Board components!
export class Board extends Component {
    constructor(props) {
        super(props);

        // Setup state. The only state this component requires is whether we are currently rendering the creation form.
        this.state = {
            showingForm: false
        };

        this.toggleFormOn = this.toggleFormOn.bind(this);
        this.toggleFormOff = this.toggleFormOff.bind(this);
    }
    componentDidMount() {
        ShortCutManager.registerShiftShortcut(this.props.shortcutkey, this.toggleFormOn);
    }
    
    toggleFormOn() {
        this.props.formStateManager.triggerCleanup();
        this.setState({
            showingForm: true
        });
    }
    toggleFormOff() {
        this.setState({
            showingForm: false
        });
    }

    render() {
        // Create a list of Task components, passing in a read-only taskView object to each, as a property! We also need to specify a key, since these items are 'keyed'
        const taskDomainObjectsArray = this.props.tasks;
        const taskComponentArray = taskDomainObjectsArray.map((taskView) => <Task key={taskView.id} taskView={taskView}/>);

        // Everything is wrapped in a 'bubble' thing.
        // The bubble thing has children; for the board, we want a title, an add task button, following by a list of tasks.
        return (
            <div className="board" key={this.props.category}>
                <div className="board-title-container"> 
                    <h2> {this.props.boardTitle} </h2>
                    <NewTaskButton clickAction={this.toggleFormOn}/>
                </div>
                <div className="task-list-container">
                    {taskComponentArray}
                </div>
                <CreationForm 
                    creationFunction={this.props.creationFunction} 
                    textPrompt={this.props.formText} 
                    showingForm={this.state.showingForm}
                    submitAction={this.toggleFormOff}
                    formStateManager={this.props.formStateManager}
                    formText={this.props.formText}
                />
            </div>
        );
    }
}

export class GoalBoard extends Component {
    render() {
        return <Board
            category="Goal"
            boardTitle="Goals"
            tasks={this.props.tasks}
            creationFunction={this.props.creationFunction}
            formText="New goal"
            formStateManager={this.props.formStateManager}
            shortcutkey="Digit1"
        />;
    }
}
export class WeeklyBoard extends Component {
    render() {
        return <Board
            category="Weekly"
            boardTitle="Weekly Tasks"
            tasks={this.props.tasks}
            creationFunction={this.props.creationFunction}
            formText="New weekly task"
            formStateManager={this.props.formStateManager}
            shortcutkey="Digit2"
        />;
    }
}
export class DailyBoard extends Component {
    render() {
        return <Board
            category="Daily"
            boardTitle="Daily Tasks"
            tasks={this.props.tasks}
            creationFunction={this.props.creationFunction}
            formText="New daily task"
            formStateManager={this.props.formStateManager}
            shortcutkey="Digit3"
        />;
    }
}