import React, { Component } from 'react';
import { NavigationStateWrapper } from './NavigationTabs';
import { RegisterToActiveTaskListAPI } from '../interactionLayer/interactionApi';
import { ColourIdTracker } from '../viewLogic/colourSetManager';
import { Category } from '../logicLayer/Task';
import { TaskList } from './TaskList';

export class BacklogSection extends Component {
    constructor(props) {
        super(props);

        this.state = {
            showingBacklog: true,
            showingCompleted: false,
            showingGraveyard: false,

            deferredTaskViews: [],
            deferredTaskCreationFunc: null
        };
        
        this.handleActiveChange = this.handleActiveChange.bind(this);
        this.toggleTab = this.toggleTab.bind(this);
    }
    componentDidMount() {
        this.activeTaskListAPI = RegisterToActiveTaskListAPI(this.handleActiveChange);

        // Initialise state of this component.
        this.handleActiveChange();
    }

    handleActiveChange() {
        let deferredTaskViews = this.activeTaskListAPI.GetActiveTasks().filter((task) => task.category === Category.Deferred);

        // Update this component's state; which will re-render everything!
        this.setState({
            deferredTaskViews : deferredTaskViews,
            deferredTaskCreationFunc : this.activeTaskListAPI.GetCreationFunction(Category.Deferred, ColourIdTracker.useNextColour)
        });
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
                    toggleCallback={this.toggleTab}
                />
                <div className="spacer"/>
                <div className="wrapper">
                    { this.state.showingBacklog && 
                        <TaskList
                            tasks={this.state.deferredTaskViews}
                            highlights={[]}
                            hightlightEventCallbacks={{ 
                                register : (id) => id,
                                unregister : (id) => id
                            }}
                            formStateManager={ null }
                        />
                    }
                </div>
            </div>
        );
    }
}