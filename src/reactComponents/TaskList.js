import React, { Component } from 'react';
import { Task } from './Task';

export class TaskList extends Component {
    render() {
        // Create a list of Task components, passing in a read-only taskView object to each, as a property! We also need to specify a key, since these items are 'keyed'
        const taskDomainObjectsArray = this.props.tasks;
        const taskComponentArray = taskDomainObjectsArray.map(
            (taskView) => <Task 
                key={taskView.id} 
                taskView={taskView} 
                highlights={this.props.highlights} 
                hightlightEventCallbacks={this.props.hightlightEventCallbacks}
                formStateManager={this.props.formStateManager}/>
        );

        return(
            <div className="task-list-container">
                {taskComponentArray}
            </div>
        );
    }
}