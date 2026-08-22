import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useAuth } from "../context/AuthContext";
import { useSocial } from "../context/SocialContext";
import { useTheme } from "../context/ThemeContext";
import { Screen } from "../components/Screen";
import { FloralyTextInput } from "../components/FloralyTextInput";
import { getInitials } from "../lib/auth";
import type { RootStackParamList } from "../navigation/types";
import { type AppColors, spacing } from "../theme/colors";

export function GroupsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user } = useAuth();
  const {
    followedPeople,
    myGroups,
    createGroup,
    setGroupMembers,
    leaveGroup,
    deleteGroup,
  } = useSocial();
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  const peopleById = useMemo(() => {
    const map = new Map(followedPeople.map((p) => [p.id, p]));
    if (user) {
      map.set(user.id, {
        id: user.id,
        displayName: user.displayName,
        email: user.email,
      });
    }
    return map;
  }, [followedPeople, user]);

  if (!user) return null;

  return (
    <Screen style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Pressable onPress={() => navigation.goBack()} style={styles.back}>
          <Text style={styles.backText}>‹ Back</Text>
        </Pressable>
        <Text style={styles.title}>Groups</Text>
        <Text style={styles.subtitle}>
          Private circles made from people you follow. Circle posts reach group
          members and people you follow.
        </Text>

        <View style={styles.card}>
          <Text style={styles.section}>Create a group</Text>
          <Text style={styles.label}>Name</Text>
          <FloralyTextInput
            value={name}
            onChangeText={setName}
            placeholder="Trail crew, family, etc."
            style={styles.input}
          />
          <Text style={[styles.label, { marginTop: 12 }]}>
            Add people you follow
          </Text>
          {followedPeople.length === 0 ? (
            <Text style={styles.hint}>
              Follow someone from their profile first, then you can add them
              here.
            </Text>
          ) : (
            followedPeople.map((person) => {
              const on = selected.includes(person.id);
              return (
                <Pressable
                  key={person.id}
                  onPress={() =>
                    setSelected((prev) =>
                      on
                        ? prev.filter((id) => id !== person.id)
                        : [...prev, person.id]
                    )
                  }
                  style={[styles.personRow, on && styles.personOn]}
                >
                  <View style={styles.miniAvatar}>
                    <Text style={styles.miniAvatarText}>
                      {getInitials(person.displayName)}
                    </Text>
                  </View>
                  <Text style={styles.personName}>{person.displayName}</Text>
                  <Text style={styles.personAction}>{on ? "Added" : "Add"}</Text>
                </Pressable>
              );
            })
          )}
          <Pressable
            onPress={async () => {
              const group = await createGroup(name, selected);
              if (group) {
                setName("");
                setSelected([]);
              }
            }}
            disabled={!name.trim()}
            style={[styles.createBtn, !name.trim() && { opacity: 0.4 }]}
          >
            <Text style={styles.createText}>Create group</Text>
          </Pressable>
        </View>

        <Text style={[styles.section, { marginTop: spacing.lg }]}>
          Your groups
        </Text>
        {myGroups.length === 0 ? (
          <Text style={styles.empty}>
            No groups yet. Create one above to share circle posts privately.
          </Text>
        ) : (
          myGroups.map((group) => (
            <View key={group.id} style={styles.card}>
              <View style={styles.groupHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.groupName}>{group.name}</Text>
                  <Text style={styles.groupMeta}>
                    {group.memberIds.length} member
                    {group.memberIds.length === 1 ? "" : "s"}
                    {group.ownerId === user.id ? " · you own this" : ""}
                  </Text>
                </View>
                {group.ownerId === user.id ? (
                  <View style={styles.groupActions}>
                    <Pressable
                      onPress={() =>
                        setEditingId(editingId === group.id ? null : group.id)
                      }
                      style={styles.smallBtn}
                    >
                      <Text style={styles.smallBtnText}>
                        {editingId === group.id ? "Done" : "Edit"}
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => void deleteGroup(group.id)}
                      style={styles.dangerBtn}
                    >
                      <Text style={styles.dangerText}>Delete</Text>
                    </Pressable>
                  </View>
                ) : (
                  <Pressable
                    onPress={() => void leaveGroup(group.id)}
                    style={styles.smallBtn}
                  >
                    <Text style={styles.smallBtnText}>Leave</Text>
                  </Pressable>
                )}
              </View>
              <View style={styles.chips}>
                {group.memberIds.map((id) => (
                  <View key={id} style={styles.chip}>
                    <Text style={styles.chipText}>
                      {peopleById.get(id)?.displayName ?? "Member"}
                      {id === user.id ? " (you)" : ""}
                    </Text>
                  </View>
                ))}
              </View>
              {editingId === group.id && group.ownerId === user.id
                ? followedPeople.map((person) => {
                    const on = group.memberIds.includes(person.id);
                    return (
                      <Pressable
                        key={person.id}
                        onPress={() => {
                          const next = on
                            ? group.memberIds.filter((id) => id !== person.id)
                            : [...group.memberIds, person.id];
                          void setGroupMembers(group.id, next);
                        }}
                        style={styles.personRow}
                      >
                        <Text style={styles.personName}>
                          {person.displayName}
                        </Text>
                        <Text style={styles.personAction}>
                          {on ? "Remove" : "Add"}
                        </Text>
                      </Pressable>
                    );
                  })
                : null}
            </View>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    screen: { backgroundColor: colors.cream100 },
    content: { padding: spacing.lg, paddingBottom: 40 },
    back: { marginBottom: 8 },
    backText: { color: colors.stone500, fontSize: 14 },
    title: { fontSize: 24, fontWeight: "700", color: colors.forest800 },
    subtitle: { marginTop: 4, fontSize: 13, color: colors.stone500 },
    card: {
      marginTop: spacing.md,
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.stone200,
    },
    section: {
      fontSize: 17,
      fontWeight: "700",
      color: colors.forest800,
      marginBottom: 8,
    },
    label: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.forest700,
      marginBottom: 6,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.stone200,
      backgroundColor: colors.cream50,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
      color: colors.forest800,
    },
    hint: { fontSize: 12, color: colors.stone500, marginTop: 4 },
    personRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingVertical: 8,
    },
    personOn: {
      backgroundColor: colors.cream50,
      borderRadius: 10,
      paddingHorizontal: 6,
    },
    miniAvatar: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.forest600,
      alignItems: "center",
      justifyContent: "center",
    },
    miniAvatarText: { color: colors.white, fontSize: 11, fontWeight: "700" },
    personName: { flex: 1, color: colors.forest800, fontSize: 14 },
    personAction: { color: colors.stone500, fontSize: 12 },
    createBtn: {
      marginTop: 14,
      backgroundColor: colors.forest600,
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: "center",
    },
    createText: { color: colors.white, fontWeight: "700", fontSize: 14 },
    empty: {
      marginTop: 8,
      fontSize: 13,
      color: colors.stone500,
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.stone200,
    },
    groupHeader: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
    groupName: { fontWeight: "700", color: colors.forest800, fontSize: 15 },
    groupMeta: { marginTop: 2, fontSize: 12, color: colors.stone500 },
    groupActions: { flexDirection: "row", gap: 6 },
    smallBtn: {
      backgroundColor: colors.cream100,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    smallBtnText: { fontSize: 12, fontWeight: "600", color: colors.forest800 },
    dangerBtn: {
      backgroundColor: colors.rose50,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    dangerText: { fontSize: 12, fontWeight: "600", color: colors.rose500 },
    chips: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 },
    chip: {
      backgroundColor: colors.cream100,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    chipText: { fontSize: 11, color: colors.forest800 },
  });
}
