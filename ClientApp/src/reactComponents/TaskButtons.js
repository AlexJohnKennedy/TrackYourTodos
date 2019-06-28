import React, { Component } from 'react';

// the 'Board' component generically represents an active task list.
// E.g., each of the three main 'lists' are Board components!
export class NewTaskButton extends Component {
    constructor(props) {
        super(props);
    
        // This binding is necessary to make `this` work in the callback
        this.handleClick = this.handleClick.bind(this);
    }
    handleClick(e) {
        e.stopPropagation();
        this.props.clickAction();
    }
    render() {
        return (
            <div className="button" onClick={this.handleClick} title={this.props.tooltipText}>
                {this.props.text}
            </div>
        );
    }
}

export class CheckBox extends Component {
    constructor(props) {
        super(props);

        this.CheckboxInputRef = React.createRef();
        this.handleClick = this.handleClick.bind(this);
    }
    componentDidMount() {
        this.setCheckState();
    }
    componentDidUpdate() {
        this.setCheckState();
    }
    setCheckState() {
        if (this.props.currClicks === 0) {
            this.CheckboxInputRef.current.checked = false;
            this.CheckboxInputRef.current.indeterminate = false;
        }
        else if (this.props.currClicks === 1) {
            this.CheckboxInputRef.current.checked = false;
            this.CheckboxInputRef.current.indeterminate = true;
        }
        else {
            this.CheckboxInputRef.current.checked = true;
            this.CheckboxInputRef.current.indeterminate = false;
        }
    }

    handleClick(e) {
        e.stopPropagation();

        // If this is the first click, that means we are 'starting' the task.
        if (this.props.currClicks === 0) {
            this.props.firstClickAction();
        }
        // If this is the second click, that means we are 'completing' the task.
        else {
            this.props.secondClickAction();
        }
    }

    render() {
        return (
            <input type="checkbox" className="checkbox" ref={this.CheckboxInputRef} onClick={this.handleClick} onDoubleClick={e => e.stopPropagation()}/>
        );
    }
}