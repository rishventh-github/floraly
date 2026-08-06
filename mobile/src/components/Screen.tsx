import type { ReactNode } from "react";
import { StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import {
  SafeAreaView,
  type Edge,
} from "react-native-safe-area-context";

interface ScreenProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Defaults to top only so tab screens clear the notch/status bar. */
  edges?: Edge[];
}

/** Keeps content inside the iPhone safe area (notch, Dynamic Island, home indicator). */
export function Screen({
  children,
  style,
  edges = ["top"],
}: ScreenProps) {
  return (
    <SafeAreaView edges={edges} style={[styles.root, style]}>
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
