export const ColoursArray = ["#f44336", "#e91e63", "#9c27b0", "#673ab7", "#3f51b5", "#2196f3", "#03a9f4", "#00bcd4", "#009688", "#4caf50", "#8bc34a", "#cddc39", "#ffeb3b", "#ffc107", "#ff9800", "#ff5722", "#795548", "#607d8b"];
export const GetDefaultColour = () => "#424040";
export const GetColour = id => id < 0 || id >= ColoursArray.length ? GetDefaultColour() : ColoursArray[id];