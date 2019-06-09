import React, { Component } from 'react';
import { DEFAULT_GLOBAL_CONTEXT_STRING } from '../../logicLayer/Task';

// Generic wrapper component which is stores context state, and passes it in
// to all of its children.
// PASSES: 
// --- Current context. This is the context which new independent tasks should be made into.
// --- Visible contexts. All tasks which have a context in this list should be fetched and rendered.
// --- Available contexts. A list of all the contexts the user has created and added tasks to.
// --- SwitchContext(). Function which modifies the state of curr context and indirectly visible contexts. Param must be one of visible contexts.
// --- CreateNewContext(). Function which allows caller to create a new context, and switch to it. This will modify all three states!
export class ContextState extends Component {
    constructor(props) {
        super(props);

        this.state = {
            currentContext: DEFAULT_GLOBAL_CONTEXT_STRING,
            visibleContexts: [],     // Empty means that global is being rendered. Must be empty here since we haven't loaded anything yet.
            availableContexts: []    // Empty means we have not loaded anything yet.
        }

        this.switchContext = this.switchContext.bind(this);
        this.createNewContext = this.createNewContext.bind(this);
    }

    // Passed down to our children, allowing them to switch contexts between the currently available ones.
    switchContext(context) {
        context = this.validateContextString(context);
        if (context === null || !this.state.availableContexts.includes(context)) {
            console.warn("Invalid context passed to context switch! You must pick a context which is already availble. Use 'CreateNewContext' to make a new one. Param was: " + context);
            return;
        }
        if (this.state.currentContext === context) {
            return;
        }

        this.performSwitch(context);
    }
    // Encapsultates the logic for choosing the visible contexts for a given current context. E.g., global => all are visible. 
    // If we end up implemented nested contexts, then for a given current context, we would search and make the current's entire
    // subtree visible as well! But for now, it's either global, or just one.
    performSwitch(context) {
        if (context === DEFAULT_GLOBAL_CONTEXT_STRING) {
            this.setState({
                currentContext: context,
                visibleContexts: this.state.availableContexts   // Everything is visible!
            });
        }
        else {
            this.setState({
                currentContext: context,
                visibleContexts: [context]
            });
        }
    }

    // Pased fown to our children, allowing them to create new contexts.
    createNewContext(newContext) {
        newContext = this.validateContextString(newContext);
        if (newContext === null) { return null; }
        if (this.state.availableContexts.includes(newContext) || newContext === DEFAULT_GLOBAL_CONTEXT_STRING) { 
            this.performSwitch(newContext);
        }
        else {
            this.setState({
                currentContext: newContext,
                visibleContexts: newContext,
                availableContexts: this.state.availableContexts.concat([newContext])
            });
        }
    }

    validateContextString(context) {
        if (context === null || context === undefined || context === "" || context.trim().length === 0) {
            console.warn("Invalid context passed to ContextState! Just doing nothing instead of crashing. Context was: " + context);
            return null;
        }
        return context.trim();
    }
}