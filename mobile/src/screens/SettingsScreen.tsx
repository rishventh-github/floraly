import { useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useAuth } from "../context/AuthContext";
import { useFloraly } from "../context/FloralyContext";
import { getInitials } from "../lib/auth";
import type { UserSettings } from "../lib/authTypes";
import type { RootStackParamList } from "../navigation/types";
import { colors, spacing } from "../theme/colors";
import { Screen } from "../components/Screen";
import { FloralyTextInput } from "../components/FloralyTextInput";

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <Pressable style={styles.toggleRow} onPress={() => onChange(!checked)}>
      <View style={{ flex: 1 }}>
        <Text style={styles.toggleLabel}>{label}</Text>
        <Text style={styles.toggleDesc}>{description}</Text>
      </View>
      <View style={[styles.switch, checked && styles.switchOn]}>
        <View style={[styles.knob, checked && styles.knobOn]} />
      </View>
    </Pressable>
  );
}

export function SettingsScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user, settings, updateSettings, updateDisplayName, logout } =
    useAuth();
  const { syncMyPostsCommentsEnabled } = useFloraly();
  const [name, setName] = useState(user?.displayName ?? "");
  const [nameMsg, setNameMsg] = useState<string | null>(null);

  useEffect(() => {
    setName(user?.displayName ?? "");
  }, [user?.displayName]);

  if (!user) return null;

  const set = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
    updateSettings({ [key]: value });
  };

  return (
    <Screen style={styles.screen}>
      <ScrollView
        style={styles.root}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
      <Pressable onPress={() => navigation.goBack()} style={styles.back}>
        <Text style={styles.backText}>‹ Back</Text>
      </Pressable>
      <Text style={styles.title}>Settings</Text>
      <Text style={styles.subtitle}>Account and experience preferences</Text>

      <View style={styles.card}>
        <View style={styles.profileRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials(user.displayName)}</Text>
          </View>
          <View>
            <Text style={styles.name}>{user.displayName}</Text>
            <Text style={styles.email}>{user.email}</Text>
            <Text style={styles.joined}>Joined {user.createdAt}</Text>
          </View>
        </View>
        <Text style={styles.label}>Display name</Text>
        <View style={styles.nameRow}>
          <FloralyTextInput
            value={name}
            onChangeText={setName}
            style={styles.input}
          />
          <Pressable
            onPress={async () => {
              const err = await updateDisplayName(name);
              setNameMsg(err ?? "Display name updated.");
            }}
            style={styles.saveBtn}
          >
            <Text style={styles.saveText}>Save</Text>
          </Pressable>
        </View>
        {nameMsg ? <Text style={styles.msg}>{nameMsg}</Text> : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.section}>Experience</Text>
        <ToggleRow
          label="Prefer nearby nature"
          description="Weight your feed toward your chosen region when available."
          checked={settings.preferLocalNature}
          onChange={(v) => set("preferLocalNature", v)}
        />
        <ToggleRow
          label="Curate bar on feed"
          description="Show the natural-language feed curator at the top of reels."
          checked={settings.showCurateBar}
          onChange={(v) => set("showCurateBar", v)}
        />
        <ToggleRow
          label="Species sticker hunt"
          description="Off by default. Turn on so flora/fauna stickers appear on reels to find and collect."
          checked={settings.speciesStickersEnabled}
          onChange={(v) => set("speciesStickersEnabled", v)}
        />
        <ToggleRow
          label="Auto-save liked reels"
          description="Hearts also add reels to your Saved collection."
          checked={settings.autoSaveLikes}
          onChange={(v) => set("autoSaveLikes", v)}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.section}>Privacy & community</Text>
        <ToggleRow
          label="Allow comments"
          description="Let others leave comments on your shared reels."
          checked={settings.allowComments}
          onChange={(v) => {
            set("allowComments", v);
            syncMyPostsCommentsEnabled(user.id, v);
          }}
        />
      </View>

      <View style={styles.shortcuts}>
        <Pressable
          onPress={() => navigation.navigate("Setup")}
          style={styles.shortcut}
        >
          <Text style={styles.shortcutText}>Edit nature interests</Text>
        </Pressable>
        <Pressable
          onPress={() => navigation.navigate("MyReels")}
          style={styles.shortcut}
        >
          <Text style={styles.shortcutText}>My reels</Text>
        </Pressable>
      </View>

      <Pressable
        onPress={() => {
          logout();
        }}
        style={styles.logout}
      >
        <Text style={styles.logoutText}>Sign out</Text>
      </Pressable>
    </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.cream100 },
  root: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: 40 },
  back: { marginBottom: 8 },
  backText: { color: colors.stone500, fontSize: 14 },
  title: { fontSize: 24, fontWeight: "700", color: colors.forest800 },
  subtitle: { marginTop: 4, fontSize: 13, color: colors.stone500 },
  card: {
    marginTop: spacing.md,
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.stone200,
  },
  profileRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.forest600,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: colors.white, fontWeight: "700", fontSize: 16 },
  name: { fontWeight: "700", color: colors.forest800 },
  email: { fontSize: 13, color: colors.stone500 },
  joined: { fontSize: 11, color: colors.stone400, marginTop: 2 },
  label: {
    marginTop: 16,
    fontSize: 13,
    fontWeight: "600",
    color: colors.forest700,
  },
  nameRow: { flexDirection: "row", gap: 8, marginTop: 8 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.stone200,
    backgroundColor: colors.cream50,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.forest800,
  },
  saveBtn: {
    backgroundColor: colors.forest600,
    borderRadius: 12,
    paddingHorizontal: 16,
    justifyContent: "center",
  },
  saveText: { color: colors.white, fontWeight: "600" },
  msg: { marginTop: 8, fontSize: 12, color: colors.stone500 },
  section: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.forest800,
    marginBottom: 4,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.stone200,
  },
  toggleLabel: { fontSize: 14, fontWeight: "600", color: colors.forest800 },
  toggleDesc: { marginTop: 2, fontSize: 12, color: colors.stone500 },
  switch: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.stone200,
    padding: 2,
    justifyContent: "center",
  },
  switchOn: { backgroundColor: colors.forest600 },
  knob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.white,
  },
  knobOn: { alignSelf: "flex-end" },
  shortcuts: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: spacing.md },
  shortcut: {
    backgroundColor: colors.moss300,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  shortcutText: { color: colors.forest700, fontWeight: "600", fontSize: 13 },
  logout: {
    marginTop: spacing.lg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#FECDD3",
    backgroundColor: colors.rose50,
    paddingVertical: 14,
    alignItems: "center",
  },
  logoutText: { color: colors.rose500, fontWeight: "700" },
});
