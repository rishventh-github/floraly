import { useEffect, useState, useMemo } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { ReelMusic } from "../lib/types";
import { searchMusicTracks } from "../lib/communityClient";
import { type AppColors, spacing } from "../theme/colors";
import { useTheme } from "../context/ThemeContext";
import { FloralyTextInput } from "./FloralyTextInput";

interface MusicPickerProps {
  value: ReelMusic | null;
  onChange: (music: ReelMusic | null) => void;
  disabled?: boolean;
}

export function MusicPicker({ value, onChange, disabled }: MusicPickerProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ReelMusic[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const tracks = await searchMusicTracks(q);
        if (!cancelled) {
          setResults(tracks);
          setError(
            tracks.length === 0 ? "No songs found - try another search." : null
          );
        }
      } catch {
        if (!cancelled) {
          setResults([]);
          setError("Couldn't search music right now.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>
        Music <Text style={styles.optional}>(optional)</Text>
      </Text>
      <Text style={styles.hint}>
        Search for a song that fits the mood of this nature reel.
      </Text>

      {value ? (
        <View style={styles.selected}>
          {value.artworkUrl ? (
            <Image source={{ uri: value.artworkUrl }} style={styles.art} />
          ) : (
            <View style={[styles.art, styles.artFallback]}>
              <Text style={styles.artFallbackText}>Music</Text>
            </View>
          )}
          <View style={styles.selectedText}>
            <Text style={styles.title} numberOfLines={1}>
              {value.title}
            </Text>
            <Text style={styles.artist} numberOfLines={1}>
              {value.artist}
            </Text>
          </View>
          <Pressable
            disabled={disabled}
            onPress={() => onChange(null)}
            style={styles.removeBtn}
          >
            <Text style={styles.removeText}>Remove</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <FloralyTextInput
            value={query}
            editable={!disabled}
            onChangeText={setQuery}
            placeholder="Search songs, artists, albums..."
            placeholderTextColor={colors.stone400}
            style={styles.input}
          />
          {loading ? (
            <ActivityIndicator
              style={{ marginTop: spacing.sm }}
              color={colors.forest600}
            />
          ) : null}
          {error && !loading ? (
            <Text style={styles.error}>{error}</Text>
          ) : null}
          {results.length > 0 ? (
            <View style={styles.results}>
              {results.map((track) => (
                <Pressable
                  key={track.id}
                  disabled={disabled}
                  onPress={() => {
                    onChange(track);
                    setQuery("");
                    setResults([]);
                  }}
                  style={styles.resultRow}
                >
                  {track.artworkUrl ? (
                    <Image
                      source={{ uri: track.artworkUrl }}
                      style={styles.resultArt}
                    />
                  ) : (
                    <View style={[styles.resultArt, styles.artFallback]}>
                      <Text style={styles.tiny}>Track</Text>
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.title} numberOfLines={1}>
                      {track.title}
                    </Text>
                    <Text style={styles.artist} numberOfLines={1}>
                      {track.artist}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
          ) : null}
        </>
      )}
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
  wrap: { marginTop: spacing.lg },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.forest700,
  },
  optional: { fontWeight: "400", color: colors.stone400 },
  hint: { marginTop: 4, fontSize: 12, color: colors.stone500 },
  selected: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.cream50,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.moss300,
  },
  art: { width: 48, height: 48, borderRadius: 8 },
  artFallback: {
    backgroundColor: colors.forest600,
    alignItems: "center",
    justifyContent: "center",
  },
  artFallbackText: { color: colors.white, fontSize: 10, fontWeight: "600" },
  selectedText: { flex: 1, minWidth: 0 },
  title: { fontSize: 14, fontWeight: "600", color: colors.forest800 },
  artist: { fontSize: 12, color: colors.stone500, marginTop: 2 },
  removeBtn: { paddingHorizontal: 8, paddingVertical: 4 },
  removeText: { fontSize: 12, fontWeight: "600", color: colors.rose500 },
  input: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.stone200,
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.forest800,
  },
  error: { marginTop: 8, fontSize: 12, color: colors.stone500 },
  results: {
    marginTop: 8,
    maxHeight: 220,
    borderWidth: 1,
    borderColor: colors.stone200,
    borderRadius: 12,
    backgroundColor: colors.surface,
    overflow: "hidden",
  },
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.stone200,
  },
  resultArt: { width: 40, height: 40, borderRadius: 6 },
  tiny: { fontSize: 9, color: colors.white, fontWeight: "600" },
});
}

