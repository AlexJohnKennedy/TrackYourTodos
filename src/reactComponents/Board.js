import React, { Component } from 'react';
import { Task } from './Task';
import { NewTaskButton } from './NewTaskButton';

// the 'Board' component generically represents an active task list.
// E.g., each of the three main 'lists' are Board components!
export class Board extends Component {
    render() {

        // Create a list of Task components, passing in a read-only taskView object to each, as a property! We also need to specify a key, since these items are 'keyed'
        const taskDomainObjectsArray = props.tasks;
        const taskComponentArray = taskDomainObjectsArray.map((taskView) => <Task key={taskView.id} taskView={taskView}/>);

        // Everything is wrapped in a 'bubble' thing.
        // The bubble thing has children; for the board, we want a title, an add task button, following by a list of tasks.
        return <BoardBackground key={props.category}>
            <div class="board-title-container"> {props.boardTitle} 
                <h2> {props.boardTitle} </h2>
                <NewTaskButton creationFunction={props.creationFunction}/>
            </div>
            {taskComponentArray}
        </BoardBackground>
    }
}

export class GoalBoard extends Component {
    render() {
        return <Board
            category="Goal"
            boardTitle="Goals"
            tasks={props.tasks}
            creationFunction={props.creationFunction}
        />;
    }
}
export class WeeklyBoard extends Component {
    render() {
        return <Board
            category="Weekly"
            boardTitle="Weekly Tasks"
            tasks={props.tasks}
            creationFunction={props.creationFunction}
        />;
    }
}
export class DailyBoard extends Component {
    render() {
        return <Board
            category="Daily"
            boardTitle="Daily Tasks"
            tasks={props.tasks}
            creationFunction={props.creationFunction}
        />;
    }
}