import {
  createDarkTheme,
  createLightTheme,
  type BrandVariants,
  type Theme,
} from "@fluentui/react-components";

/** Teal brand ramp around the original accent (#9bdebe), from darkest to lightest. */
const brand: BrandVariants = {
  10: "#020f0a",
  20: "#0a1f18",
  30: "#0d3326",
  40: "#0f4231",
  50: "#10523c",
  60: "#116248",
  70: "#127354",
  80: "#138460",
  90: "#2c9470",
  100: "#48a381",
  110: "#62b292",
  120: "#7cc1a4",
  130: "#96cfb6",
  140: "#b1ddc9",
  150: "#cbebdc",
  160: "#e6f5ee",
};

export const lightTheme: Theme = createLightTheme(brand);

export const darkTheme: Theme = {
  ...createDarkTheme(brand),
  // Lighter brand foregrounds keep links and accents readable on dark surfaces.
  colorBrandForeground1: brand[120],
  colorBrandForeground2: brand[130],
  colorBrandForegroundLink: brand[120],
  colorBrandForegroundLinkHover: brand[130],
};
