import React, { Component } from 'react';

// the 'Board' component generically represents an active task list.
// E.g., each of the three main 'lists' are Board components!
export class NewTaskButton extends Component {
    constructor(props) {
        super(props);
    
        // This binding is necessary to make `this` work in the callback
        this.handleClick = this.handleClick.bind(this);
      }
    
    render() {
        return (
            <button onClick={this.handleClick}>
                {this.props.text}
            </button>
        );
    }
    
    handleClick(e) {
        this.props.clickAction();   // Soon we will add parameters here which will allow us to set colour, +1 time (i.e. next day vs today), etc.
    }
}