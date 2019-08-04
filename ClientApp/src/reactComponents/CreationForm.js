import React, { Component } from 'react';

export class CreationForm extends Component {
    constructor(props) {
        super(props);

        // Setup a ref to the text-input DOM element, so we can automatically trigger focus when it is rendered visible.
        this.textInputRef = React.createRef();

        this.state = {value: ''};
        this.handleChange = this.handleChange.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);
        this.handleCancel = this.handleCancel.bind(this);
    }
    componentDidMount() {
        if (this.props.showingForm) {
            this.props.formStateManager.registerCleanUpCallback(this.handleCancel);
            this.textInputRef.current.focus();  // Set the focus automatically, for SPEEEED!
            if (this.props.initialValue !== undefined && this.props.initialValue !== null && this.props.initialValue.length > 0) {
                const action = () => this.textInputRef.current.select();  // Highlight text
                this.setState({
                    value: this.props.initialValue
                }, action); // Tells react to perform 'action' once the state has updated.
            }
        }
    }
    componentDidUpdate(prevProps, prevState, snapshot) {
        if (this.props.showingForm) {
            if (!prevProps.showingForm) {
                this.props.formStateManager.registerCleanUpCallback(this.handleCancel);
                if (this.props.initialValue !== undefined && this.props.initialValue !== null && this.props.initialValue.length > 0) {
                    const action = () => this.textInputRef.current.select();  // Highlight text
                    this.setState({
                        value: this.props.initialValue
                    }, action);
                }
            }
            this.textInputRef.current.focus();  // Set the focus automatically, for SPEEEED!
        }
    }
    handleChange(event) {
        // Do not update if the string is already the max length
        if (event.target.value != null && event.target.value.length === this.props.maxFieldLength) {
            return;
        } else if (event.target.value && event.target.value.length > this.props.maxFieldLength) {
            this.setState({value: ""});     // For now, just reset that shit..
        }
        this.setState({value: event.target.value});
    }
    handleSubmit(event) {
        let nameText = this.state.value.trim();
        
        if (nameText.length > 0) {
            // All we need to do at the moment, is pass in the name field into the creation function we have been given!
            this.props.creationFunction(nameText);
        }

        // Always finish this by calling our passed-in 'submit action' function; Which will most likely perform some cleanup.
        this.props.submitAction();

        // Reset the form field to empty
        this.setState({value: ""});

        // We must call this to override the default HTML form behaviours, i.e., stop the page from reloading.
        event.preventDefault();
    }
    handleCancel() {
        this.setState({value: ""});
        this.props.submitAction();
    }
    
    // This component is simply a form wrapped by a background div.
    render() {
        // If we are being told we are NOT showing, then make sure to additionally add the 'hidden' classname. CSS will
        // then not render us.
        let classstring = "creation-form" + (this.props.showingForm ? "" : " hidden");

        return (
            <div className={classstring}>
                <h2> {this.props.formText} </h2>
                <form onSubmit={this.handleSubmit}>
                    <input type="text" value={this.state.value} onChange={this.handleChange} ref={this.textInputRef}/>
                    <input type="submit" value="Submit"/>
                    {this.props.children}
                </form>
            </div>
        );
    }
}