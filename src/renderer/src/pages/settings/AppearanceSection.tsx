import { Field, Radio, RadioGroup } from "@fluentui/react-components";
import type { ThemePreference } from "@/hooks/themePreference";
import { useThemeMode } from "@/hooks/useThemeMode";

/** Applies immediately and is remembered on this PC; it is not part of the workspace. */
export default function AppearanceSection() {
  const { preference, setPreference, systemDark } = useThemeMode();
  return (
    <section className="settings-section" aria-labelledby="appearance-title">
      <h2 id="appearance-title">Appearance</h2>
      <Field
        label="Theme"
        hint={
          preference === "system"
            ? `Following Windows, currently ${systemDark ? "dark" : "light"}.`
            : "Remembered on this PC."
        }
      >
        <RadioGroup
          layout="horizontal"
          value={preference}
          onChange={(_, d) => setPreference(d.value as ThemePreference)}
        >
          <Radio value="system" label="Follow Windows" />
          <Radio value="light" label="Light" />
          <Radio value="dark" label="Dark" />
        </RadioGroup>
      </Field>
    </section>
  );
}
