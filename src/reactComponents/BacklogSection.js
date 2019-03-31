import React, { Component } from 'react';
import { NavigationStateWrapper } from './NavigationTabs';

export class BacklogSection extends Component {
    constructor(props) {
        super(props);

        this.state = {
            showingBacklog: true,
            showingCompleted: false,
            showingGraveyard: false
        };

        this.toggleTab = this.toggleTab.bind(this);
    }

    toggleTab(tabId) {
        if (tabId < 0 || tabId > 2) throw new Error("BacklogSection passed invalid tab id in callback!");
        let bl = tabId === 0 ? true : false;
        let cm = tabId === 1 ? true : false;
        let gy = tabId === 2 ? true : false;

        this.setState({
            showingBacklog: bl,
            showingCompleted: cm,
            showingGraveyard: gy
        });
    }
    
    render() {
        return(
            <div className="BacklogSection">
                <NavigationStateWrapper
                    names={['Backlog', 'Completed', 'Graveyard']}
                />
                
            </div>
        );
    }
}