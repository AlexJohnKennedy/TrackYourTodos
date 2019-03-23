import React, { Component } from 'react';

export class CreationBoard extends Component {
    constructor(props) {
        super(props);

        this.handleSubmit = this.handleSubmit.bind(this);
    }

    handleSubmit(event) {
        let nameText = event.target.value;

        // All we need to do at the moment, is pass in the name field into the creation function we have been given!
        this.props.creationFunction(nameText);

        // Always finish this by calling our passed-in 'submit action' function; Which will most likely perform some cleanup.
        this.props.submitAction();
    }
    
    // This component is simply a form wrapped by a background div.
    render() {
        return (
            // If we are being told we are NOT showing, then make sure to additionally add the 'hidden' classname. CSS will
            // then not render us.
            <div className={"creation-form " + this.props.showingForm ? "" : "hidden"}>
                <form onSubmit={this.handleSubmit}>
                    <h2> {this.props.formText} </h2>
                    <input type="text" name="name" />
                    <input type="submit" value="Submit"/>
                </form>
            </div>
        );
    }
}