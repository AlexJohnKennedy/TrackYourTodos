import React, { Component } from 'react';

export class Task extends Component {
    constructor(props) {
        super(props);

        // Needed?
    }

    // For now, just represent a task as a div with text in it!
    render() {
        <div class="task">
            <p> { props.taskView.name } </p>
        </div>
    }
}