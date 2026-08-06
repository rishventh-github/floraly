import { useCallback, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  SPECIES_CATALOG,
  getRiskMeta,
  spinSpeciesWheel,
  type SpeciesCard,
} from "../lib/speciesCatalog";
import { assetUrl } from "../lib/constants";
import { colors, spacing } from "../theme/colors";

interface LuckySliderProps {
  value: SpeciesCard | null;
  onChange: (card: SpeciesCard | null) => void;
  disabled?: boolean;
}

const CARD_SIZE = 72;
const GAP = 8;
const VISIBLE_CARDS = 5;
const TRACK_WIDTH = VISIBLE_CARDS * CARD_SIZE + (VISIBLE_CARDS - 1) * GAP;

const RISK_COLORS: Record<string, { bg: string; text: string }> = {
  least_concern: { bg: "#D1FAE5", text: "#065F46" },
  near_threatened: { bg: "#ECFCCB", text: "#3F6212" },
  not_evaluated: { bg: "#F5F5F4", text: "#44403C" },
  vulnerable: { bg: "#FEF3C7", text: "#92400E" },
  data_deficient: { bg: "#E0F2FE", text: "#075985" },
  endangered: { bg: "#FFEDD5", text: "#9A3412" },
  critically_endangered: { bg: "#FEE2E2", text: "#991B1B" },
  extinct_in_wild: { bg: "#EDE9FE", text: "#5B21B6" },
  extinct: { bg: "#1C1917", text: "#FAFAF9" },
};

function buildStrip(count: number): SpeciesCard[] {
  const strip: SpeciesCard[] = [];
  for (let i = 0; i < count; i++) {
    strip.push(SPECIES_CATALOG[i % SPECIES_CATALOG.length]);
  }
  for (let i = strip.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [strip[i], strip[j]] = [strip[j], strip[i]];
  }
  return strip;
}

export function LuckySlider({ value, onChange, disabled }: LuckySliderProps) {
  const [spinning, setSpinning] = useState(false);
  const [strip, setStrip] = useState<SpeciesCard[]>(() => buildStrip(60));
  const offset = useRef(new Animated.Value(0)).current;
  const hasSpun = Boolean(value) || spinning;

  const spin = useCallback(() => {
    if (disabled || spinning || value) return;
    setSpinning(true);
    const result = spinSpeciesWheel();
    const targetIdx = 45 + Math.floor(Math.random() * 5);
    const newStrip = buildStrip(60);
    newStrip[targetIdx] = result;
    setStrip(newStrip);

    const centerOffset =
      targetIdx * (CARD_SIZE + GAP) -
      Math.floor(VISIBLE_CARDS / 2) * (CARD_SIZE + GAP);

    offset.setValue(0);
    Animated.timing(offset, {
      toValue: -centerOffset,
      duration: 3000,
      easing: Easing.bezier(0.12, 0.75, 0.12, 1),
      useNativeDriver: true,
    }).start(() => {
      onChange(result);
      setSpinning(false);
    });
  }, [disabled, spinning, value, onChange, offset]);

  const riskPalette = value
    ? RISK_COLORS[value.riskLevel] ?? RISK_COLORS.least_concern
    : null;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>
        Lucky Slider{" "}
        <Text style={styles.required}>(required · one spin)</Text>
      </Text>
      <Text style={styles.hint}>
        You must slide once for a flora or fauna sticker before sharing. Rarer
        conservation statuses appear far less often.
      </Text>

      <View style={styles.trackOuter}>
        <View style={styles.centerLine} />
        <Animated.View
          style={[styles.track, { transform: [{ translateX: offset }] }]}
        >
          {strip.map((species, i) => {
            const meta = getRiskMeta(species.riskLevel);
            const palette = RISK_COLORS[meta.id] ?? RISK_COLORS.least_concern;
            return (
              <View
                key={`${species.id}-${i}`}
                style={[
                  styles.speciesCard,
                  { borderColor: palette.bg, backgroundColor: palette.bg },
                ]}
              >
                <Image
                  source={{ uri: assetUrl(species.imageUrl) }}
                  style={styles.speciesImg}
                />
                <Text style={styles.speciesName} numberOfLines={1}>
                  {species.name}
                </Text>
              </View>
            );
          })}
        </Animated.View>
      </View>

      <View style={styles.actions}>
        {!hasSpun ? (
          <Pressable
            disabled={disabled || spinning}
            onPress={spin}
            style={[styles.spinBtn, (disabled || spinning) && styles.disabled]}
          >
            <Text style={styles.spinText}>
              {spinning ? "Sliding..." : "Slide for a card"}
            </Text>
          </Pressable>
        ) : null}
        {value && !spinning ? (
          <Text style={styles.locked}>Card locked in - one sticker per reel.</Text>
        ) : null}
        {!value && !spinning ? (
          <Text style={styles.unlockHint}>
            Slide to unlock sharing with the community.
          </Text>
        ) : null}
      </View>

      {value && !spinning && riskPalette ? (
        <View
          style={[
            styles.result,
            { backgroundColor: riskPalette.bg, borderColor: riskPalette.bg },
          ]}
        >
          <Image
            source={{ uri: assetUrl(value.imageUrl) }}
            style={styles.resultImg}
          />
          <View style={{ flex: 1 }}>
            <Text style={[styles.resultName, { color: riskPalette.text }]}>
              {value.name}
            </Text>
            <Text style={[styles.resultMeta, { color: riskPalette.text }]}>
              {getRiskMeta(value.riskLevel).label} ·{" "}
              {getRiskMeta(value.riskLevel).points} pts
            </Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: spacing.lg,
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.stone200,
  },
  title: { fontSize: 14, fontWeight: "600", color: colors.forest700 },
  required: { fontWeight: "400", color: colors.rose500 },
  hint: { marginTop: 4, fontSize: 12, color: colors.stone500, lineHeight: 18 },
  trackOuter: {
    marginTop: spacing.md,
    alignSelf: "center",
    width: TRACK_WIDTH,
    height: CARD_SIZE + 16,
    overflow: "hidden",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.forest600,
    backgroundColor: colors.cream50,
  },
  centerLine: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: "50%",
    marginLeft: -2,
    width: 4,
    backgroundColor: colors.forest600,
    opacity: 0.6,
    zIndex: 2,
  },
  track: {
    position: "absolute",
    top: 8,
    left: 0,
    flexDirection: "row",
    gap: GAP,
  },
  speciesCard: {
    width: CARD_SIZE,
    height: CARD_SIZE,
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 2,
  },
  speciesImg: { width: "100%", height: "100%" },
  speciesName: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    color: colors.white,
    fontSize: 8,
    textAlign: "center",
    paddingVertical: 2,
    paddingHorizontal: 2,
  },
  actions: {
    marginTop: spacing.md,
    alignItems: "center",
    gap: 8,
  },
  spinBtn: {
    backgroundColor: colors.forest600,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  spinText: { color: colors.white, fontWeight: "600", fontSize: 14 },
  disabled: { opacity: 0.5 },
  locked: { fontSize: 12, color: colors.stone500 },
  unlockHint: { fontSize: 12, color: colors.rose500, textAlign: "center" },
  result: {
    marginTop: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
  },
  resultImg: { width: 48, height: 48, borderRadius: 6 },
  resultName: { fontSize: 14, fontWeight: "700" },
  resultMeta: { fontSize: 12, marginTop: 2, opacity: 0.85 },
});
