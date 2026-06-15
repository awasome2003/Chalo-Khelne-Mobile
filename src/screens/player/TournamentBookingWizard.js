// 4-step booking wizard: Sport → Format → Category → Terms & Conditions.
// Replaces the inline category-picker bottom sheet on TournamentDetails so
// multi-format multi-sport tournaments get a proper guided flow.
//
// One sport per booking (Q2 = single sport scope). Multi-select formats
// within that sport (Q1 = Option A — distinct sports[] entries with the
// same sportName are treated as different formats for that sport, so this
// wizard works with the existing schema unchanged).
//
// Categories are unioned across all checked formats and deduped by name
// (Q2 = Option A). For each (selected format × selected category) pair, one
// entry lands in the booking payload — preserving the existing API contract
// the BookingScreen expects.

import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { getSportName } from "../../utils/sportTrack";
import { useAuth } from "../../context/AuthContext";
import { eligibilityFor } from "../../utils/eligibility";

const ACCENT = "#FF6A00";

// Pretty-print server type strings ("knockout + group stage" → "Group + Knockout").
const formatTypeLabel = (s) => {
  if (!s) return "Format";
  const lower = String(s).toLowerCase();
  if (lower.includes("group stage") && lower.includes("knockout")) return "Group + Knockout";
  if (lower === "knockout") return "Knockout";
  if (lower === "group stage") return "Group Stage";
  if (lower.includes("team")) return "Team Knockout";
  return String(s).replace(/\b\w/g, (c) => c.toUpperCase());
};

// Subtitle for the format card — clarifies things like "Davis Cup".
const formatTypeSubtitle = (entry) => {
  const ko = (entry.knockoutFormat || "").trim();
  if (ko && ko.toLowerCase() !== "singles") return ko; // "Davis Cup" etc.
  if ((entry.type || "").toLowerCase().includes("team")) return "Team format";
  if ((entry.type || "").toLowerCase() === "knockout") return "Direct elimination bracket";
  if ((entry.type || "").toLowerCase().includes("group stage")) return "Group stage qualifies into final knockout";
  return "";
};

const STEPS = [
  { key: "sport", label: "Sport" },
  { key: "format", label: "Format" },
  { key: "category", label: "Category" },
  { key: "terms", label: "Terms" },
];

