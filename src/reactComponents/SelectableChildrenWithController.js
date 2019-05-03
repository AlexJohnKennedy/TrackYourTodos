import React, { Component } from 'react';

// Wrapper component which allows the user to render one out of many of it's children elements, 
// along with a passed 'control block' element which gets rendered first!
export class SelectableChildrenWithController extends Component {
    constructor(props) {
        super(props);

        this.state = {
            selectedIndex: 0
        }

        this.setIndex = this.setIndex.bind(this);
    }
    componentDidMount() {
        this.setState({
            selectedIndex: this.props.defaultIndex
        });
    }

    // Method which children and/or control block can use to toggle the currently selected child elem.
    setIndex(index) {
        if (index < 0 || index >= this.props.children.length - 1) throw new Error("Invalid index set!");
        this.setState({
            selectedIndex: index
        });
    }

    render() {
        // The first child is the 'controller' component, which should always render.
        const controllerComponent = React.cloneElement(this.props.children[0], {
            indexToggleFunc: this.setIndex  // Additional prop is being cloned into the controller component
        });

        // The rest of the children should only render if their index is selected
        const renderedChild = React.cloneElement(this.props.children[this.state.selectedIndex + 1], {
            indexToggleFunc: this.setIndex
        });
        
        return (
            <>
                { [controllerComponent, renderedChild] }
            </>
        );
    }
}