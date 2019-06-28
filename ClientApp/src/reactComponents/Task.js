import React, { Component } from 'react';
import { GetColourMapping, ThemeId, HSLAColour } from '../viewLogic/colourSetManager';
import { NewTaskButton, CheckBox } from './TaskButtons';
import { CreationForm } from './CreationForm.js';
import { Category, ProgressStatus, MAX_TASK_NAME_LEN } from '../logicLayer/Task';

import { confirmAlert } from 'react-confirm-alert';
import 'react-confirm-alert/src/react-confirm-alert.css';

import { ReactComponent as BinIcon } from '../icons/rubbish-bin-delete-button.svg';
import { ReactComponent as SubtaskIcon } from '../icons/subtask-arrow-button.svg';

export class Task extends Component {
    constructor(props) {
        super(props);

        this.onMouseEnter = this.onMouseEnter.bind(this);
        this.onMouseLeave = this.onMouseLeave.bind(this);

        // Setup state. The only state this component requires is whether we are currently rendering the creation form.
        this.state = {
            showingForm: false,
            showingDailyForm: false,
            showingEditForm: false
        };

        this.toggleFormOn = this.toggleFormOn.bind(this);
        this.toggleFormOff = this.toggleFormOff.bind(this);
        this.toggleEditFormOn = this.toggleEditFormOn.bind(this);
        this.toggleEditFormOff = this.toggleEditFormOff.bind(this);
        this.renderAreYouSure = this.renderAreYouSure.bind(this);
    }

    toggleEditFormOn() {
        this.props.formStateManager.triggerCleanup();
        this.setState({
            showingEditForm: true,
            showingDailyForm: false,
            showingForm: false
        });
    }
    toggleEditFormOff() {
        this.setState({
            showingEditForm: false
        });
    }

