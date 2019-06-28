import React, { Component } from 'react';
import { Task } from './Task';

export class TaskList extends Component {
    render() {
        // Create a list of Task components, passing in a read-only taskView object to each, as a property! We also need to specify a key, since these items are 'keyed'
        const taskDomainObjectsArray = this.props.tasks;
        const taskComponentArray = taskDomainObjectsArray.map((item) => {
            if (item.isSpacer === undefined || !item.isSpacer) {
                let taskView = item;
                return <Task 
                    key={taskView.id} 
                    taskView={taskView} 
                    highlights={this.props.highlights} 
                    hightlightEventCallbacks={this.props.hightlightEventCallbacks}
                    completionAnimIds={this.props.completionAnimIds}
                    failureAnimIds={this.props.failureAnimIds}
                    animTriggerCallbacks={this.props.animTriggerCallbacks}
                    formStateManager={this.props.formStateManager}
                />;
            }
            else {
                return <DateSpacer
                    key={item.time.valueOf()}
                    showDay={item.showDay}
                    date={item.time}
                />;
            }
        });

        return(
            <div className="task-list-container">
                {taskComponentArray}
            </div>
        );
    }
}

class DateSpacer extends Component {
    render() {
        let dateString;
        if (isToday(this.props.date)) {
            dateString = "Today";
        }
        else if (isYesterday(this.props.date)) {
            dateString = "Yesterday";
        }
        else if (this.props.showDay) {
            dateString = this.props.date.toLocaleString('en-US', { weekday: 'long', day: 'numeric', month: 'long' });
        }
        else {
            dateString = this.props.date.toLocaleString('en-US', { month: 'long', year: 'numeric' });
        }

        return (
            <div className="dateSpacer">
                { dateString }
            </div>
        );
    }
}

const isToday = (someDate) => {
    const today = new Date();
    return someDate.getDate() === today.getDate() &&
        someDate.getMonth() === today.getMonth() &&
        someDate.getFullYear() === today.getFullYear();
}
const isYesterday = (someDate) => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return someDate.getDate() === yesterday.getDate() &&
        someDate.getMonth() === yesterday.getMonth() &&
        someDate.getFullYear() === yesterday.getFullYear();
}