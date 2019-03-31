import React, { Component } from 'react';
import { GetColourMapping } from '../viewLogic/colourSetManager';
import { ThemeId } from '../viewLogic/colourSetManager';
import { NewTaskButton } from './NewTaskButton';
import { CreationForm } from './CreationForm.js';
import { Category } from '../logicLayer/Task';

export class Task extends Component {
    constructor(props) {
        super(props);

        this.onMouseEnter = this.onMouseEnter.bind(this);
        this.onMouseLeave = this.onMouseLeave.bind(this);

        // Setup state. The only state this component requires is whether we are currently rendering the creation form.
        this.state = {
            showingForm: false
        };

        this.toggleFormOn = this.toggleFormOn.bind(this);
        this.toggleFormOff = this.toggleFormOff.bind(this);
    }
    
    toggleFormOn() {
        this.props.formStateManager.triggerCleanup();
        this.setState({
            showingForm: true
        });
    }
    toggleFormOff() {
        this.setState({
            showingForm: false
        });
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
                { this.props.taskView.category < Category.Daily &&
                    <>
                    <NewTaskButton clickAction={this.toggleFormOn}/>
                    <CreationForm 
                        creationFunction={this.props.taskView.CreateChild} 
                        formText="New subtask" 
                        showingForm={this.state.showingForm}
                        submitAction={this.toggleFormOff}
                        formStateManager={this.props.formStateManager}
                    />
                    </>
                }
            </div>
        );
    }
}
Task.contextType = ThemeId;