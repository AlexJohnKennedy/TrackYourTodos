export const EventTypes = {
    // Normal data events
    taskAdded : "taskCreated",
    childTaskAdded : "subtaskCreated",
    taskRevived : "taskRevived",
    taskDeleted : "taskDeleted",
    taskCompleted : "taskCompleted",
    taskFailed : "taskFailed",
    taskActivated : "taskActivated",
    taskStarted : "taskStarted",
    taskEdited : "taskEdited",

    // Undo data events
    taskAddedUndo : "taskCreatedUndo",
    childTaskAddedUndo : "subtaskCreatedUndo",
    taskRevivedUndo : "taskRevivedUndo",
    taskDeletedUndo : "taskDeletedUndo",
    taskCompletedUndo : "taskCompletedUndo",
    taskFailedUndo : "taskFailedUndo",
    taskActivatedUndo : "taskActivatedUndo",
    taskStartedUndo : "taskStartedUndo",
    taskEditedUndo : "taskEditedUndo",
}