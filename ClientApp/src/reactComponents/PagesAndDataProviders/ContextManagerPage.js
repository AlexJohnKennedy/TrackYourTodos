import React, { Component } from 'react';
import { CreationForm } from '../CreationForm';
import { DEFAULT_GLOBAL_CONTEXT_STRING, MAX_CONTEXT_NAME_LEN } from '../../logicLayer/Task';
import { TemporaryStateManager } from '../../viewLogic/temporaryStateManager';

import { SvgIconWrapper } from '../TaskButtons';
import { ReactComponent as CrossIcon } from '../../icons/close-button.svg';
import { ReactComponent as BinIcon } from '../../icons/rubbish-bin-delete-button.svg';
import { ReactComponent as EditIcon } from '../../icons/pencil-edit-button.svg';


export class ContextManagerPage extends Component {
    
    componentDidMount() {
        this.formStateManager = TemporaryStateManager();
    }

    render() {
        // For each available context (except the global context), generate a check-box list item which allows us to toggle
        // the state of them.
        const checkboxitems = [];
        for (let context of this.props.availableContexts) {
            // If this context is not the default global context, we will add it.
            if (context !== DEFAULT_GLOBAL_CONTEXT_STRING) {
                // If this context is already selected, then render the checkbox as 'checked' and have to toggle remove it.
                if (this.props.selectableContexts.includes(context)) {
                    checkboxitems.push(
                        <ContextSelectionCheckbox key={context} name={this.props.contextMappings.GetName(context)} isSelected={true} isDisabled={false} 
                        toggleCheckbox={() => this.props.removeSelectableContext(context)} formStateManager={this.formStateManager} contextid={context}
                        deleteContext={this.props.deleteContext} renameContext={this.props.renameContext} reviveContext={this.props.reviveContext}/>
                    );
                }
                // If it's not selected, and the selection list is not at max capacity, allow the users to toggle them on. Plus one because the global context does not count!
                else if (this.props.selectableContexts.length < this.props.maxSelectable) {
                    checkboxitems.push(
                        <ContextSelectionCheckbox key={context} name={this.props.contextMappings.GetName(context)} isSelected={false} isDisabled={false} 
                        toggleCheckbox={() => this.props.addSelectableContext(context)} formStateManager={this.formStateManager} contextid={context}
                        deleteContext={this.props.deleteContext} renameContext={this.props.renameContext} reviveContext={this.props.reviveContext}/>                        
                    );
                }
                // Else, they are unselected, and should not be selected, due to the number of selected items being too many!
                else {
                    checkboxitems.push(
                        <ContextSelectionCheckbox key={context} name={this.props.contextMappings.GetName(context)} isSelected={false} isDisabled={true}
                        toggleCheckbox={() => {}} formStateManager={this.formStateManager} contextid={context}
                        deleteContext={this.props.deleteContext} renameContext={this.props.renameContext} reviveContext={this.props.reviveContext}/>
                    );
                }
            }
        }

        return (
            <div className="contextManagerPage">
                <div className="titleText">
                   <h2> Context manangement </h2>
                </div>
                <div className="subheading"> You can have up to {this.props.maxSelectable - 1} selected at a time. </div>
                <CreationForm 
                    creationFunction={this.props.createNewContext} 
                    formText="New Context" 
                    showingForm={true}
                    submitAction={() => {}}
                    formStateManager={this.props.formStateManager}
                    maxFieldLength={MAX_CONTEXT_NAME_LEN}
                />
                <div className="checklistWrapper">
                    {checkboxitems} 
                </div>
                <SvgIconWrapper className="button" clickAction={this.props.togglePage}   title="Close settings menu">
                    <CrossIcon className="iconButton"/>
                </SvgIconWrapper>
            </div>
        );
    }
}

class ContextSelectionCheckbox extends Component {
    constructor(props) {
        super(props);
        this.CheckboxInputRef = React.createRef();
        this.handleClick = this.handleClick.bind(this);
        this.toggleForm = this.toggleForm.bind(this);
        this.state = {
            showingForm: false
        };
    }
    toggleForm(on) {
        this.setState({
            showingForm: on
        });
    }
    componentDidMount() {
        this.CheckboxInputRef.current.checked = this.props.isSelected;  // boolean
    }
    componentDidUpdate() {
        this.CheckboxInputRef.current.checked = this.props.isSelected;  // boolean
    }
    handleClick() {
        this.CheckboxInputRef.current.checked = this.props.isSelected;  // boolean
        this.props.toggleCheckbox();
    }
    render() {
        let checkbox;
        if (this.props.isDisabled) checkbox = <input type="checkbox" ref={this.CheckboxInputRef} onClick={this.handleClick} disabled="disabled"/>
        else checkbox = <input type="checkbox" ref={this.CheckboxInputRef} onClick={this.handleClick}/>

        const capitaliseFirstLetter = s => s.charAt(0).toUpperCase() + s.slice(1);

        const onSubmit = () => { this.props.formStateManager.triggerCleanup(); this.toggleForm(false); };

        return (
            <div className="contextSelectionCheckboxWrapper">
                { this.state.showingForm &&
                    <CreationForm 
                        creationFunction={this.props.renameContext} 
                        formText="" 
                        showingForm={true}
                        submitAction={onSubmit}
                        formStateManager={this.props.formStateManager}
                        maxFieldLength={MAX_CONTEXT_NAME_LEN}
                        initialValue={capitaliseFirstLetter(this.props.name)}
                    />
                }
                { !this.state.showingForm &&
                    <>
                    {checkbox}
                    {capitaliseFirstLetter(this.props.name)}
                    <SvgIconWrapper className="iconWrapper editButton" clickAction={() => this.toggleForm(true)} title="Edit context">
                        <EditIcon className="iconButton"/>
                    </SvgIconWrapper>
                    <SvgIconWrapper className="iconWrapper deleteButton" clickAction={() => this.props.deleteContext(this.props.contextid)} title="Delete this context">
                        <BinIcon className="iconButton"/>
                    </SvgIconWrapper>
                    </>
                }
            </div>
        );
    }
}