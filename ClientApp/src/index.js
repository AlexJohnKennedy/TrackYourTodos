import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import * as serviceWorker from './serviceWorker';
import { ShortCutManager } from './viewLogic/keyboardShortcutHandler';

// Register our global keyboard event handler to the root document, in order to faciliate shortcuts.
document.addEventListener('keydown', ShortCutManager.globalHandler);

// Render react root component.
ReactDOM.render(<App />, document.getElementById('root'));



// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
