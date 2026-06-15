import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  StatusBar,
  Modal,
  Pressable,
  Dimensions,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons, Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SvgUri } from "react-native-svg";
import { Asset } from "expo-asset";
import DateTimePicker from "@react-native-community/datetimepicker";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../../context/AuthContext";
import JOBS from "../../api/jobs";
import ErrorBanner from "../../components/ErrorBanner";

const ROLE_LABELS = {
  referee: "Referee",
  coach: "Coach",
  scorer: "Scorer",
  cameraman: "Cameraman",
  commentator: "Commentator",
  event_staff: "Event Staff",
  physiotherapist: "Physiotherapist",
  photographer: "Photographer",
  ground_staff: "Ground Staff",
};
const RATE_UNIT_LABELS = { per_hour: "per hour", per_match: "per match", per_day: "per day" };

// Map a backend ProfessionalProfile document to the card/sheet shape this screen uses.
const mapProfessional = (p) => {
  const sport = (p.sports && p.sports[0]) || "";
  const roleLabel = ROLE_LABELS[p.role] || p.role || "Professional";
  return {
    id: p._id,
    profileId: p._id,
    name: p.userId?.name || "Professional",
    role: `${sport} ${roleLabel}`.trim(),
    rating: p.rating || 0,
    level: p.tier || "Professional",
    location: p.city || p.userId?.address || "",
    sport,
    licenses: (p.certificates || []).map((c) => c.name).filter(Boolean),
    rate: `₹${(p.rateAmount || 0).toLocaleString("en-IN")}/-`,
    rateUnit: RATE_UNIT_LABELS[p.rateType] || "per hour",
    note: p.negotiable ? "Negotiable" : "",
    about: p.about || "",
  };
};

const filterUri = Asset.fromModule(require("../../../assets/filter.svg")).uri;
const starUri = Asset.fromModule(require("../../../assets/star.svg")).uri;
const intermediateUri = Asset.fromModule(require("../../../assets/Intermediate.svg")).uri;
const jobProfileUri = Asset.fromModule(require("../../../assets/Jobprofile.svg")).uri;
const commentUri = Asset.fromModule(require("../../../assets/comment.svg")).uri;

const ROLE_OPTIONS = ["All", "Referee", "Coach", "Cameraman", "Commentator", "Scorer"];
const SPORT_OPTIONS = ["All", "Cricket", "Football", "Badminton", "Basketball"];

const SAMPLE_PROS = [
  {
    id: "1",
    name: "Rajesh Kumar",
    role: "Cricket Referee",
    rating: 4.8,
    level: "Intermediate",
    location: "Mumbai",
    sport: "Cricket",
    licenses: ["ICC Level 2 Umpire", "UEFA B License"],
    rate: "₹1,200/-",
    rateUnit: "per hour",
    note: "Weekend only",
    avatar: require("../../../assets/person.webp"),
  },
  {
    id: "2",
    name: "Rajesh Kumar",
    role: "Cricket Referee",
    rating: 4.8,
    level: "Intermediate",
    location: "Mumbai",
    sport: "Cricket",
    licenses: ["ICC Level 2 Umpire", "UEFA B License"],
    rate: "₹1,200/-",
    rateUnit: "per hour",
    note: "Weekend only",
    avatar: require("../../../assets/person.webp"),
  },
  {
    id: "3",
    name: "Rajesh Kumar",
    role: "Cricket Referee",
    rating: 4.8,
    level: "Intermediate",
    location: "Mumbai",
    sport: "Cricket",
    licenses: [],
    rate: "₹1,200/-",
    rateUnit: "per hour",
    note: "Weekend only",
    avatar: require("../../../assets/cricket-avatar.jpg"),
  },
];

