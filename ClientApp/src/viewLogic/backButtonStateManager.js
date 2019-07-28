// This file contains all of the browser-history manipulation logic required to make the 'back' button only clear the form states of the app
// if a form is open, rather than navigating away from the page entirely. This is especially useful on mobile-android devices, becuase the
// user can use the "back" device button to close the forms, which is alot nicer than having to press the X button.

// However, this functionality in general is a bit 'funky', so I might want to remove it later if it causes any issues. So the logic has been
// completely extracted out and placed into this file, to facilitate the ability to remove or modify it later.

export function initBrowserHistoryManipulation(areFormsOpen, cleanUpAction) {
    // Modify the current 'back state' so we can recognise when we land back here after going "back" from a "formIsOpen" state.
    window.history.replaceState({ noForms: true }, "no forms");

    // Setup handlers so that back button only removes form presence, actually 'going back'.
    window.onpopstate = e => {
        if (e.state !== undefined && e.state !== null) {
            // If we get back to the 'root' state ("no forms = true"), but no forms are actually open, then go back again.
            if (e.state.noForms && !areFormsOpen()) {
                window.history.back();
            }
            else if (e.state.noForms) {
                cleanUpAction();

                // In order to disable the forward button, since it semantically makes no sense here, we must push another 'fake' state.
                // But we must first mark the current state as obsolete so that going back from here doesn't require two clicks.
                window.history.replaceState({ obsoleteHistoryEntry: true }, "obsolete");
                window.history.pushState({ noForms: true }, "no forms");
            }
            else if (e.state.obsoleteHistoryEntry || e.state.formIsOpen) {
                window.history.back();  // Go back again, since we don't want to impede the actual back functionality with our 'fake' history.
            }
        }
        e.preventDefault();
    };
}

// This is the callback which should be invoked when the FormStateManager has a form 'registered' to it.
export function onFormStateRegistrationAction() {
    if (window.history.state === null || window.history.state === undefined || !window.history.state.formIsOpen) {
        window.history.pushState({ formIsOpen: true }, "temporary state is open");
    }
}