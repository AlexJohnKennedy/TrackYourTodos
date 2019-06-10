import React, { Component } from 'react';
import { NavigationTabs } from './NavigationTabs' 

// Wrapper around some context tabs, which is passed some callbacks from the root AppPage
// allowing us to specify the navigation-tabs callback to switch the current context.
// We are handed a list of strings which specifies the contexts we are allowed to show.
export class ContextTabs extends Component {
    render() {
        // Build a list of call backs which will switch the context, using the callback provided to us as a prop.
        const callbacks = this.props.selectableContexts.map(context => () => this.props.switchContext(context));
        
        // Find the index of the 'current context'. This will always be what the 'currActiveIndex' is set to!
        const currActiveIndex = this.props.selectableContexts.findIndex(s => s === this.props.currentContext);
        if (currActiveIndex < 0 || currActiveIndex > this.props.selectableContexts.length) throw new Error("Invalid current context passed!");

        const capitaliseFirstLetter = s => s.charAt(0).toUpperCase() + s.slice(1);
        return (
            <div className="ContextTabsWrapper">
                <NavigationTabs 
                    names={this.props.selectableContexts.map(s => capitaliseFirstLetter(s))}
                    callbackList={callbacks}
                    currActiveIndex={currActiveIndex}
                />
            </div>
        );
    }
}