const HireProfessional = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [pros, setPros] = useState([]);
  const [loadingPros, setLoadingPros] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedPro, setSelectedPro] = useState(null);
  const [hireFormOpen, setHireFormOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [selectedSports, setSelectedSports] = useState([]);

  const ROLE_VALUES = ROLE_OPTIONS.filter((r) => r !== "All");
  const SPORT_VALUES = SPORT_OPTIONS.filter((s) => s !== "All");

  const toggleSelection = (option, list, allValues, setList) => {
    if (option === "All") {
      const allSelected = allValues.every((v) => list.includes(v));
      setList(allSelected ? [] : allValues);
      return;
    }
    setList((prev) =>
      prev.includes(option) ? prev.filter((x) => x !== option) : [...prev, option]
    );
  };

  const isOptionChecked = (option, list, allValues) => {
    if (option === "All") return allValues.length > 0 && allValues.every((v) => list.includes(v));
    return list.includes(option);
  };

  const toggleRole = (role) => toggleSelection(role, selectedRoles, ROLE_VALUES, setSelectedRoles);
  const toggleSport = (sport) => toggleSelection(sport, selectedSports, SPORT_VALUES, setSelectedSports);

  const activeChips = [
    ...selectedRoles.map((label) => ({ label, type: "role" })),
    ...selectedSports.map((label) => ({ label, type: "sport" })),
  ];

  const removeChip = (chip) => {
    if (chip.type === "role") {
      setSelectedRoles((prev) => prev.filter((r) => r !== chip.label));
    } else {
      setSelectedSports((prev) => prev.filter((s) => s !== chip.label));
    }
  };

  const matchesRole = (proRole, selected) => {
    if (selected.length === 0) return true;
    return selected.some((r) => proRole.toLowerCase().includes(r.toLowerCase()));
  };

  const loadPros = useCallback(async () => {
    setLoadingPros(true);
    setLoadError(false);
    try {
      const token = await AsyncStorage.getItem("auth_token");
      const res = await axios.get(JOBS.PROFESSIONALS, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data?.success) {
        setPros((res.data.professionals || []).map(mapProfessional));
      }
    } catch (err) {
      setPros([]);
      setLoadError(true);
    } finally {
      setLoadingPros(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadPros(); }, [loadPros]));

  const filteredPros = pros.filter((pro) => {
    if (!matchesRole(pro.role, selectedRoles)) return false;
    if (selectedSports.length > 0 && !selectedSports.includes(pro.sport)) return false;
    const q = search.trim().toLowerCase();
    if (q) {
      const haystack = [pro.name, pro.role, pro.sport, pro.location].join(" ").toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  const renderCheckRow = (label, checked, onToggle) => (
    <TouchableOpacity
      key={label}
      style={styles.checkRow}
      onPress={onToggle}
      activeOpacity={0.7}
    >
      <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
        {checked && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
      </View>
      <Text style={styles.checkLabel}>{label}</Text>
    </TouchableOpacity>
  );
  const [form, setForm] = useState({
    eventName: "",
    eventDate: "",
    location: "",
    duration: "",
    offerPayment: "",
    description: "",
  });

  const openProfile = (pro) => setSelectedPro(pro);
  const closeProfile = () => setSelectedPro(null);
  const openHireForm = () => setHireFormOpen(true);
  const closeHireForm = () => setHireFormOpen(false);

  const handleSendRequest = async () => {
    if (sending) return;
    const fromUserId = user?._id || user?.id;
    if (!fromUserId || !selectedPro) {
      Alert.alert("Not signed in", "Please sign in again to send a request.");
      return;
    }
    try {
      setSending(true);
      const token = await AsyncStorage.getItem("auth_token");
      const res = await axios.post(
        JOBS.SEND_HIRE,
        {
          fromUserId,
          toProfileId: selectedPro.profileId || selectedPro.id,
          title: form.eventName,
          role: selectedPro.role,
          sport: selectedPro.sport,
          location: form.location,
          eventDate: form.eventDate,
          duration: form.duration,
          offerPayment: form.offerPayment,
          description: form.description,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data?.success) {
        setHireFormOpen(false);
        setForm({ eventName: "", eventDate: "", location: "", duration: "", offerPayment: "", description: "" });
        setSuccessOpen(true);
      } else {
        Alert.alert("Could not send", res.data?.message || "Please try again.");
      }
    } catch (err) {
      Alert.alert("Could not send", err?.response?.data?.message || err.message);
    } finally {
      setSending(false);
    }
  };

  const profileVisible = !!selectedPro && !hireFormOpen;

  const updateField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const renderProCard = (pro) => (
    <TouchableOpacity
      key={pro.id}
      style={styles.card}
      activeOpacity={0.85}
      onPress={() => openProfile(pro)}
    >
      <View style={styles.topRow}>
        <View style={styles.avatar}>
          <SvgUri uri={jobProfileUri} width={60} height={60} />
        </View>

        <View style={styles.infoCol}>
          <View style={styles.nameRow}>
            <View style={{ flex: 1, paddingRight: 6 }}>
              <Text style={styles.name}>{pro.name}</Text>
              <Text style={styles.role}>{pro.role}</Text>
              <View style={styles.ratingRow}>
                <SvgUri uri={starUri} width={12} height={12} />
                <Text style={styles.ratingText}>{pro.rating}</Text>
              </View>
            </View>
            <View style={styles.sportBadge}>
              <Text style={styles.sportBadgeText}>{pro.sport}</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <SvgUri uri={intermediateUri} width={16} height={16} color="#6F6F6F" />
          <Text style={styles.metaText}>{pro.level}</Text>
        </View>
        <View style={[styles.metaItem, { marginLeft: 24 }]}>
          <Ionicons name="location-outline" size={14} color="#4A5565" />
          <Text style={styles.metaText}>{pro.location}</Text>
        </View>
      </View>

      {pro.licenses.length > 0 && (
        <View style={styles.licenseRow}>
          {pro.licenses.map((lic, i) => (
            <View key={`${pro.id}-lic-${i}`} style={styles.licenseChip}>
              <Text style={styles.licenseText}>{lic}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.bottomRow}>
        <View style={styles.rateWrap}>
          <Text style={styles.rate}>{pro.rate} </Text>
          <Text style={styles.rateUnit}>{pro.rateUnit}</Text>
        </View>
        <Text style={styles.note}>{pro.note}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#666666" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Hire Professional</Text>
      </View>

      {/* Search + Filter */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Feather name="search" size={20} color="#666666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search Opportunities"
            placeholderTextColor="#9A9A9A"
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <TouchableOpacity
          style={styles.filterBtn}
          activeOpacity={0.8}
          onPress={() => setFilterOpen(true)}
        >
          <SvgUri
            uri={filterUri}
            width={24}
            height={24}
          />
        </TouchableOpacity>
      </View>

      {activeChips.length > 0 && (
        <View style={styles.chipsRow}>
          {activeChips.map((chip) => (
            <View key={`${chip.type}-${chip.label}`} style={styles.chip}>
              <Text style={styles.chipText}>{chip.label}</Text>
              <TouchableOpacity onPress={() => removeChip(chip)} hitSlop={8}>
                <Ionicons name="close" size={14} color="#666666" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      <ErrorBanner visible={loadError} onRetry={loadPros} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 30 }}
        showsVerticalScrollIndicator={false}
      >
        {loadingPros ? (
          <View style={styles.emptyResults}>
            <ActivityIndicator size="large" color="#15A765" />
          </View>
        ) : filteredPros.length > 0 ? (
          filteredPros.map(renderProCard)
        ) : (
          <View style={styles.emptyResults}>
            <Ionicons name="search-outline" size={40} color="#CCCCCC" />
            <Text style={styles.emptyResultsTitle}>No professionals found</Text>
            <Text style={styles.emptyResultsHint}>
              Try a different search or clear the filters
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Filter Bottom Sheet */}
      <Modal
        visible={filterOpen}
        transparent
        animationType="slide"
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={() => setFilterOpen(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setFilterOpen(false)} />

        <View style={styles.sheetAnchor} pointerEvents="box-none">
          <View style={styles.closeFabRow}>
            <TouchableOpacity
              style={styles.closeFab}
              onPress={() => setFilterOpen(false)}
              activeOpacity={0.85}
            >
              <Ionicons name="close" size={20} color="#1F1F1F" />
            </TouchableOpacity>
          </View>

          <View style={styles.filterSheet}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 8 }}
              bounces={false}
            >
              <Text style={styles.filterSheetTitle}>Filter by</Text>

              <Text style={styles.filterSheetSection}>Role</Text>
              {ROLE_OPTIONS.map((role) =>
                renderCheckRow(
                  role,
                  isOptionChecked(role, selectedRoles, ROLE_VALUES),
                  () => toggleRole(role)
                )
              )}

              <View style={styles.filterSheetDivider} />

              <Text style={styles.filterSheetSection}>Sports</Text>
              {SPORT_OPTIONS.map((sport) =>
                renderCheckRow(
                  sport,
                  isOptionChecked(sport, selectedSports, SPORT_VALUES),
                  () => toggleSport(sport)
                )
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Profile Bottom Sheet */}
      <Modal
        visible={profileVisible}
        transparent
        animationType="slide"
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={closeProfile}
      >
        <Pressable style={styles.modalBackdrop} onPress={closeProfile} />

        <View style={styles.sheetAnchor} pointerEvents="box-none">
          {/* Floating close button above the sheet */}
          <View style={styles.closeFabRow}>
            <TouchableOpacity
              style={styles.closeFab}
              onPress={closeProfile}
              activeOpacity={0.85}
            >
              <Ionicons name="close" size={20} color="#1F1F1F" />
            </TouchableOpacity>
          </View>

          <View style={styles.sheet}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 16 }}
              bounces={false}
            >
              <Text style={styles.sheetCaption}>Profile</Text>

              {/* Header */}
              <View style={styles.profileHeader}>
                <View style={styles.profileAvatar}>
                  <SvgUri uri={jobProfileUri} width={65} height={65} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.profileTopRow}>
                    <View style={{ flex: 1, paddingRight: 6 }}>
                      <Text style={styles.profileName}>{selectedPro?.name}</Text>
                      <Text style={styles.profileRole}>{selectedPro?.role}</Text>
                      <View style={styles.profileSubRow}>
                        <Text style={styles.profileJobs}>45 Job Completed</Text>
                        <View style={styles.profileRating}>
                          <SvgUri uri={starUri} width={13} height={13} />
                          <Text style={styles.profileRatingText}>{selectedPro?.rating}</Text>
                        </View>
                      </View>
                    </View>
                    <View style={[styles.sportBadge, { marginRight: 16 }]}>
                      <Text style={styles.sportBadgeText}>{selectedPro?.sport}</Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Rate */}
              <View style={styles.priceRow}>
                <Text style={styles.priceAmount}>{selectedPro?.rate}</Text>
                <Text style={styles.priceUnit}> per hour / Negotiable</Text>
              </View>

              <View style={styles.sheetDivider} />

              {/* Stat cards */}
              <View style={styles.statRow}>
                <View style={styles.statCard}>
                  <Text style={styles.statTitle}>{selectedPro?.level}</Text>
                  <Text style={styles.statSub}>Experience</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statTitle}>Pune</Text>
                  <Text style={styles.statSub}>Locations</Text>
                </View>
              </View>

              {/* Availability schedule */}
              <View style={styles.availCard}>
                <Text style={styles.availTitle}>Availability</Text>
                <View style={styles.availChipsRow}>
                  <View style={styles.dayChip}>
                    <Text style={styles.dayChipText}>Mon</Text>
                  </View>
                  <View style={styles.dayChip}>
                    <Text style={styles.dayChipText}>Fri</Text>
                  </View>
                  <View style={styles.weekendChip}>
                    <Text style={styles.weekendChipText}>Weekend Only</Text>
                  </View>
                </View>
              </View>

              {/* About */}
              <Text style={styles.sectionHeading}>About us</Text>
              <Text style={styles.aboutText}>
                Experienced cricket referee with 3+ years of professional experience. Specialized in local and state-level tournaments.
              </Text>

              {/* Certifications */}
              <Text style={styles.sectionHeading}>Certifications</Text>
              <View style={styles.certRow}>
                <View style={styles.certChip}>
                  <Text style={styles.certText}>ICC Level 2 Umpire</Text>
                </View>
                <View style={styles.certChip}>
                  <Text style={styles.certText}>UEFA B License</Text>
                </View>
              </View>

              <View style={styles.sheetDivider} />
            </ScrollView>

            {/* Action bar */}
            <View style={[styles.actionBar, { paddingBottom: insets.bottom > 0 ? insets.bottom : 12 }]}>
              <TouchableOpacity style={styles.iconBtn} activeOpacity={0.85}>
                <SvgUri
                  uri={commentUri}
                  width={20}
                  height={20}
                />
              </TouchableOpacity>
              <TouchableOpacity style={styles.hireBtn} activeOpacity={0.9} onPress={openHireForm}>
                <Text style={styles.hireBtnText}>Hire Request</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Send Hire Request Sheet */}
      <Modal
        visible={hireFormOpen}
        transparent
        animationType="slide"
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={closeHireForm}
      >
        <Pressable style={styles.modalBackdrop} onPress={closeHireForm} />

        <View style={styles.sheetAnchor} pointerEvents="box-none">
          {/* Floating close button above the sheet */}
          <View style={styles.closeFabRow}>
            <TouchableOpacity
              style={styles.closeFab}
              onPress={closeHireForm}
              activeOpacity={0.85}
            >
              <Ionicons name="close" size={20} color="#1F1F1F" />
            </TouchableOpacity>
          </View>

          <View style={styles.hireSheet}>
            <ScrollView
              style={{ flex: 1 }}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 16 }}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.hireFormTitle}>Send Hire Request</Text>

              {/* Pro Summary Card */}
              <View style={styles.proSummary}>
                <View style={styles.proSummaryAvatar}>
                  <SvgUri uri={jobProfileUri} width={48} height={48} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.proSummaryName}>{selectedPro?.name}</Text>
                  <Text style={styles.proSummaryRole}>{selectedPro?.role}</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={styles.proSummaryRate}>₹2,500</Text>
                  <Text style={styles.proSummaryUnit}>per match</Text>
                </View>
              </View>

              {/* Form Fields */}
              <Text style={styles.fieldLabel}>Event name</Text>
              <TextInput
                style={[styles.fieldInput, form.eventName ? { color: "#333333" } : null]}
                placeholder="e.g., Football Jersey, Cricket Bat"
                placeholderTextColor="#9A9A9A"
                value={form.eventName}
                onChangeText={(v) => updateField("eventName", v)}
              />

              <Text style={styles.fieldLabel}>Event Date</Text>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setShowDatePicker(true)}
                style={[styles.fieldInput, styles.fieldInputRow]}
              >
                <Text
                  style={[
                    styles.fieldInputText,
                    form.eventDate ? { color: "#333333" } : { color: "#9A9A9A" },
                  ]}
                >
                  {form.eventDate || "Select event date"}
                </Text>
                <Ionicons name="calendar-outline" size={20} color="#666666" />
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={form.eventDate ? new Date(form.eventDate) : new Date()}
                  mode="date"
                  display="default"
                  minimumDate={new Date()}
                  onChange={(event, selectedDate) => {
                    setShowDatePicker(false);
                    if (event.type === "set" && selectedDate) {
                      const yyyy = selectedDate.getFullYear();
                      const mm = String(selectedDate.getMonth() + 1).padStart(2, "0");
                      const dd = String(selectedDate.getDate()).padStart(2, "0");
                      updateField("eventDate", `${yyyy}-${mm}-${dd}`);
                    }
                  }}
                />
              )}

              <Text style={styles.fieldLabel}>Location</Text>
              <TextInput
                style={[styles.fieldInput, form.location ? { color: "#333333" } : null]}
                placeholder="e.g., Football Jersey, Cricket Bat"
                placeholderTextColor="#9A9A9A"
                value={form.location}
                onChangeText={(v) => updateField("location", v)}
              />

              <Text style={styles.fieldLabel}>Duration</Text>
              <TextInput
                style={[styles.fieldInput, form.duration ? { color: "#333333" } : null]}
                placeholder="e.g., Football Jersey, Cricket Bat"
                placeholderTextColor="#9A9A9A"
                value={form.duration}
                onChangeText={(v) => updateField("duration", v)}
              />

              <Text style={styles.fieldLabel}>Offer Payment</Text>
              <TextInput
                style={[styles.fieldInput, form.offerPayment ? { color: "#333333" } : null]}
                placeholder="e.g., Football Jersey, Cricket Bat"
                placeholderTextColor="#9A9A9A"
                value={form.offerPayment}
                onChangeText={(v) => updateField("offerPayment", v)}
              />
              <Text style={styles.fieldHint}>Suggested: ₹2,500 per match</Text>

              <Text style={styles.fieldLabel}>
                Description<Text style={styles.fieldLabelMuted}>(Optional)</Text>
              </Text>
              <TextInput
                style={[styles.fieldInput, styles.fieldTextarea, form.description ? { color: "#333333" } : null]}
                placeholder="Add details about condition & usage"
                placeholderTextColor="#9A9A9A"
                value={form.description}
                onChangeText={(v) => updateField("description", v)}
                multiline
                textAlignVertical="top"
              />

              <Text style={styles.noteText}>
                *Your request will be sent to Amit Sharma. They can accept, reject, or negotiate the terms.
              </Text>
            </ScrollView>

            <View style={styles.formDivider} />

            {/* Action bar */}
            <View style={[styles.actionBar, { paddingBottom: insets.bottom > 0 ? insets.bottom : 12 }]}>
              <TouchableOpacity style={styles.iconBtn} activeOpacity={0.85} onPress={closeHireForm}>
                <Ionicons name="close" size={22} color="#7D7380" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.hireBtn} activeOpacity={0.9} onPress={handleSendRequest}>
                <Text style={styles.hireBtnText}>Send Request</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Success Modal */}
      <Modal
        visible={successOpen}
        transparent
        animationType="fade"
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={() => setSuccessOpen(false)}
      >
        <Pressable
          style={styles.successBackdrop}
          onPress={() => setSuccessOpen(false)}
        >
          <Pressable style={styles.successCard} onPress={() => {}}>
            <View style={styles.successIconWrap}>
              <View style={styles.successIconCircle}>
                <Ionicons name="checkmark" size={42} color="#FFFFFF" />
              </View>
            </View>
            <Text style={styles.successTitle}>Request Sent!</Text>
            <Text style={styles.successMessage}>
              Your hire request has been sent to {selectedPro?.name}. They will respond within 24-48 hours.
            </Text>
            <TouchableOpacity
              style={styles.successBtn}
              activeOpacity={0.9}
              onPress={() => {
                setSuccessOpen(false);
                setSelectedPro(null);
              }}
            >
              <Text style={styles.successBtnText}>Done</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingTop: 10,
    marginBottom: 14,
  },
  backBtn: {
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontFamily: "Montserrat_500Medium",
    fontWeight: "500",
    fontSize: 16,
    lineHeight: 28,
    letterSpacing: 0,
    color: "#1F1F1F",
    marginLeft: 8,
  },
  // search
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    gap: 16,
  },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 53,
    borderWidth: 1,
    borderColor: "#EEEEFF",
    paddingHorizontal: 16,
    height: 50,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 13,
    fontFamily: "Montserrat_400Regular",
    color: "#1F1F1F",
    padding: 0,
  },
  filterBtn: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EEEEFF",
    justifyContent: "center",
    alignItems: "center",
  },
  scroll: {
    flex: 1,
  },
  // card
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EEEEFF",
    padding: 16,
    marginBottom: 14,
    minHeight: 170,
    shadowColor: "#8B96BA",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
  },
  topRow: {
    flexDirection: "row",
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 50,
    marginRight: 12,
    backgroundColor: "#F2F2F2",
    borderColor: "#EEEEFF",
    borderWidth: 1,
    opacity: 1,
    overflow: "hidden",
  },
  infoCol: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  name: {
    fontSize: 20,
    fontFamily: "Montserrat_500Medium",
    color: "#0A0A0A",
  },
  role: {
    fontSize: 14,
    fontFamily: "Montserrat_500Medium",
    color: "#453E4C",
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
    gap: 2,
  },
  ratingText: {
    fontSize: 11,
    fontFamily: "Poppins_600SemiBold",
    color: "#333333",
  },
  sportBadge: {
    backgroundColor: "#F1F0FC",
    paddingHorizontal: 11,
    borderRadius: 10,
    height: 25,
    minWidth: 61,
    justifyContent: "center",
    alignItems: "center",
  },
  sportBadgeText: {
    fontFamily: "Poppins_400regular",
    fontSize: 12,
    lineHeight: 16,
    color: "#666666",
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  metaText: {
    fontSize: 14,
    fontFamily: "Poppins_400regular",
    color: "#4A5565",
  },
  licenseRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  licenseChip: {
    backgroundColor: "#FAF5FF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  licenseText: {
    fontSize: 12,
    fontFamily: "Poppins_400regular",
    color: "#8200DB",
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  rateWrap: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  rate: {
    fontSize: 20,
    fontFamily: "Montserrat_600SemiBold",
    color: "#258C3F",
  },
  rateUnit: {
    fontSize: 16,
    fontFamily: "Montserrat_400Regular",
    color: "#453E4C",
  },
  note: {
    fontSize: 12,
    fontFamily: "Montserrat_500Medium",
    color: "#666666",
  },
  // Profile sheet
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheetAnchor: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
  },
  closeFabRow: {
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  closeFab: {
    width: 44,
    height: 44,
    borderRadius: 50,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D6D6D6",
    padding: 10,
    opacity: 1,
    justifyContent: "center",
    alignItems: "center",

  },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 16,
    maxHeight: Dimensions.get("window").height * 0.88,
  },
  hireSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 16,
    height: Dimensions.get("window").height * 0.88,
  },
  sheetCaption: {
    fontSize: 14,
    fontFamily: "Poppins_500Medium",
    color: "#333333",
    marginBottom: 8,
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  profileAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 12,
    backgroundColor: "#F2F2F2",
    overflow: "hidden",
  },
  profileTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  profileName: {
    fontSize: 20,
    fontFamily: "Montserrat_500Medium",
    color: "#333333",
  },
  profileRole: {
    fontSize: 14,
    fontFamily: "Montserrat_500Medium",
    color: "#666666",
  },
  profileSubRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  profileJobs: {
    fontSize: 12,
    fontFamily: "Montserrat_500Medium",
    color: "#453E4C",
  },
  profileRating: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  profileRatingText: {
    fontSize: 11,
    fontFamily: "Poppins_600SemiBold",
    color: "#333333",
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: 10,
  },
  priceAmount: {
    fontSize: 24,
    fontFamily: "Montserrat_600SemiBold",
    color: "#258C3F",
  },
  priceUnit: {
    fontSize: 16,
    fontFamily: "Montserrat_400Regular",
    color: "#453E4C",
  },
  sheetDivider: {
    height: 1,
    backgroundColor: "#DDDDDD",
    marginVertical: 12,
  },
  statRow: {
    flexDirection: "row",
    gap: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  statTitle: {
    fontSize: 14,
    fontFamily: "Montserrat_600SemiBold",
    color: "#101828",
  },
  statSub: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    color: "#6A7282",
  },
  availCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 12,
  },
  availTitle: {
    fontSize: 16,
    fontFamily: "Montserrat_600SemiBold",
    color: "#101828",
    marginBottom: 2,
  },
  availChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  dayChip: {
    backgroundColor: "#15A7651A",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  dayChipText: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    color: "#15A765",
    textAlign: "center",
  },
  weekendChip: {
    backgroundColor: "#15A7651A",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  weekendChipText: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    color: "#15A765",
  },
  sectionHeading: {
    fontSize: 16,
    fontFamily: "Montserrat_600SemiBold",
    color: "#101828",
    marginTop: 12,
    marginBottom: 0,
  },
  aboutText: {
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
    color: "#364153",
    lineHeight: 20,
  },
  certRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  certChip: {
    backgroundColor: "#FAF5FF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  certText: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    color: "#8200DB",
    marginBottom: 2,
  },
  actionBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 2,
    gap: 16,
  },
  iconBtn: {
    width: 50,
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#666666",
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  hireBtn: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    backgroundColor: "#15A765",
    justifyContent: "center",
    alignItems: "center",
  },
  hireBtnText: {
    fontSize: 16,
    fontFamily: "Montserrat_500Medium",
    color: "#FFFFFF",
  },
  // Hire Form sheet
  hireFormTitle: {
    fontSize: 16,
    fontFamily: "Poppins_500Medium",
    color: "#333333",
    marginBottom: 8,
  },
  proSummary: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  proSummaryAvatar: {
    width: 50,
    height: 50,
    borderRadius: 50,
    marginRight: 12,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
    borderColor: "#EEEEFF",
    borderWidth: 1,
  },
  proSummaryName: {
    fontSize: 16,
    fontFamily: "Montserrat_600SemiBold",
    color: "#0A0A0A",
  },
  proSummaryRole: {
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
    color: "#4A5565",
  },
  proSummaryRate: {
    fontSize: 16,
    fontFamily: "Montserrat_600SemiBold",
    color: "#00A63E",
  },
  proSummaryUnit: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    color: "#6A7282",

  },
  fieldLabel: {
    fontSize: 16,
    fontFamily: "Montserrat_500Medium",
    color: "#1A181B",
    marginBottom: 6,
  },
  fieldLabelMuted: {
    fontSize: 16,
    fontFamily: "Montserrat_500Medium",
    color: "#666666",
  },
  fieldInput: {
    backgroundColor: "#F2F2F2",
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 48,
    borderColor: "#F6F6F6",
    borderWidth: 1,
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
    color: "#8D848F",
    marginBottom: 16
  },
  fieldInputRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  fieldInputText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
  },
  fieldTextarea: {
    borderRadius: 16,
    height: 90,
    paddingTop: 16,
    paddingBottom: 16,
  },
  fieldHint: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    color: "#666666",
    marginTop: -12,
    paddingBottom: 10,
  },
  noteText: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    color: "#1E88F5",
    lineHeight: 18,
    marginTop: -10,
  },
  formDivider: {
    height: 1,
    backgroundColor: "#DDDDDD",
    marginTop: 0,
    marginBottom: 10,
  },
  // Filter chips
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 4,
    paddingRight: 8,
    paddingBottom: 4,
    paddingLeft: 12,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: "#15A765",
    backgroundColor: "rgba(21, 167, 101, 0.10)",
    gap: 4,
    height: 24,
    minWidth: 86,
    justifyContent: "center",
  },
  chipText: {
    fontFamily: "Poppins_400regular",
    fontSize: 12,
    lineHeight: 16,
    color: "#15A765",
  },
  emptyResults: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyResultsTitle: {
    fontSize: 14,
    fontFamily: "Montserrat_700Bold",
    color: "#6F6F6F",
    marginTop: 12,
  },
  emptyResultsHint: {
    fontSize: 12,
    fontFamily: "Montserrat_400Regular",
    color: "#9A9A9A",
    marginTop: 4,
  },
  // Filter sheet
  filterSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    maxHeight: Dimensions.get("window").height * 0.78,
  },
  filterSheetTitle: {
    fontSize: 14,
    fontFamily: "Poppins_500Medium",
    color: "#333333",
    marginBottom: 8,
  },
  filterSheetSection: {
    fontSize: 16,
    fontFamily: "Montserrat_600SemiBold",
    color: "#666666",
    marginBottom: 8,
  },
  filterSheetDivider: {
    height: 1,
    backgroundColor: "#DDDDDD",
    marginVertical: 16,
  },
  checkRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: "#D9D9D9",
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  checkboxChecked: {
    backgroundColor: "#15A765",
    borderColor: "#15A765",
  },
  checkLabel: {
    fontSize: 16,
    fontFamily: "Montserrat_500Medium",
    color: "#333333",
  },
  // Success modal
  successBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  successCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 28,
    alignItems: "center",
    width: "100%",
  },
  successIconWrap: {
    marginBottom: 20,
  },
  successIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#15A765",
    justifyContent: "center",
    alignItems: "center",
  },
  successTitle: {
    fontSize: 20,
    fontFamily: "Montserrat_700Bold",
    color: "#0A0A0A",
    marginBottom: 10,
    textAlign: "center",
  },
  successMessage: {
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
    color: "#666666",
    textAlign: "center",
    lineHeight: 21,
    marginBottom: 24,
  },
  successBtn: {
    width: "100%",
    height: 52,
    borderRadius: 12,
    backgroundColor: "#15A765",
    justifyContent: "center",
    alignItems: "center",
  },
  successBtnText: {
    fontSize: 16,
    fontFamily: "Montserrat_600SemiBold",
    color: "#FFFFFF",
  },
});

export default HireProfessional;
