import React, { Component } from 'react';
import { CreationForm } from './CreationForm.js';
import { ShortCutManager } from '../viewLogic/keyboardShortcutHandler';
import { SvgIconWrapper } from './TaskButtons';
import { MAX_TASK_NAME_LEN } from '../logicLayer/Task';

import { ReactComponent as AddIcon } from '../icons/add-filled-cross-sign.svg';
import { ReactComponent as TrophyIcon } from '../icons/trophy.svg';
import { ReactComponent as WeekIcon } from '../icons/calendar.svg';
import { ReactComponent as DailyCheckMarkIcon } from '../icons/DailyCheckMark.svg';
import { ReactComponent as CrossIcon } from '../icons/close-button.svg';


// the 'Board' component generically represents an active task list.
// E.g., each of the three main 'lists' are Board components!
export class Board extends Component {
    constructor(props) {
        super(props);

        // Setup state. The only state this component requires is whether we are currently rendering the creation form.
        this.state = {
            showingForm: false
        };

        this.toggleFormOn = this.toggleFormOn.bind(this);
        this.toggleFormOff = this.toggleFormOff.bind(this);
    }
    componentDidMount() {
        if (this.props.useCreationForm === true) {
            ShortCutManager.registerShiftShortcut(this.props.shortcutkey, this.toggleFormOn);
        }
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

    render() {
        const clearFormStateCallbacks = () => this.props.formStateManager.clearCallbacks();

        // Everything is wrapped in a 'bubble' thing.
        // The bubble thing has children; for the board, we want a title, an add task button, following by a list of tasks.
        return (
            <div className="board" key={this.props.category}>
                <div className="board-title-container">
                    {this.props.icon}
                    <h2> {this.props.boardTitle} </h2>
                    { this.props.useCreationForm === true &&
                        <AddIcon className="button" onClick={this.toggleFormOn} />
                    }
                </div>
                {this.props.tasklist}
                { this.props.useCreationForm === true && 
                    <CreationForm
                        creationFunction={this.props.creationFunction}
                        showingForm={this.state.showingForm}
                        submitAction={() => { clearFormStateCallbacks(); this.toggleFormOff(); }}
                        formStateManager={this.props.formStateManager}
                        formText={this.props.formText}
                        maxFieldLength={MAX_TASK_NAME_LEN}
                    >
                        <SvgIconWrapper className="button" clickAction={this.toggleFormOff} title="Close form">
                            <CrossIcon className="iconButton"/>
                        </SvgIconWrapper>
                    </CreationForm>
                }
            </div>
        );
    }
}

export class GoalBoard extends Component {
    render() {
        return <Board
            category="Goal"
            boardTitle="Goals"
            newTaskButtonTooltipText="Create new goal task"
            useCreationForm={this.props.useCreationForm}
            creationFunction={this.props.creationFunction}
            formText="New goal"
            formStateManager={this.props.formStateManager}
            shortcutkey="Digit1"
            tasklist={this.props.tasklist}
            icon={
            <SvgIconWrapper clickAction={() => {}} className="iconWrapper goalIcon">
                <TrophyIcon className="icon"/>
            </SvgIconWrapper>
            }
        />;
    }
}
export class WeeklyBoard extends Component {
    render() {
        return <Board
            category="Weekly"
            boardTitle="Weekly Tasks"
            newTaskButtonTooltipText="Create new weekly task"
            useCreationForm={this.props.useCreationForm}
            creationFunction={this.props.creationFunction}
            formText="New weekly task"
            formStateManager={this.props.formStateManager}
            shortcutkey="Digit2"
            tasklist={this.props.tasklist}
            icon={
            <SvgIconWrapper clickAction={() => {}} className="iconWrapper weekIcon">
                <WeekIcon className="icon" />
            </SvgIconWrapper>
            }
        />;
    }
}
export class DailyBoard extends Component {
    render() {
        return <Board
            category="Daily"
            boardTitle="Daily Tasks"
            newTaskButtonTooltipText="Create new daily task"
            useCreationForm={this.props.useCreationForm}
            creationFunction={this.props.creationFunction}
            formText="New daily task"
            formStateManager={this.props.formStateManager}
            shortcutkey="Digit3"
            tasklist={this.props.tasklist}
            icon={
            <SvgIconWrapper clickAction={() => {}} className="iconWrapper dayIcon">
                <DailyCheckMarkIcon className="icon"/>
            </SvgIconWrapper>
            }
        />;
    }
}