export default function TournamentBookingWizard({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const {
    tournament,
    employeeId: passedEmployeeId,
  } = route.params || {};

  // Tournament start date powers the age-at-tournament-start computation in
  // the eligibility helper. Read from rawData first (server shape), fall
  // back to the flat field for legacy local data.
  const tournamentStartDate =
    tournament?.rawData?.startDate || tournament?.startDate || null;

  const [step, setStep] = useState(0);

  // Build a {sportName: [sportEntry, ...]} lookup. Each sport entry from
  // tournament.sports[] is treated as one (sport, format) pair. Multiple
  // entries with the same sportName = multiple formats for that sport.
  const formatsBySport = useMemo(() => {
    const map = {};
    const sportsArr = tournament?.rawData?.sports || tournament?.sports || [];
    for (const s of sportsArr) {
      if (!s) continue;
      const name = s.sportName || getSportName(tournament) || "Sport";
      if (!map[name]) map[name] = [];
      map[name].push({
        // Stable key to identify this specific (sport, format) entry —
        // server-assigned _id when present, else fall back to sportId.
        sportEntryId: String(s._id || s.sportId || `${name}-${s.type || "x"}`),
        sportId: String(s.sportId || ""),
        sportName: name,
        sportSlug: s.sportSlug || "",
        type: s.type || "knockout",
        knockoutFormat: s.knockoutFormat || null,
        groupStageFormat: s.groupStageFormat || null,
        categories: Array.isArray(s.categories) ? s.categories : [],
      });
    }
    return map;
  }, [tournament]);

  const sportNames = useMemo(() => Object.keys(formatsBySport), [formatsBySport]);

  // ── selection state ──────────────────────────────────────────────────
  const [selectedSport, setSelectedSport] = useState(
    sportNames.length === 1 ? sportNames[0] : null
  );
  // Set of sportEntryId strings (one per format checkbox)
  const [selectedFormats, setSelectedFormats] = useState(() => new Set());
  // Map<categoryName, true> — categories are unioned + deduped by name
  const [selectedCategories, setSelectedCategories] = useState(() => new Set());
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Available formats for the chosen sport
  const availableFormats = selectedSport ? formatsBySport[selectedSport] || [] : [];

  // Auto-pre-check the only format if there's just one. The user still has
  // to acknowledge by tapping Continue, but they don't have to manually
  // check a single forced option.
  React.useEffect(() => {
    if (step === 1 && availableFormats.length === 1) {
      const onlyId = availableFormats[0].sportEntryId;
      setSelectedFormats((prev) => {
        if (prev.has(onlyId)) return prev;
        const next = new Set(prev);
        next.add(onlyId);
        return next;
      });
    }
  }, [step, availableFormats]);

  // Union of categories from checked formats, deduped by lowercase name.
  // Each entry tracks which formats it's available in, so we can build the
  // booking payload (one row per format × category pair). Eligibility fields
  // (minAge/maxAge/gender) are kept from the first format that defines them
  // — same-named categories with divergent restrictions are a data-integrity
  // edge case the server gate catches on submit.
  const unionedCategories = useMemo(() => {
    const byName = new Map();
    for (const fmt of availableFormats) {
      if (!selectedFormats.has(fmt.sportEntryId)) continue;
      for (const c of fmt.categories || []) {
        const name = c.name || c.categoryName || c.title;
        if (!name) continue;
        const key = name.trim().toLowerCase();
        if (!byName.has(key)) {
          byName.set(key, {
            name,
            // pick the first non-zero fee we see — display-only; per-format
            // fee variations get expanded into separate lines in the
            // booking payload at submit time.
            fee: c.fee ?? c.amount ?? 0,
            availableInFormats: [],
            minAge: c.minAge ?? null,
            maxAge: c.maxAge ?? null,
            gender: c.gender || "any",
          });
        }
        const entry = byName.get(key);
        entry.availableInFormats.push(fmt.sportEntryId);
        // bump display fee if this format has a higher one (cosmetic)
        const f = c.fee ?? c.amount ?? 0;
        if (f > entry.fee) entry.fee = f;
      }
    }
    return Array.from(byName.values());
  }, [availableFormats, selectedFormats]);

  // Display total — sums (each selected format × each selected category)
  // using the actual fee from that format's category list. This is what the
  // booking payload will charge.
  const totalFee = useMemo(() => {
    let sum = 0;
    for (const fmt of availableFormats) {
      if (!selectedFormats.has(fmt.sportEntryId)) continue;
      for (const c of fmt.categories || []) {
        const name = (c.name || c.categoryName || c.title || "").trim().toLowerCase();
        if (!name) continue;
        if (selectedCategories.has(name)) {
          sum += Number(c.fee ?? c.amount ?? 0);
        }
      }
    }
    return sum;
  }, [availableFormats, selectedFormats, selectedCategories]);

  // ── step gating ──────────────────────────────────────────────────────
  const canProceed = (() => {
    if (step === 0) return !!selectedSport;
    if (step === 1) return selectedFormats.size > 0;
    if (step === 2) return selectedCategories.size > 0;
    if (step === 3) return termsAccepted;
    return false;
  })();

  const onContinue = () => {
    if (!canProceed) return;
    if (step < STEPS.length - 1) {
      setStep(step + 1);
      return;
    }
    submitToBookingScreen();
  };

  const onBack = () => {
    if (step === 0) {
      navigation.goBack();
      return;
    }
    setStep(step - 1);
  };

  const toggleFormat = (id) => {
    setSelectedFormats((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    // Note: pruning of orphaned selectedCategories is handled by the effect
    // below (driven by selectedFormats), which runs AFTER the state update
    // commits — avoiding the stale-closure race a setTimeout would have hit.
  };

  // Prune selectedCategories whenever the active format set shrinks. Categories
  // that are no longer present in any checked format get dropped automatically
  // so the user can't proceed with a phantom selection.
  React.useEffect(() => {
    const stillAvailable = new Set();
    for (const fmt of availableFormats) {
      if (!selectedFormats.has(fmt.sportEntryId)) continue;
      for (const c of fmt.categories || []) {
        const name = (c.name || c.categoryName || c.title || "").trim().toLowerCase();
        if (name) stillAvailable.add(name);
      }
    }
    setSelectedCategories((prev) => {
      let changed = false;
      const next = new Set();
      for (const k of prev) {
        if (stillAvailable.has(k)) next.add(k);
        else changed = true;
      }
      return changed ? next : prev;
    });
  }, [selectedFormats, availableFormats]);

  const toggleCategory = (name) => {
    const key = name.trim().toLowerCase();
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // Build sportSelections for the BookingScreen API — one entry per
  // (selected format × selected category that exists in that format).
  const submitToBookingScreen = () => {
    const sportSelections = [];
    for (const fmt of availableFormats) {
      if (!selectedFormats.has(fmt.sportEntryId)) continue;
      for (const c of fmt.categories || []) {
        const cName = c.name || c.categoryName || c.title;
        if (!cName) continue;
        if (!selectedCategories.has(cName.trim().toLowerCase())) continue;
        sportSelections.push({
          sportId: fmt.sportId || null,
          sportName: fmt.sportName,
          categoryName: cName,
          fee: Number(c.fee ?? c.amount ?? 0),
        });
      }
    }
    // Legacy shape preserved alongside — selectedCategory is what the
    // existing BookingScreen review UI reads.
    const selectedCategoryLegacy = sportSelections.map((s, i) => ({
      _id: `${s.sportId}-${s.categoryName}-${i}`,
      name: s.categoryName,
      fee: s.fee,
      sportId: s.sportId,
      sportName: s.sportName,
    }));
    navigation.navigate("Booking Screen", {
      tournament,
      selectedCategory: selectedCategoryLegacy,
      sportSelections,
      employeeId: passedEmployeeId || null,
    });
  };

  return (
    <View style={styles.container}>
      {/* Header with progress indicator */}
      <LinearGradient
        colors={["#FF8C00", ACCENT]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.header, { paddingTop: insets.top + 12 }]}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={onBack} style={styles.headerBtn}>
            <Ionicons name="arrow-back" size={22} color="#FFF" />
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>Register</Text>
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {tournament?.name || tournament?.title || "Tournament"}
            </Text>
          </View>
          <View style={{ width: 38 }} />
        </View>

        {/* Step pills */}
        <View style={styles.stepStrip}>
          {STEPS.map((s, i) => {
            const isActive = i === step;
            const isDone = i < step;
            return (
              <View key={s.key} style={styles.stepPillWrap}>
                <View
                  style={[
                    styles.stepPill,
                    isActive && styles.stepPillActive,
                    isDone && styles.stepPillDone,
                  ]}
                >
                  {isDone ? (
                    <Ionicons name="checkmark" size={12} color="#FFF" />
                  ) : (
                    <Text
                      style={[
                        styles.stepPillText,
                        isActive && styles.stepPillTextActive,
                      ]}
                    >
                      {i + 1}
                    </Text>
                  )}
                </View>
                <Text
                  style={[
                    styles.stepLabel,
                    (isActive || isDone) && styles.stepLabelActive,
                  ]}
                >
                  {s.label}
                </Text>
              </View>
            );
          })}
        </View>
      </LinearGradient>

      {/* Body */}
      <ScrollView style={styles.body} contentContainerStyle={{ padding: 16, paddingBottom: 24 }}>
        {step === 0 && (
          <SportStep
            sportNames={sportNames}
            formatsBySport={formatsBySport}
            selectedSport={selectedSport}
            onPick={(name) => {
              setSelectedSport(name);
              // Reset downstream selections when the sport changes
              setSelectedFormats(new Set());
              setSelectedCategories(new Set());
            }}
          />
        )}

        {step === 1 && (
          <FormatStep
            formats={availableFormats}
            selected={selectedFormats}
            onToggle={toggleFormat}
          />
        )}

        {step === 2 && (
          <CategoryStep
            categories={unionedCategories}
            selected={selectedCategories}
            onToggle={toggleCategory}
            totalFee={totalFee}
            user={user}
            tournamentStartDate={tournamentStartDate}
          />
        )}

        {step === 3 && (
          <TermsStep
            text={tournament?.rawData?.termsAndConditions || tournament?.termsAndConditions}
            accepted={termsAccepted}
            onToggle={() => setTermsAccepted((v) => !v)}
            totalFee={totalFee}
          />
        )}
      </ScrollView>

      {/* Footer — Continue / Pay button */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        {step === 2 && totalFee > 0 && (
          <View style={styles.footerTotalRow}>
            <Text style={styles.footerTotalLabel}>Total</Text>
            <Text style={styles.footerTotalValue}>₹{totalFee}</Text>
          </View>
        )}
        <TouchableOpacity
          style={[styles.continueBtn, !canProceed && styles.continueBtnDisabled]}
          onPress={onContinue}
          disabled={!canProceed}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={
              canProceed ? ["#FF8C00", ACCENT] : ["#CFD8DC", "#B0BEC5"]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.continueBtnGrad}
          >
            <Text style={styles.continueBtnText}>
              {step === STEPS.length - 1 ? "Continue to Booking" : "Continue"}
            </Text>
            <Ionicons name="arrow-forward" size={18} color="#FFF" />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Step 0 — Sport
// ────────────────────────────────────────────────────────────────────────────
function SportStep({ sportNames, formatsBySport, selectedSport, onPick }) {
  if (sportNames.length === 0) {
    return (
      <View style={styles.emptyBox}>
        <MaterialIcons name="sports" size={48} color="#CFD8DC" />
        <Text style={styles.emptyTitle}>No sports available</Text>
        <Text style={styles.emptyText}>
          This tournament doesn't have any sports configured yet.
        </Text>
      </View>
    );
  }
  return (
    <View>
      <Text style={styles.stepTitle}>Choose your sport</Text>
      <Text style={styles.stepHint}>
        Pick the sport you want to register for. You'll select format(s) next.
      </Text>
      <View style={{ marginTop: 14 }}>
        {sportNames.map((name) => {
          const isSel = selectedSport === name;
          const formatCount = (formatsBySport[name] || []).length;
          return (
            <TouchableOpacity
              key={name}
              style={[styles.choiceCard, isSel && styles.choiceCardActive]}
              onPress={() => onPick(name)}
              activeOpacity={0.85}
            >
              <View
                style={[
                  styles.iconBubble,
                  isSel && { backgroundColor: ACCENT },
                ]}
              >
                <MaterialIcons
                  name="sports-tennis"
                  size={20}
                  color={isSel ? "#FFF" : ACCENT}
                />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.choiceTitle}>{name}</Text>
                <Text style={styles.choiceSubtitle}>
                  {formatCount} format{formatCount === 1 ? "" : "s"} available
                </Text>
              </View>
              <View
                style={[styles.radio, isSel && styles.radioActive]}
              >
                {isSel && <View style={styles.radioDot} />}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Step 1 — Format (multi-select checkboxes)
// ────────────────────────────────────────────────────────────────────────────
function FormatStep({ formats, selected, onToggle }) {
  return (
    <View>
      <Text style={styles.stepTitle}>Choose format(s)</Text>
      <Text style={styles.stepHint}>
        You can register for more than one format. Categories from each picked
        format will be combined on the next step.
      </Text>
      <View style={{ marginTop: 14 }}>
        {formats.map((fmt) => {
          const isSel = selected.has(fmt.sportEntryId);
          const subtitle = formatTypeSubtitle(fmt);
          const catCount = fmt.categories?.length || 0;
          return (
            <TouchableOpacity
              key={fmt.sportEntryId}
              style={[styles.choiceCard, isSel && styles.choiceCardActive]}
              onPress={() => onToggle(fmt.sportEntryId)}
              activeOpacity={0.85}
            >
              <View
                style={[styles.checkBox, isSel && styles.checkBoxActive]}
              >
                {isSel && <Ionicons name="checkmark" size={16} color="#FFF" />}
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.choiceTitle}>
                  {formatTypeLabel(fmt.type)}
                </Text>
                {!!subtitle && (
                  <Text style={styles.choiceSubtitle}>{subtitle}</Text>
                )}
                <Text style={[styles.choiceSubtitle, { marginTop: 2 }]}>
                  {catCount} categor{catCount === 1 ? "y" : "ies"}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Step 2 — Category (multi-select)
// ────────────────────────────────────────────────────────────────────────────
function CategoryStep({ categories, selected, onToggle, totalFee, user, tournamentStartDate }) {
  if (categories.length === 0) {
    return (
      <View style={styles.emptyBox}>
        <MaterialIcons name="category" size={48} color="#CFD8DC" />
        <Text style={styles.emptyTitle}>No categories available</Text>
        <Text style={styles.emptyText}>
          The selected format(s) don't have any categories.
        </Text>
      </View>
    );
  }
  return (
    <View>
      <Text style={styles.stepTitle}>Choose categories</Text>
      <Text style={styles.stepHint}>
        Pick the categories you want to register for. Fee is summed across all
        selected category × format pairs.
      </Text>
      <View style={{ marginTop: 14 }}>
        {categories.map((cat) => {
          const key = cat.name.trim().toLowerCase();
          const isSel = selected.has(key);
          const isFree = Number(cat.fee || 0) === 0;
          const { eligible, reason } = eligibilityFor(user, cat, tournamentStartDate);

          // Ineligible cards: render dimmed, no checkbox, no tap response,
          // show the reason inline so the player understands why it's
          // locked. The server gate is still authoritative on submit.
          if (!eligible) {
            return (
              <View
                key={key}
                style={[styles.choiceCard, styles.choiceCardDisabled]}
                accessibilityRole="text"
                accessibilityLabel={`${cat.name} — ${reason}`}
              >
                <View style={[styles.checkBox, styles.checkBoxDisabled]}>
                  <Ionicons name="lock-closed" size={12} color="#9AA0A6" />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.choiceTitle, styles.choiceTitleDisabled]}>
                    {cat.name}
                  </Text>
                  <Text style={styles.choiceSubtitleDisabled}>
                    {reason}
                  </Text>
                </View>
              </View>
            );
          }

          return (
            <TouchableOpacity
              key={key}
              style={[styles.choiceCard, isSel && styles.choiceCardActive]}
              onPress={() => onToggle(cat.name)}
              activeOpacity={0.85}
            >
              <View
                style={[styles.checkBox, isSel && styles.checkBoxActive]}
              >
                {isSel && <Ionicons name="checkmark" size={16} color="#FFF" />}
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.choiceTitle}>{cat.name}</Text>
                <Text style={styles.choiceSubtitle}>
                  {isFree ? "Free entry" : `Registration: ₹${cat.fee}`}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Step 3 — Terms & Conditions
// ────────────────────────────────────────────────────────────────────────────
function TermsStep({ text, accepted, onToggle, totalFee }) {
  const trimmed = (text || "").trim();
  return (
    <View>
      <Text style={styles.stepTitle}>Terms & Conditions</Text>
      <Text style={styles.stepHint}>
        Please review the tournament's terms before continuing.
      </Text>

      <View style={styles.tcBox}>
        {trimmed ? (
          <Text style={styles.tcText}>{trimmed}</Text>
        ) : (
          <Text style={styles.tcEmpty}>
            The organizer hasn't published specific terms for this tournament.
            Standard sporting conduct, registration finality, and tournament
            rules apply.
          </Text>
        )}
      </View>

      <TouchableOpacity
        style={[styles.acceptRow, accepted && styles.acceptRowActive]}
        onPress={onToggle}
        activeOpacity={0.7}
      >
        <View style={[styles.checkBox, accepted && styles.checkBoxActive]}>
          {accepted && <Ionicons name="checkmark" size={16} color="#FFF" />}
        </View>
        <Text style={[styles.acceptText, accepted && { color: "#1F2937" }]}>
          I have read and agree to these terms
        </Text>
      </TouchableOpacity>

      {totalFee > 0 && (
        <View style={styles.tcSummaryBox}>
          <Text style={styles.tcSummaryLabel}>Registration total</Text>
          <Text style={styles.tcSummaryValue}>₹{totalFee}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FA" },

  header: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.18)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitleWrap: { flex: 1, alignItems: "center", paddingHorizontal: 8 },
  headerTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFF",
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: "600",
    color: "rgba(255,255,255,0.85)",
    marginTop: 2,
    maxWidth: 240,
  },

  stepStrip: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 4,
  },
  stepPillWrap: { alignItems: "center", flex: 1 },
  stepPill: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.25)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.4)",
  },
  stepPillActive: {
    backgroundColor: "#FFF",
    borderColor: "#FFF",
  },
  stepPillDone: {
    backgroundColor: "rgba(255,255,255,0.95)",
    borderColor: "#FFF",
  },
  stepPillText: { fontSize: 11, fontWeight: "800", color: "#FFF" },
  stepPillTextActive: { color: ACCENT },
  stepLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "rgba(255,255,255,0.7)",
    marginTop: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  stepLabelActive: { color: "#FFF" },

  body: { flex: 1 },

  stepTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1F2937",
  },
  stepHint: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
    lineHeight: 18,
  },

  choiceCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
  },
  choiceCardActive: {
    borderColor: ACCENT,
    backgroundColor: "#FFF7ED",
  },
  choiceCardDisabled: {
    backgroundColor: "#F5F6F8",
    borderColor: "#E5E7EB",
    opacity: 0.75,
  },
  checkBoxDisabled: {
    backgroundColor: "#E5E7EB",
    borderColor: "#E5E7EB",
  },
  choiceTitleDisabled: {
    color: "#9AA0A6",
  },
  choiceSubtitleDisabled: {
    fontSize: 11,
    color: "#D32F2F",
    marginTop: 2,
    fontWeight: "600",
  },
  iconBubble: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFF7ED",
    justifyContent: "center",
    alignItems: "center",
  },
  choiceTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1F2937",
  },
  choiceSubtitle: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
    fontWeight: "500",
  },

  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#CFD8DC",
    justifyContent: "center",
    alignItems: "center",
  },
  radioActive: { borderColor: ACCENT },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: ACCENT,
  },

  checkBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#CFD8DC",
    justifyContent: "center",
    alignItems: "center",
  },
  checkBoxActive: {
    borderColor: ACCENT,
    backgroundColor: ACCENT,
  },

  emptyBox: {
    backgroundColor: "#FFF",
    borderRadius: 14,
    padding: 28,
    alignItems: "center",
    marginTop: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderStyle: "dashed",
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#374151",
    marginTop: 12,
  },
  emptyText: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
    textAlign: "center",
    maxWidth: 260,
    lineHeight: 18,
  },

  tcBox: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    marginTop: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    maxHeight: 320,
  },
  tcText: {
    fontSize: 13,
    color: "#374151",
    lineHeight: 21,
  },
  tcEmpty: {
    fontSize: 12,
    color: "#6B7280",
    fontStyle: "italic",
    lineHeight: 19,
  },

  acceptRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 14,
    marginTop: 14,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
  },
  acceptRowActive: {
    borderColor: ACCENT,
    backgroundColor: "#FFF7ED",
  },
  acceptText: {
    fontSize: 13,
    color: "#374151",
    fontWeight: "600",
    marginLeft: 12,
    flex: 1,
  },

  tcSummaryBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFF7ED",
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#FED7AA",
  },
  tcSummaryLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#7C2D12",
  },
  tcSummaryValue: {
    fontSize: 22,
    fontWeight: "900",
    color: ACCENT,
  },

  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: "#FFF",
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  footerTotalRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  footerTotalLabel: { fontSize: 13, fontWeight: "700", color: "#6B7280" },
  footerTotalValue: { fontSize: 22, fontWeight: "900", color: "#1F2937" },

  continueBtn: { borderRadius: 14, overflow: "hidden" },
  continueBtnDisabled: { opacity: 0.6 },
  continueBtnGrad: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    gap: 8,
  },
  continueBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFF",
    letterSpacing: 0.5,
  },
});
