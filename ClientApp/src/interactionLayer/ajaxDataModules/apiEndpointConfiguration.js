// Simple definition of which endpoints to hit! These should be configured with environment variables,
// but i'm lazy so i'm just doing it here for ease and quickness coz I forget how to set environment vars with 
// create-react-app.
export const API_ENDPOINT = (process.env.NODE_ENV === "development") ? "https://localhost:5001/todoevents" : "https://track-your-todos-api.azurewebsites.net/todoevents";