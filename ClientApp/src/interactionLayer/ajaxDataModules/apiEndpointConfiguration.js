// Simple definition of which endpoints to hit.

// If the 'API_ADDRESS' environment variable is set, use that one. Else, use the defaults depending on runtime environment.
// Note, to define react env variables, we must prefix them with "REACT_APP", see: https://create-react-app.dev/docs/adding-custom-environment-variables
export const API_ADDRESS = (process.env.REACT_APP_API_ADDRESS !== undefined) ? process.env.REACT_APP_API_ADDRESS :
(process.env.NODE_ENV === "development") ? "https://localhost:5001" : "https://track-your-todos-api.azurewebsites.net";

export const API_ENDPOINT = API_ADDRESS + "/todoevents";
export const CONTEXT_STATE_ENDPOINT = API_ADDRESS + "/contexts";