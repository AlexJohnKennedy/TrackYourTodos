import React, { Component } from 'react';

export class NavigationTabs extends Component {
    render() {
        // Navigation tabs are nothing but a group of divs, wrapped in a container div. Each inner element is a clickable
        // block with text in it, which in turn, invoke callbacks. Active elements are given a special additional classname.
        const tabs = [];
        for (let i=0; i < this.props.names.length; i++) {
            const classstring = "navigation-tab" + (this.props.currActiveIndex === i ? " active-navigation-tab" : "");
            tabs.push(
                <div className={classstring} key={this.props.names[i]} onClick={this.props.callbackList[i]}>
                    {this.props.names[i]}
                </div>
            );
        }

        return (
            <div className="navigation-tabs-container">
                {tabs}
            </div>
        );
    }
}

export class NavigationStateWrapper extends Component {
    constructor(props) {
        console.debug("NavStateWrapper is being constructed");

        super(props);
        this.toggleTab = this.toggleTab.bind(this);
    }

    componentDidMount() {
        console.debug("NavStateWrapper mounted");
    }
    componentWillUnmount() {
        console.debug("NavStateWrapper is unmounting");
    }
    componentDidUpdate() {
        console.debug("NavStateWrapper updated");
    }

    toggleTab(tabId) {
        if (tabId < 0 || tabId > this.props.names.length) throw new Error("Navigation state wrapper passed invalid tab id in callback!");
        this.props.toggleCallback(tabId);
    }

    render() {
        const callbacks = [];
        for (let i=0; i<this.props.names.length; i++) {
            callbacks.push(() => this.toggleTab(i));
        }

        return (
            <NavigationTabs
                names={this.props.names}
                callbackList={callbacks}
                currActiveIndex={this.props.currActiveIndex}
            />
        );
    }
}