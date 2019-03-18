import React, { Component } from 'react';

// the 'Board' component generically represents an active task list.
// E.g., each of the three main 'lists' are Board components!
class Board extends Component {
    render() {
        const taskDomainObjectsArray = props.tasks;
        const taskComponentArray = taskDomainObjectsArray.map((domainObj) => <Task dataObject={domainObj}/>);

        // Everything is wrapped in a 'bubble' thing.
        // The bubble thing has children; for the board, we want a title, an add task button, following by a list of tasks.
        return <BoardBackground key={props.category}>
            <div class="board-title-container"> {props.boardTitle} 
                <h2> {props.boardTitle} </h2>
                <AddTaskButton/>
            </div>
            {taskComponentArray}
        </BoardBackground>
    }
}

class GoalBoard extends Component {
    render() {
        return <Board
            category="Goal"
            boardTitle="Goals"
            tasks={props.tasks}
        />;
    }
}
class WeeklyBoard extends Component {
    render() {
        return <Board
            category="Weekly"
            boardTitle="Weekly Tasks"
            tasks={props.tasks}
        />;
    }
}
class DailyBoard extends Component {
    render() {
        return <Board
            category="Daily"
            boardTitle="Daily Tasks"
            tasks={props.tasks}
        />;
    }
}