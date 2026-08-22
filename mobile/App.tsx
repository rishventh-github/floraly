import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StyleSheet } from "react-native";
import { AuthProvider } from "./src/context/AuthContext";
import { FloralyProvider } from "./src/context/FloralyContext";
import { ThemeProvider } from "./src/context/ThemeContext";
import { SocialProvider } from "./src/context/SocialContext";
import { RootNavigator } from "./src/navigation/RootNavigator";

export default function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <AuthProvider>
          <ThemeProvider>
            <SocialProvider>
              <FloralyProvider>
                <RootNavigator />
              </FloralyProvider>
            </SocialProvider>
          </ThemeProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