    toggleFormOn(daily) {
        this.props.formStateManager.triggerCleanup();
        if (!daily) {
            this.setState({
                showingForm: true,
                showingDailyForm: false,
                showingEditForm: false
            });
        }
        else {
            this.setState({
                showingDailyForm: true,
                showingForm: false,
                showingEditForm: false
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
    processColour(hslacol, completionOverride, failureOverride) {
        if (completionOverride || this.props.taskView.progressStatus === ProgressStatus.Completed) {
            //return new HSLAColour(hslacol.hue, hslacol.sat, hslacol.light * 0.75, 100);
            return new HSLAColour(122, 75, 35, 100);
        }
        else if (failureOverride || this.props.taskView.progressStatus >= ProgressStatus.Failed) {
            return new HSLAColour(hslacol.hue, hslacol.sat * 0.025, hslacol.light * 0.4, 100);
        }
        else if (this.props.taskView.category === Category.Deferred) {
            // Deferred tasks should be slightly desaturated, and slightly transparent!
            return new HSLAColour(hslacol.hue, hslacol.sat * 0.025, hslacol.light * 0.5, 100);
        }
        else {
            // Lets just darken all colours a tad..
            return new HSLAColour(hslacol.hue, hslacol.sat, hslacol.light * 0.85, 100);
        }
    }

    // Function which triggers the 'react-confirm-alert' library I am using. See: https://www.npmjs.com/package/react-confirm-alert for usage.
    // I am using this when you click to 'abandon' an activated task. Since that action is not undoable, we will prompt with an 'are you sure?' warning.
    renderAreYouSure() {
        this.props.formStateManager.triggerCleanup();
        confirmAlert({
            title: 'Are you sure?',
            message: 'You have already commited to this task. Giving up on it will be permanently logged as a failure. You cannot undo this action',
            customUI: ({ onClose }) => <CustomConfirmationBox onClose={onClose} clickAction={() => {
                window.setTimeout(() => {
                    this.props.animTriggerCallbacks.unregister(this.props.taskView.id, false);
                    this.props.taskView.VoluntarilyFailTask();
                }, 800);
                this.props.animTriggerCallbacks.register(this.props.taskView.id, false);
                onClose();
            }}/>
        });
    };

    // For now, just represent a task as a div with text in it!
    render() {
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

        // Attain background colour programmatically, and apply side padding iff the checkbox is present.
        let processedColour = this.processColour(GetColourMapping(this.context.themeId).get(this.props.taskView.colourid), completion.length > 0, failure.length > 0);
        const style = {
            backgroundColor: processedColour.toString(),
        };
        if (this.props.taskView.category <= Category.Daily) {
            style.paddingLeft = "2rem";
            style.paddingRight = "2rem";
        }

        // If this is an 'open' task (i.e. not completed or failed), then we will allow double clicks to open the edit text form.
        // Otherwise, double clicks do nothing.
        let doubleClickAction = null;
        if (this.props.taskView.progressStatus <= ProgressStatus.Started) {
            doubleClickAction = () => this.toggleEditFormOn();
        }

        return (
            <div className={classstring} style={style} onDoubleClick={doubleClickAction} onMouseEnter={this.onMouseEnter} onMouseLeave={this.onMouseLeave}>
                <p> {this.props.taskView.name} </p>
                {this.props.taskView.progressStatus <= ProgressStatus.Started &&
                    <CreationForm
                        creationFunction={this.props.taskView.EditTaskName}
                        formText="Edit task text"
                        showingForm={this.state.showingEditForm}
                        submitAction={() => this.toggleEditFormOff()}
                        formStateManager={this.props.formStateManager}
                        maxFieldLength={MAX_TASK_NAME_LEN}
                        initialValue={this.props.taskView.name}
                    />
                }
                {this.props.taskView.category < Category.Weekly && this.props.taskView.progressStatus <= ProgressStatus.Started &&
                    <>
                        <SubtaskIcon className="iconButton subtaskButton" onClick={e => { e.stopPropagation(); this.toggleFormOn(true); }}/>
                        <CreationForm
                            creationFunction={this.props.taskView.CreateDailyChild}
                            formText="New daily subtask"
                            showingForm={this.state.showingDailyForm}
                            submitAction={() => this.toggleFormOff(true)}
                            formStateManager={this.props.formStateManager}
                            maxFieldLength={MAX_TASK_NAME_LEN}
                        />
                    </>
                }
                {this.props.taskView.category < Category.Daily && this.props.taskView.progressStatus <= ProgressStatus.Started &&
                    <>
                        <SubtaskIcon className="iconButton subtaskButton" onClick={e => { e.stopPropagation(); this.toggleFormOn(false); }}/>
                        <CreationForm
                            creationFunction={this.props.taskView.CreateChild}
                            formText="New subtask"
                            showingForm={this.state.showingForm}
                            submitAction={() => this.toggleFormOff(false)}
                            formStateManager={this.props.formStateManager}
                            maxFieldLength={MAX_TASK_NAME_LEN}
                        />
                    </>
                }
                {this.props.taskView.category <= Category.Daily && this.props.taskView.progressStatus <= ProgressStatus.Started &&
                    <>
                        <CheckBox
                            currClicks={completion.length > 0 ? 2 : this.props.taskView.progressStatus}
                            firstClickAction={() => this.props.taskView.StartTask()}
                            secondClickAction={() => {
                                this.props.animTriggerCallbacks.register(this.props.taskView.id, true);
                                window.setTimeout(() => {
                                    this.props.animTriggerCallbacks.unregister(this.props.taskView.id, true);
                                    this.props.taskView.CompleteTask();
                                }, 699);
                            }}
                        />
                        <BinIcon className="iconButton deleteButton" onClick={e => { e.stopPropagation(); this.renderAreYouSure(); }}/>
                    </>
                }
                {this.props.taskView.category === Category.Deferred &&
                    <>
                        <NewTaskButton clickAction={() => this.props.taskView.ActivateTask(Category.Daily)} text={'D'} tooltipText="Activate as daily task" />
                        <NewTaskButton clickAction={() => this.props.taskView.ActivateTask(Category.Weekly)} text={'W'} tooltipText="Activate as weekly task" />
                        <NewTaskButton clickAction={() => this.props.taskView.ActivateTask(Category.Goal)} text={'G'} tooltipText="Activate as goal task" />
                        <BinIcon className="iconButton deleteButton" onClick={e => { e.stopPropagation(); this.props.taskView.AbandonTask(); }}/>
                    </>
                }
                {this.props.taskView.progressStatus === ProgressStatus.Failed &&
                    <>
                        <NewTaskButton clickAction={() => this.props.taskView.ReviveTask(false)} text={'<'} tooltipText="Retry task and send to backlog" />
                        <NewTaskButton clickAction={() => this.props.taskView.ReviveTask(true)} text={'<'} tooltipText="Retry task. You can do it this time!" />
                    </>
                }
            </div>
        );
    }
}
Task.contextType = ThemeId;

class CustomConfirmationBox extends Component {
    render() {
        return (
            <div className="customConfirmationBox">
                <h1>Are you sure?</h1>
                <p>You have already commited to this task. Giving up on it will be permanently logged as a failure.</p>
                <p>You cannot undo this action.</p>
                <div className="flexwrapper">
                    <div className="button" onClick={this.props.clickAction}>Yes. I accept my fate as a failure</div>
                    <div className="button" onClick={this.props.onClose}>Actually, I'll give it another go</div>
                </div>
            </div>
        );
    }
}