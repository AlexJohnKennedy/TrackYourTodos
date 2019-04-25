import React, { Component } from 'react';
import { GetColourMapping, ThemeId, HSLAColour } from '../viewLogic/colourSetManager';
import { NewTaskButton, CheckBox } from './TaskButtons';
import { CreationForm } from './CreationForm.js';
import { Category, ProgressStatus } from '../logicLayer/Task';

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
        else if (this.props.taskView.progressStatus === ProgressStatus.Completed) {
            //return new HSLAColour(hslacol.hue, hslacol.sat, hslacol.light * 0.75, 100);
            return new HSLAColour(122, 75, 35, 100);
        }
        else if (this.props.taskView.progressStatus >= ProgressStatus.Failed) {
            return new HSLAColour(hslacol.hue, hslacol.sat * 0.025, hslacol.light * 0.4, 100);
        }
        else {
            // Lets just darken all colours a tad..
            return new HSLAColour(hslacol.hue, hslacol.sat, hslacol.light * 0.85, 100);
        }
    }

    // For now, just represent a task as a div with text in it!
    render() {
        // Attain background colour programmatically, and apply side padding iff the checkbox is present.
        let processedColour = this.processColour(GetColourMapping(this.context.themeId).get(this.props.taskView.colourid));
        const style = {
            backgroundColor: processedColour.toString(),
        };
        if (this.props.taskView.category <= Category.Daily) {
            style.paddingLeft = "2rem";
            style.paddingRight = "2rem";
        }

        // Determine if this task should be highlighted, by determining if our id is in the highlight list.
        let highlight = this.props.highlights.filter((id) => id === this.props.taskView.id);

        // Determine if we need to apply an animation class name.
        let completion = this.props.completionAnimIds.filter(id => id === this.props.taskView.id);
        let failure = this.props.failureAnimIds.filter(id => id === this.props.taskView.id);
        let animClassname = null;
        if (completion.length > 0) {
            animClassname = " completionAnim";
        }
        else if (failure.length > 0) {
            animClassname = " failureAnim";
        }

        let classstring = "task" + (highlight.length === 0 ? "" : " highlighted") + (animClassname === null ? " entranceAnim" : animClassname);
        return (
            <div className={classstring} style={style} onMouseEnter={this.onMouseEnter} onMouseLeave={this.onMouseLeave}>
                <p> { this.props.taskView.name } </p>
                { this.props.taskView.category < Category.Weekly && this.props.taskView.progressStatus <= ProgressStatus.Started &&
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
                { this.props.taskView.category < Category.Daily && this.props.taskView.progressStatus <= ProgressStatus.Started &&
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
                { this.props.taskView.category <= Category.Daily && this.props.taskView.progressStatus <= ProgressStatus.Started &&
                    <CheckBox 
                        firstClickAction={() => this.props.taskView.StartTask()}
                        secondClickAction={() => {
                            this.props.animTriggerCallbacks.register(this.props.taskView.id, true);
                            window.setTimeout(() => {
                                this.props.animTriggerCallbacks.unregister(this.props.taskView.id, true);
                                this.props.taskView.CompleteTask();
                            }, 699);
                        }}
                    />
                }
                { this.props.taskView.category === Category.Deferred &&
                    <>
                    <NewTaskButton clickAction={() => this.props.taskView.ActivateTask(Category.Daily)} text={'D'}/>
                    <NewTaskButton clickAction={() => this.props.taskView.ActivateTask(Category.Weekly)} text={'W'}/>
                    <NewTaskButton clickAction={() => this.props.taskView.ActivateTask(Category.Goal)} text={'G'}/>
                    </>
                }
                { this.props.taskView.progressStatus === ProgressStatus.Failed &&
                    <>
                    <NewTaskButton clickAction={() => this.props.taskView.ReviveTask(false)} text={'<'}/>
                    <NewTaskButton clickAction={() => this.props.taskView.ReviveTask(true)} text={'<'}/>
                    </>
                }
            </div>
        );
    }
}
Task.contextType = ThemeId;