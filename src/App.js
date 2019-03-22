import React, { Component } from 'react';
import './css/App.css';
import { ActiveTaskSection } from './reactComponents/ActiveTaskSection';
import { TaskStatisticsSection } from './reactComponents/TaskStatisticsSection';
import { BacklogSection } from './reactComponents/BacklogSection';

class App extends Component {
  render() {
    return (
      // Return each 'section' of the app as siblings, so that the root div can arrange them using CSS Grid!
      <React.Fragment>
        <ActiveTaskSection/>
        <TaskStatisticsSection/>
        <BacklogSection/>
      </React.Fragment>
    );
  }
}

export default App;