import { CirclePicker } from 'react-color';
import React, { Component } from 'react';

import { ColoursArray } from '../viewLogic/colourMappings';

import { confirmAlert } from 'react-confirm-alert';
import 'react-confirm-alert/src/react-confirm-alert.css';


export class ColourPickerForm extends Component {
    constructor(props) {
        super(props);
        this.renderColourPicker = this.renderColourPicker.bind(this);
    }

    renderColourPicker() {
        confirmAlert({
            title: '',
            message: '',
            customUI: ({ onClose }) => <ColourPickerWrapper 
                onClose={onClose}
                colourId={this.props.colourId}
                onColourChange={colourId => {
                    this.props.onColourChange(colourId);
                    onClose();
                }}
            />
        });
    }

    render() {
        return (
            <div className="colourPickIcon" onClick={this.renderColourPicker} title="Pick a colour!"/>
        );
    }
}



class ColourPickerWrapper extends Component {
    handleChangeComplete = (color) => {
        this.props.onColourChange(ColoursArray.findIndex(s => s === color.hex));
    };

    render() {
        return (
            <div className="colourConfirmationBox">
                <CirclePicker
                    color={this.props.colourId < 0 ? '#000000' : ColoursArray[this.props.colourId]}
                    colors={ColoursArray}
                    onChangeComplete={this.handleChangeComplete}
                />
                <div className="cancelButton" onClick={this.props.onClose}>Cancel</div>
            </div>
        );
    }
}