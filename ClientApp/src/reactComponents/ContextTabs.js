import React, { Component } from 'react';
import { NavigationTabs } from './NavigationTabs';
import { EventTypes } from '../logicLayer/dataEventJsonSchema';

// Wrapper around some context tabs, which is passed some callbacks from the root AppPage
// allowing us to specify the navigation-tabs callback to switch the current context.
// We are handed a list of strings which specifies the contexts we are allowed to show.
export class ContextTabs extends Component {
    constructor(props) {
        super(props);

        this.state = {
            peekStack: () => null,
            performUndo: () => null,
            tooltipText: "Nothing to undo!"
        };

        this.handleActiveChange = this.handleActiveChange.bind(this);
    }
    setupWithNewDataModelInstance() {
        // Register to recieve view layer updates, so we can keep our undo button tooltip up to date.
        this.setState({
            peekStack: this.props.dataModelScope.PeekUndoStack,
            performUndo: this.props.dataModelScope.PerformUndo
        });
        this.props.dataModelScope.RegisterToActiveTaskListAPI(this.handleActiveChange);
        this.props.dataModelScope.RegisterForOnInitialDataLoadCallback(this.handleActiveChange);
        this.props.dataModelScope.RegisterForOnDataRefreshCallback(this.handleActiveChange);

        // Initialise state of this component.
        this.handleActiveChange();
    }
    componentDidMount() {
        this.setupWithNewDataModelInstance();
    }
    componentDidUpdate(prevProps, prevState, snapshot) {
        if (prevProps.dataModelScope !== this.props.dataModelScope) {
            this.setupWithNewDataModelInstance();
        }
    }
    handleActiveChange() {
        const titleText = this.getUndoButtomTooltipMessage(this.state.peekStack());
        if (titleText === this.state.tooltipText) return;
        this.setState({
            tooltipText: titleText
        });
    }
    getUndoButtomTooltipMessage(undoAction) {
        if (undoAction === null) { return "Nothing to undo!"; }
        if (undoAction.eventType === EventTypes.taskAdded) { return "Undo Create-task"; }
        if (undoAction.eventType === EventTypes.childTaskAdded) { return "Undo Create-subtask"; }
        if (undoAction.eventType === EventTypes.taskActivated) { return "Undo Add-task-to-board"; }
        if (undoAction.eventType === EventTypes.taskCompleted) { return "Undo Complete task"; }
        if (undoAction.eventType === EventTypes.taskStarted) { return "Undo Start-task"; }
        if (undoAction.eventType === EventTypes.taskRevived) { return "Undo Retry-task"; }
        if (undoAction.eventType === EventTypes.taskEdited) { return "Undo Edit-task-text"; }
        return "Nothing to undo!";
    }

    render() {
        // Build a list of call backs which will switch the context, using the callback provided to us as a prop.
        const callbacks = this.props.selectableContexts.map(context => () => this.props.switchContext(context));
        
        // Find the index of the 'current context'. This will always be what the 'currActiveIndex' is set to!
        const currActiveIndex = this.props.selectableContexts.findIndex(s => s === this.props.currentContext);
        if (currActiveIndex < 0 || currActiveIndex > this.props.selectableContexts.length) throw new Error("Invalid current context passed: " + currActiveIndex);

        const capitaliseFirstLetter = s => s.charAt(0).toUpperCase() + s.slice(1);

        const undoButtonClassstring = "undoButton" + (this.state.peekStack === null ? " greyedOut" : "");

        return (
            <div className="ContextTabsWrapper">
                <NavigationTabs 
                    names={this.props.selectableContexts.map(s => capitaliseFirstLetter(s))}
                    callbackList={callbacks}
                    currActiveIndex={currActiveIndex}
                />
                <div className="contextSettingsButton">
                    <div onClick={this.props.togglePage}> C </div>
                </div>
                <div className={undoButtonClassstring}>
                    <div onClick={this.state.performUndo} title={this.state.tooltipText}> U </div>
                </div>
            </div>
        );
    }
}