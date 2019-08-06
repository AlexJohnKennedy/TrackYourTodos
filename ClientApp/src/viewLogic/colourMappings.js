// Define the colour class and the colour mappings. Note that the Hex colours and HSLA colours arrays having identical colours for a given id value.
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

export const ColoursArray = ["#f44336", "#e91e63", "#9c27b0", "#673ab7", "#3f51b5", "#2196f3", "#03a9f4", "#00bcd4", "#009688", "#4caf50", "#8bc34a", "#cddc39", "#ffeb3b", "#ffc107", "#ff9800", "#ff5722", "#795548", "#607d8b"];
export const HSLAArray = [
    new HSLAColour(4, 90, 58, 100),
    new HSLAColour(340, 82, 52, 100),
    new HSLAColour(291, 64, 42, 100),
    new HSLAColour(262, 52, 47, 100),
    new HSLAColour(231, 48, 48, 100),
    new HSLAColour(207, 90, 54, 100),
    new HSLAColour(199, 98, 48, 100),
    new HSLAColour(187, 100, 42, 100),
    new HSLAColour(174, 100, 29, 100),
    new HSLAColour(122, 39, 49, 100),
    new HSLAColour(88, 50, 53, 100),
    new HSLAColour(66, 70, 54, 100),
    new HSLAColour(54, 100, 62, 100),
    new HSLAColour(45, 100, 51, 100),
    new HSLAColour(36, 100, 50, 100),
    new HSLAColour(14, 100, 57, 100),
    new HSLAColour(16, 25, 38, 100),
    new HSLAColour(200, 18, 46, 100)
];

export const GetDefaultColour = () => "#424040";
export const GetDefaultHSLAColour = () => new HSLAColour(0, 2, 25, 100);

export const GetColour = id => id < 0 || id >= ColoursArray.length ? GetDefaultColour() : ColoursArray[id];
export const GetHSLAColour = id => { console.log("called", id); return id < 0 || id >= HSLAArray.length ? GetDefaultHSLAColour() : HSLAArray[id]};