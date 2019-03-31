import React, { Component } from 'react';
import { GetColourMapping } from '../viewLogic/colourSetManager';
import { ThemeId } from '../viewLogic/colourSetManager';

export class Task extends Component {
    constructor(props) {
        super(props);

        this.onMouseEnter = this.onMouseEnter.bind(this);
        this.onMouseLeave = this.onMouseLeave.bind(this);
    }

    onMouseEnter() {
        this.props.hightlightEventCallbacks.register(this.props.taskView.id);
    }
    onMouseLeave() {
        this.props.hightlightEventCallbacks.unregister(this.props.taskView.id);
    }

    // For now, just represent a task as a div with text in it!
    render() {
        // Attain background colour programmatically
        const style = {
            backgroundColor: GetColourMapping(this.context.themeId).get(this.props.taskView.colourid)
        };
        let highlight = this.props.highlights.filter((id) => id === this.props.taskView.id);
        let classstring = "task" + (highlight.length === 0 ? "" : " highlighted");

        return (
            <div className={classstring} style={style} onMouseEnter={this.onMouseEnter} onMouseLeave={this.onMouseLeave}>
                <p> { this.props.taskView.name } </p>
            </div>
        );
    }
}
Task.contextType = ThemeId;