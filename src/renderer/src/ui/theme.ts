import {
  createDarkTheme,
  createLightTheme,
  type BrandVariants,
  type Theme,
} from "@fluentui/react-components";

/**
 * Blue brand ramp matching the company app catalog, from darkest to lightest:
 * 80 is the catalog's navy (#083557), 100 its interactive blue (#0066a1) and
 * 160 its light band (#e5f0f7).
 */
const brand: BrandVariants = {
  10: "#01070c",
  20: "#020f1a",
  30: "#031827",
  40: "#052235",
  50: "#062a44",
  60: "#072f4d",
  70: "#07304f",
  80: "#083557",
  90: "#0b4a7c",
  100: "#0066a1",
  110: "#2b7fb5",
  120: "#4f97c6",
  130: "#75afd6",
  140: "#9cc8e5",
  150: "#c3dff0",
  160: "#e5f0f7",
};

export const lightTheme: Theme = {
  ...createLightTheme(brand),
  // Links use the catalog's interactive blue so they read as links, not navy text.
  colorBrandForegroundLink: brand[100],
  colorBrandForegroundLinkHover: brand[90],
  colorBrandForegroundLinkPressed: brand[80],
};

export const darkTheme: Theme = {
  ...createDarkTheme(brand),
  // Navy disappears on dark surfaces, so dark mode uses the lighter blues.
  colorBrandBackground: brand[100],
  colorBrandBackgroundHover: brand[110],
  colorBrandBackgroundPressed: brand[90],
  colorBrandBackgroundSelected: brand[100],
  colorCompoundBrandBackground: brand[110],
  colorCompoundBrandBackgroundHover: brand[120],
  colorCompoundBrandBackgroundPressed: brand[100],
  colorCompoundBrandForeground1: brand[110],
  colorCompoundBrandForeground1Hover: brand[120],
  colorCompoundBrandForeground1Pressed: brand[100],
  colorCompoundBrandStroke: brand[110],
  colorCompoundBrandStrokeHover: brand[120],
  colorCompoundBrandStrokePressed: brand[100],
  colorBrandStroke1: brand[110],
  colorBrandForeground1: brand[120],
  colorBrandForeground2: brand[130],
  colorBrandForegroundLink: brand[120],
  colorBrandForegroundLinkHover: brand[130],
  colorBrandForegroundLinkPressed: brand[110],
};
