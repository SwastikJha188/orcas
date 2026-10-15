// Cross-page sensor focus: write a tag, then open the page. Sensors and Trends
// read and clear their key on mount (see machine-sensor-mapping-view / trends-focus).
import { SENSORS_FOCUS_KEY } from "./machine-sensor-mapping-view";
import { TRENDS_FOCUS_KEY } from "./trends-focus";

export function focusSensorOn(page: "sensors" | "trends", tag: string | null | undefined): void {
  if (!tag) return;
  try {
    sessionStorage.setItem(page === "sensors" ? SENSORS_FOCUS_KEY : TRENDS_FOCUS_KEY, tag);
  } catch {
    /* storage unavailable: the page still opens, unfocused */
  }
}
