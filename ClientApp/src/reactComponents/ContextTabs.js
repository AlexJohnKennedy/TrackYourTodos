import React, { Component } from 'react';
import { NavigationTabs } from './NavigationTabs';
import { EventTypes } from '../logicLayer/dataEventJsonSchema';
import { DEFAULT_GLOBAL_CONTEXT_STRING } from '../logicLayer/Task';
import { GetColour } from '../viewLogic/colourMappings';

import { ReactComponent as SettingsIcon } from '../icons/settings-button.svg';
import { ReactComponent as UndoIcon } from '../icons/undo-arrow.svg';
import { ReactComponent as SwapIcon } from '../icons/swap-arrows.svg';


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
        if (undoAction.eventType === EventTypes.taskDeleted) { return "Undo Abandon backlog task"; }
        return "Nothing to undo!";
    }

    render() {
        // Build a list of call backs which will switch the context, using the callback provided to us as a prop.
        const callbacks = this.props.selectableContexts.map(context => () => this.props.switchContext(context));
        
        // Find the index of the 'current context'. This will always be what the 'currActiveIndex' is set to!
        const currActiveIndex = this.props.selectableContexts.findIndex(s => s === this.props.currentContext);
        if (currActiveIndex < 0 || currActiveIndex > this.props.selectableContexts.length) throw new Error("Invalid current context passed: " + currActiveIndex);

        const undoButtonClassstring = "undoButton" + (this.state.peekStack() === null ? " greyedOut" : "");
        
        const capitaliseFirstLetter = s => s.charAt(0).toUpperCase() + s.slice(1);
        const names = this.props.selectableContexts.map(s => capitaliseFirstLetter(this.props.contextMappings.GetName(s)));
        
        // If there are multiple contexts visible, then our custom styling function with return a coloured border!
        const customStylingFunc = this.props.isUsingContextColouring && this.props.currentContext === DEFAULT_GLOBAL_CONTEXT_STRING 
        ? getStylingFunc(this.props.contextMappings) : undefined;

        return (
            <div className="ContextTabsWrapper">
                <NavigationTabs 
                    names={names}
                    callbackList={callbacks}
                    currActiveIndex={currActiveIndex}
                    getCustomStyling={customStylingFunc}
                />
                <div className="contextSettingsButton">
                    <SettingsIcon className="settingsIcon" onClick={this.props.togglePage}/>
                </div>
                <div className="toggleMainViewButton" title="Swap active and inactive task views">
                    <SwapIcon className="swapIcon" onClick={() => this.props.toggleMainView(!this.props.showingActiveTasksAsMain)}/>
                </div>
                <div className={undoButtonClassstring} title={this.state.tooltipText}>
                    <UndoIcon className="undoIcon" onClick={this.state.performUndo}/>
                </div>
            </div>
        );
    }
}

function getStylingFunc(contextMappings) {
    return name => ({
        borderBottomWidth: "0.2rem",
        borderBottomStyle: "solid",
        borderBottomColor: GetColour(contextMappings.GetColourId(contextMappings.GetIdForName(name))),
        marginRight: "1px"
    });
}