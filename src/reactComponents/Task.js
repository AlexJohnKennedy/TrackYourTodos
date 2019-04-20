import React, { Component } from 'react';
import { GetColourMapping, ThemeId, HSLAColour } from '../viewLogic/colourSetManager';
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
            showingForm: false,
            showingDailyForm: false
        };

        this.toggleFormOn = this.toggleFormOn.bind(this);
        this.toggleFormOff = this.toggleFormOff.bind(this);
    }
    
    toggleFormOn(daily) {
        this.props.formStateManager.triggerCleanup();
        if (!daily) {
            this.setState({
                showingForm: true
            });
        }
        else {
            this.setState({
                showingDailyForm: true
            });
        }
    }
    toggleFormOff(daily) {
        if (!daily) {
            this.setState({
                showingForm: false
            });
        }
        else {
            this.setState({
                showingDailyForm: false
            });
        }
    }

    onMouseEnter() {
        this.props.hightlightEventCallbacks.register(this.props.taskView.id);
    }
    onMouseLeave() {
        this.props.hightlightEventCallbacks.unregister(this.props.taskView.id);
    }

    // Private method which 'processes' a colour based on attributes of this task. e.g. desaturate grave-tasks.
    processColour(hslacol) {
        if (this.props.taskView.category === Category.Deferred) {
            // Deferred tasks should be slightly desaturated, and slightly transparent!
            return new HSLAColour(hslacol.hue, hslacol.sat * 0.025, hslacol.light * 0.5, 100);
        }
        else if (this.props.taskView.category === Category.Completed) {
            //return new HSLAColour(hslacol.hue, hslacol.sat, hslacol.light * 0.75, 100);
            return new HSLAColour(122, 75, 35, 100);
        }
        else if (this.props.taskView.category === Category.Failed) {
            return new HSLAColour(hslacol.hue, hslacol.sat * 0.025, hslacol.light * 0.4, 100);
        }
        else {
            // Lets just darken all colours a tad..
            return new HSLAColour(hslacol.hue, hslacol.sat, hslacol.light * 0.85, 100);
        }
    }

    // For now, just represent a task as a div with text in it!
    render() {
        // Attain background colour programmatically.
        let processedColour = this.processColour(GetColourMapping(this.context.themeId).get(this.props.taskView.colourid));
        const style = {
            backgroundColor: processedColour.toString()
        };
        let highlight = this.props.highlights.filter((id) => id === this.props.taskView.id);
        let classstring = "task" + (highlight.length === 0 ? "" : " highlighted");

        return (
            <div className={classstring} style={style} onMouseEnter={this.onMouseEnter} onMouseLeave={this.onMouseLeave}>
                <p> { this.props.taskView.name } </p>
                { this.props.taskView.category < Category.Weekly &&
                    <>
                    <NewTaskButton clickAction={() => this.toggleFormOn(true)} text={'>'}/>
                    <CreationForm 
                        creationFunction={this.props.taskView.CreateDailyChild} 
                        formText="New daily subtask" 
                        showingForm={this.state.showingDailyForm}
                        submitAction={() => this.toggleFormOff(true)}
                        formStateManager={this.props.formStateManager}
                    />
                    </>
                }
                { this.props.taskView.category < Category.Daily &&
                    <>
                    <NewTaskButton clickAction={() => this.toggleFormOn(false)} text={'>'}/>
                    <CreationForm 
                        creationFunction={this.props.taskView.CreateChild} 
                        formText="New subtask" 
                        showingForm={this.state.showingForm}
                        submitAction={() => this.toggleFormOff(false)}
                        formStateManager={this.props.formStateManager}
                    />
                    </>
                }
                { this.props.taskView.category === Category.Deferred &&
                    <>
                    <NewTaskButton clickAction={() => this.props.taskView.SetCategory(Category.Daily)} text={'D'}/>
                    <NewTaskButton clickAction={() => this.props.taskView.SetCategory(Category.Weekly)} text={'W'}/>
                    <NewTaskButton clickAction={() => this.props.taskView.SetCategory(Category.Goal)} text={'G'}/>
                    </>
                }
            </div>
        );
    }
}
Task.contextType = ThemeId;