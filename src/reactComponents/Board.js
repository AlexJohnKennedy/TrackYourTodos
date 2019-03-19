import React, { Component } from 'react';
import { Task } from './Task';
import { NewTaskButton } from './NewTaskButton.js';

// the 'Board' component generically represents an active task list.
// E.g., each of the three main 'lists' are Board components!
export class Board extends Component {
    render() {

        // Create a list of Task components, passing in a read-only taskView object to each, as a property! We also need to specify a key, since these items are 'keyed'
        const taskDomainObjectsArray = this.props.tasks;
        const taskComponentArray = taskDomainObjectsArray.map((taskView) => <Task key={taskView.id} taskView={taskView}/>);

        // Everything is wrapped in a 'bubble' thing.
        // The bubble thing has children; for the board, we want a title, an add task button, following by a list of tasks.
        return <React.Fragment key={this.props.category}>
            <div className="board-title-container"> 
                <h2> {this.props.boardTitle} </h2>
                <NewTaskButton creationFunction={this.props.creationFunction}/>
            </div>
            {taskComponentArray}
        </React.Fragment>
    }
}

export class GoalBoard extends Component {
    render() {
        return <Board
            category="Goal"
            boardTitle="Goals"
            tasks={this.props.tasks}
            creationFunction={this.props.creationFunction}
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
        />;
    }
}