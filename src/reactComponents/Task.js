import React, { Component } from 'react';

export class Task extends Component {
    // For now, just represent a task as a div with text in it!
    render() {
        return (
            <div className="task">
                <p> { this.props.taskView.name } </p>
            </div>
        );
    }
}