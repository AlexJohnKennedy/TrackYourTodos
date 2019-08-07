// Simple definition of which endpoints to hit! These should be configured with environment variables,
// but i'm lazy so i'm just doing it here for ease and quickness coz I forget how to set environment vars with 
// create-react-app.

export const API_ADDRESS = (process.env.NODE_ENV === "development") ? "https://localhost:5001" : "https://track-your-todos-api.azurewebsites.net";
export const API_ENDPOINT = API_ADDRESS + "/todoevents";
export const CONTEXT_STATE_ENDPOINT = API_ADDRESS + "/contexts";