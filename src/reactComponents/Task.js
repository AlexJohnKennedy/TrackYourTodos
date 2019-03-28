import React, { Component } from 'react';
import { GetColourMapping } from '../viewLogic/colourSetManager';
import { ThemeId } from '../viewLogic/colourSetManager';

export class Task extends Component {
    // For now, just represent a task as a div with text in it!
    render() {
        // Attain background colour programmatically
        const style = {
            backgroundColor: GetColourMapping(this.context.themeId).get(this.props.taskView.colourid)
        };
        
        return (
            <div className="task" style={style}>
                <p> { this.props.taskView.name } </p>
            </div>
        );
    }
}
Task.contextType = ThemeId;