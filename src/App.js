import React, { Component } from 'react';
import './css/App.css';
import './css/Board.css';
import './css/ActiveTaskSection.css';
import './css/Task.css';
import { ActiveTaskSection } from './reactComponents/ActiveTaskSection';

class App extends Component {
  render() {
    return (
      <ActiveTaskSection/>
    );
  }
}

export default App;