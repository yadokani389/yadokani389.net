type DaisyThemeToken = {
  "color-scheme"?: string;
};

// @ts-expect-error -- daisyUI internal export has no type declaration.
import themeOrder from "daisyui/functions/themeOrder.js";
import themesObject from "daisyui/theme/object.js";

const orderedThemeNames = themeOrder as string[];
const themesByName = themesObject as Record<string, DaisyThemeToken>;

const orderedThemeSet = new Set(orderedThemeNames);
const extraThemeNames = Object.keys(themesByName).filter(
  (themeName) => !orderedThemeSet.has(themeName),
);

export const daisyThemes = [
  ...orderedThemeNames.filter((themeName) => themeName in themesByName),
  ...extraThemeNames,
];

export const darkThemeModes = daisyThemes.filter(
  (themeName) => themesByName[themeName]?.["color-scheme"] === "dark",
);
