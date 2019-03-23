import React, { Component } from 'react';

export class CreationForm extends Component {
    constructor(props) {
        super(props);

        this.state = {value: ''};

        this.handleChange = this.handleChange.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);
    }

    handleChange(event) {
        this.setState({value: event.target.value});
    }
    handleSubmit(event) {
        let nameText = this.state.value;
        console.log("We got this following string as a name: " + nameText);
        // All we need to do at the moment, is pass in the name field into the creation function we have been given!
        this.props.creationFunction(nameText);

        // Always finish this by calling our passed-in 'submit action' function; Which will most likely perform some cleanup.
        this.props.submitAction();

        // We must call this to override the default HTML form behaviours, i.e., stop the page from reloading.
        event.preventDefault();
    }
    
    // This component is simply a form wrapped by a background div.
    render() {
        return (
            // If we are being told we are NOT showing, then make sure to additionally add the 'hidden' classname. CSS will
            // then not render us.
            <div className={"creation-form " + (this.props.showingForm ? "" : "hidden")}>
                <form onSubmit={this.handleSubmit}>
                    <h2> {this.props.formText} </h2>
                    <input type="text" value={this.state.value} onChange={this.handleChange}/>
                    <input type="submit" value="Submit"/>
                </form>
            </div>
        );
    }
}