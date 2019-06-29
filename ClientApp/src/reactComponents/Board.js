import React, { Component } from 'react';
import { CreationForm } from './CreationForm.js';
import { ShortCutManager } from '../viewLogic/keyboardShortcutHandler';
import { TaskList } from './TaskList';
import { SvgIconWrapper } from './TaskButtons';
import { MAX_TASK_NAME_LEN } from '../logicLayer/Task';

import { ReactComponent as AddIcon } from '../icons/add-filled-cross-sign.svg';
import { ReactComponent as TrophyIcon } from '../icons/trophy.svg';
import { ReactComponent as WeekIcon } from '../icons/calendar.svg';
import { ReactComponent as DailyCheckMarkIcon } from '../icons/DailyCheckMark.svg';

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
        ShortCutManager.registerShiftShortcut(this.props.shortcutkey, this.toggleFormOn);
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
        // Everything is wrapped in a 'bubble' thing.
        // The bubble thing has children; for the board, we want a title, an add task button, following by a list of tasks.
        return (
            <div className="board" key={this.props.category}>
                <div className="board-title-container">
                    {this.props.children}
                    <h2> {this.props.boardTitle} </h2>
                    <AddIcon className="button" onClick={this.toggleFormOn} />
                </div>
                <TaskList
                    tasks={this.props.tasks}
                    highlights={this.props.highlights}
                    hightlightEventCallbacks={this.props.hightlightEventCallbacks}
                    completionAnimIds={this.props.completionAnimIds}
                    failureAnimIds={this.props.failureAnimIds}
                    animTriggerCallbacks={this.props.animTriggerCallbacks}
                    formStateManager={this.props.formStateManager}
                />
                <CreationForm
                    creationFunction={this.props.creationFunction}
                    showingForm={this.state.showingForm}
                    submitAction={this.toggleFormOff}
                    formStateManager={this.props.formStateManager}
                    formText={this.props.formText}
                    maxFieldLength={MAX_TASK_NAME_LEN}
                />
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
            tasks={this.props.tasks}
            creationFunction={this.props.creationFunction}
            formText="New goal"
            formStateManager={this.props.formStateManager}
            shortcutkey="Digit1"
            highlights={this.props.highlights}
            hightlightEventCallbacks={this.props.hightlightEventCallbacks}
            completionAnimIds={this.props.completionAnimIds}
            failureAnimIds={this.props.failureAnimIds}
            animTriggerCallbacks={this.props.animTriggerCallbacks}>
            <SvgIconWrapper className="iconWrapper goalIcon">
                <TrophyIcon className="icon"/>
            </SvgIconWrapper>
        </Board>;
    }
}
export class WeeklyBoard extends Component {
    render() {
        return <Board
            category="Weekly"
            boardTitle="Weekly Tasks"
            newTaskButtonTooltipText="Create new weekly task"
            tasks={this.props.tasks}
            creationFunction={this.props.creationFunction}
            formText="New weekly task"
            formStateManager={this.props.formStateManager}
            shortcutkey="Digit2"
            highlights={this.props.highlights}
            hightlightEventCallbacks={this.props.hightlightEventCallbacks}
            completionAnimIds={this.props.completionAnimIds}
            failureAnimIds={this.props.failureAnimIds}
            animTriggerCallbacks={this.props.animTriggerCallbacks}>
            <SvgIconWrapper className="iconWrapper weekIcon">
                <WeekIcon className="icon" />
            </SvgIconWrapper>
        </Board>;
    }
}
export class DailyBoard extends Component {
    render() {
        return <Board
            category="Daily"
            boardTitle="Daily Tasks"
            newTaskButtonTooltipText="Create new daily task"
            tasks={this.props.tasks}
            creationFunction={this.props.creationFunction}
            formText="New daily task"
            formStateManager={this.props.formStateManager}
            shortcutkey="Digit3"
            highlights={this.props.highlights}
            hightlightEventCallbacks={this.props.hightlightEventCallbacks}
            completionAnimIds={this.props.completionAnimIds}
            failureAnimIds={this.props.failureAnimIds}
            animTriggerCallbacks={this.props.animTriggerCallbacks}>
            <SvgIconWrapper className="iconWrapper dayIcon">
                <DailyCheckMarkIcon className="icon"/>
            </SvgIconWrapper>
        </Board>;
    }
}