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
        if (index < 0 || index >= this.props.children.length - this.props.numControllerComponents) throw new Error("Invalid index set!");
        this.setState({
            selectedIndex: index
        });
    }

    render() {
        // The first childs are the 'controller' components, which should always render.
        const controllerComponents = [];
        for (let i=0; i < this.props.numControllerComponents; i++) {
            controllerComponents.push(React.cloneElement(this.props.children[i], {
                indexToggleFunc: this.setIndex,  // Additional prop is being cloned into the controller component
                currentIndex: this.state.selectedIndex
            }));
        }
        // The rest of the children should only render if their index is selected
        const renderedChild = React.cloneElement(this.props.children[this.state.selectedIndex + this.props.numControllerComponents], {
            indexToggleFunc: this.setIndex
        });
        
        return (
            <>
                { [...controllerComponents, renderedChild] }
            </>
        );
    }
}