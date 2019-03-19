import React, { Component } from 'react';

// the 'Board' component generically represents an active task list.
// E.g., each of the three main 'lists' are Board components!
export class NewTaskButton extends Component {
    render() {
        return (
            <button onClick={this.props.creationFunction}>
                CLICK THIS SHIT
            </button>
        );
    }
}