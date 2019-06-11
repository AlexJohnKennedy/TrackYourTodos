import React, { Component } from 'react';
import { DEFAULT_GLOBAL_CONTEXT_STRING } from '../../logicLayer/Task';


export class ContextManagerPage extends Component {
    // For now, this page is just a big, selectable checklist of all the available contexts, displayed in 'most frequently used' order.
    // This allows the user to specify a set of contexts to appear in the context tab-list, and create new contexts.
    // There should be a limit on the number of contexts the user can make at a time, and they should eventually be able to delete
    // contexts as well!

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
                        <ContextSelectionCheckbox key={context} name={context} isSelected={true} toggleCheckbox={() => this.props.removeSelectableContext(context)}/>
                    );
                }
                // If it's not selected, and the selection list is not at max capacity, allow the users to toggle them on.
                else if (this.props.selectableContexts.length < this.props.maxSelectable) {
                    checkboxitems.push(
                        <ContextSelectionCheckbox key={context} name={context} isSelected={false} toggleCheckbox={() => this.props.addSelectableContext(context)}/>                        
                    );
                }
                // Else, they are unselected, and should not be selected, due to the number of selected items being too many!
                else {
                    checkboxitems.push(
                        <ContextSelectionCheckbox key={context} name={context} isSelected={false} toggleCheckbox={() => console.warn("User just tried to add " + context + " as a selectable context, but there are too many selected. TODO: Add a 'grey out' onto these!")}/>
                    );
                }
            }
        }

        return (
            <div className="contextManagerPage">
                <div className="titleText">
                   <h2> Context manangement </h2>
                </div>
                <div className="subheading"> You can have up to {this.props.maxSelectable} selected at a time. </div>
                {checkboxitems}
                <button onClick={this.props.togglePage}> x </button>
            </div>
        );
    }
}

class ContextSelectionCheckbox extends Component {
    constructor(props) {
        super(props);
        this.CheckboxInputRef = React.createRef();
        this.handleClick = this.handleClick.bind(this);
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
        return (
            <div className="contextSelectionCheckboxWrapper">
                <input type="checkbox" ref={this.CheckboxInputRef} onClick={this.handleClick}/>
                <div> {this.props.name} </div>
            </div>
        );
    }
}