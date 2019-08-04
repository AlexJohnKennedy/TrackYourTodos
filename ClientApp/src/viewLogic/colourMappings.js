export const ColoursArray = ["#f44336", "#e91e63", "#9c27b0", "#673ab7", "#3f51b5", "#2196f3", "#03a9f4", "#00bcd4", "#009688", "#4caf50", "#8bc34a", "#cddc39", "#ffeb3b", "#ffc107", "#ff9800", "#ff5722", "#795548", "#607d8b"];
export const HSLAArray = [ /* TODO: Must copy the above hex colours into HSLA 'object' form, in the matching order. Tedioussssss */ ];

export const GetDefaultColour = () => "#424040";
export const GetDefaultHSLAColour = () => null; // TODO

export const GetColour = id => id < 0 || id >= ColoursArray.length ? GetDefaultColour() : ColoursArray[id];
export const GetHSLAColour = id => id < 0 || id >= HSLAArray.length ? GetDefaultHSLAColour() : HSLAArray[id];

export class HSLAColour {
    constructor(hue, sat, light, alpha) {
        this.hue = hue;
        this.sat = sat;
        this.light = light;
        this.alpha = alpha;
    }

    toString() {
        return "hsla(" + this.hue + ", " + this.sat + "%, " + this.light + "%, " + this.alpha + "%)";
    }
}