export const levels = [
  { value: 2, name: "Learning" },
  { value: 3, name: "Working" },
  { value: 4, name: "Experienced" },
] as const;

/** Unknown values (such as legacy Expert ratings above 4) read as no level. */
export const levelFor = (value?: number) =>
  levels.find((level) => level.value === value);
