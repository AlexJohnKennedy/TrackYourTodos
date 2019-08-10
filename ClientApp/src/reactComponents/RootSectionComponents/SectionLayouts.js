// Layout components for the 'main sections' of the AppPage, which are generically rendered by either the ActiveTaskStateManager 
// or BacklogTaskStateManager. Designed so that they just generically render task lists, and are decoupled form any task-state
// logic (i.e. the viewLayerInteractionApi) 
import React, { Component } from 'react';
import { Board } from '../Board';
import { NavigationStateWrapper } from '../NavigationTabs';
import { MAX_TASK_NAME_LEN  } from '../../logicLayer/Task';
import { CreationForm } from '../CreationForm';
import { ShortCutManager } from '../../viewLogic/keyboardShortcutHandler';

export class MainSectionLayout extends Component {
    render() {
        return (
            <div className="ActiveTaskSection">
                <Board
                    key="0"

                    boardTitle={this.props.titles[0]}
                    newTaskButtonTooltipText={this.props.tooltips[0]}
                    formText={this.props.formText[0]}
                    shortcutkey={this.props.shortcutkeys[0]}
                    icon={this.props.icons[0]}

                    useCreationForm={this.props.creationFunctions[0] !== null && this.props.creationFunctions[0] !== undefined}
                    creationFunction={this.props.creationFunctions[0]}
                    formStateManager={this.props.formStateManager}
                    tasklist={this.props.tasklists[0]}
                />
                <Board
                    key="1"
                    
                    boardTitle={this.props.titles[1]}
                    newTaskButtonTooltipText={this.props.tooltips[1]}
                    formText={this.props.formText[1]}
                    shortcutkey={this.props.shortcutkeys[1]}
                    icon={this.props.icons[1]}

                    useCreationForm={this.props.creationFunctions[1] !== null && this.props.creationFunctions[1] !== undefined}
                    creationFunction={this.props.creationFunctions[1]}
                    formStateManager={this.props.formStateManager}
                    tasklist={this.props.tasklists[1]}
                />
                <Board
                    key="2"
                    
                    boardTitle={this.props.titles[2]}
                    newTaskButtonTooltipText={this.props.tooltips[2]}
                    formText={this.props.formText[2]}
                    shortcutkey={this.props.shortcutkeys[2]}
                    icon={this.props.icons[2]}

                    useCreationForm={this.props.creationFunctions[2] !== null && this.props.creationFunctions[2] !== undefined}
                    creationFunction={this.props.creationFunctions[2]}
                    formStateManager={this.props.formStateManager}
                    tasklist={this.props.tasklists[2]}
                />
            </div>
        );
    }
}

export class SidebarSectionLayout extends Component {
    constructor(props) {
        super(props);

        this.state = {
            tabId: 0,
            showingForm: false
        };

        this.toggleTab = this.toggleTab.bind(this);
        this.toggleFormOn = this.toggleFormOn.bind(this);
        this.toggleFormOff = this.toggleFormOff.bind(this);
    }
    componentDidMount() {
        if (this.props.useCreationForm) {
            ShortCutManager.registerShiftShortcut("Digit4", this.toggleFormOn);
        }
    }
    // TODO: Deregister shortcut in componentWillUnmount() ?

    toggleFormOn() {
        this.props.formStateManager.triggerCleanup();
        this.toggleTab(0);
        this.setState({
            showingForm: true
        });
    }
    toggleFormOff() {
        this.setState({
            showingForm: false
        });
    }
    toggleTab(tabId) {
        if (tabId < 0 || tabId >= this.props.names.length) throw new Error("SidebarSectionLayout passed invalid tab id in callback!");
        this.setState({
            tabId: tabId,
            showingForm: false
        });
    }

    render() {
        const clearFormStateCallbacks = () => this.props.formStateManager.clearCallbacks();

        return(
            <div className="BacklogSection">
                <NavigationStateWrapper
                    names={this.props.names}
                    toggleCallback={this.toggleTab}
                    currActiveIndex={this.state.tabId}
                />
                <div className="spacer"/>
                <div className="wrapper">
                    {this.props.tasklists[this.state.tabId]}
                    {this.props.useCreationForm &&
                        <CreationForm
                            creationFunction={this.props.creationFunction} 
                            showingForm={this.state.showingForm}
                            submitAction={() => { clearFormStateCallbacks(); this.toggleFormOff(); }}
                            formStateManager={this.props.formStateManager}
                            formText={this.props.formText}
                            maxFieldLength={MAX_TASK_NAME_LEN}
                        />
                    }
                </div>
            </div>
        );
    }
}