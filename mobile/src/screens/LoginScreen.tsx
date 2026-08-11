import { useState, useMemo } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { Screen } from "../components/Screen";
import type { AuthStackParamList } from "../navigation/types";
import { type AppColors, spacing } from "../theme/colors";
import { FloralyTextInput } from "../components/FloralyTextInput";

type Props = NativeStackScreenProps<AuthStackParamList, "Login">;

export function LoginScreen({ navigation, route }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { login, signup } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">(
    route.params?.mode === "signup" ? "signup" : "login"
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    setBusy(true);
    const result =
      mode === "login"
        ? await login(email, password)
        : await signup(email, password, displayName);
    setBusy(false);
    if (result) setError(result);
  };

  return (
    <Screen style={styles.screen} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
      <View style={styles.inner}>
        <Pressable onPress={() => navigation.goBack()} style={styles.brandRow}>
          <Text style={styles.emoji}>🌿</Text>
          <Text style={styles.brand}>Floraly</Text>
        </Pressable>

        <Text style={styles.title}>
          {mode === "login" ? "Welcome back" : "Join Floraly"}
        </Text>
        <Text style={styles.subtitle}>
          {mode === "login"
            ? "Sign in to reopen your nature feed, saved reels, and outdoor memories."
            : "Create an account to curate outdoor moments and share your own."}
        </Text>

        {mode === "signup" ? (
          <View style={styles.field}>
            <Text style={styles.label}>Display name</Text>
            <FloralyTextInput
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Alex Trailwalker"
              placeholderTextColor={colors.stone400}
              style={styles.input}
              autoCapitalize="words"
            />
          </View>
        ) : null}

        <View style={styles.field}>
          <Text style={styles.label}>Email</Text>
          <FloralyTextInput
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor={colors.stone400}
            style={styles.input}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Password</Text>
          <FloralyTextInput
            value={password}
            onChangeText={setPassword}
            placeholder={
              mode === "signup" ? "At least 4 characters" : "Your password"
            }
            placeholderTextColor={colors.stone400}
            style={styles.input}
            secureTextEntry
          />
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <Pressable
          onPress={handleSubmit}
          disabled={busy}
          style={[styles.submit, busy && { opacity: 0.5 }]}
        >
          {busy ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.submitText}>
              {mode === "login" ? "Sign in" : "Create account"}
            </Text>
          )}
        </Pressable>

        <Pressable
          onPress={() => {
            setMode(mode === "login" ? "signup" : "login");
            setError(null);
          }}
          style={styles.toggle}
        >
          <Text style={styles.toggleText}>
            {mode === "login"
              ? "New here? Create an account"
              : "Already have an account? Sign in"}
          </Text>
        </Pressable>

        <Text style={styles.disclaimer}>
          Demo auth is stored on this device only. Use a password you don't reuse
          elsewhere.
        </Text>
      </View>
    </KeyboardAvoidingView>
    </Screen>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
  screen: { backgroundColor: colors.cream100 },
  root: { flex: 1 },
  inner: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: spacing.lg,
    alignSelf: "flex-start",
  },
  emoji: { fontSize: 22 },
  brand: { fontSize: 22, fontWeight: "700", color: colors.forest800 },
  title: { fontSize: 28, fontWeight: "700", color: colors.forest800 },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    color: colors.stone500,
    lineHeight: 20,
  },
  field: { marginTop: spacing.md },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.forest700,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.stone200,
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.forest800,
  },
  errorBox: {
    marginTop: spacing.md,
    backgroundColor: colors.rose50,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#FECDD3",
  },
  errorText: { color: "#BE123C", fontSize: 13 },
  submit: {
    marginTop: spacing.lg,
    backgroundColor: colors.forest600,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
  },
  submitText: { color: colors.white, fontWeight: "600", fontSize: 14 },
  toggle: { marginTop: spacing.lg, alignItems: "center" },
  toggleText: {
    fontSize: 14,
    color: colors.forest700,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  disclaimer: {
    marginTop: spacing.xl,
    textAlign: "center",
    fontSize: 11,
    color: colors.stone400,
  },
});
}

