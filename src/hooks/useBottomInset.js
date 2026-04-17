import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * Returns the bottom safe area inset value.
 *
 * - On 3-button / 2-button navigation devices: returns ~48dp
 * - On gesture navigation devices (no bar): returns 0
 * - Automatically recalculates on rotation or nav mode change
 *
 * Usage:
 *   const bottom = useBottomInset();
 *   style={{ paddingBottom: bottom }}
 */
export default function useBottomInset() {
  const { bottom } = useSafeAreaInsets();
  return bottom;
}
