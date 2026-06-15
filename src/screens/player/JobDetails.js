import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  StatusBar,
  Modal,
  Pressable,
  TextInput,
  Dimensions,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SvgUri } from "react-native-svg";
import { Asset } from "expo-asset";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "../../context/AuthContext";
import JOBS from "../../api/jobs";

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

const starUri = Asset.fromModule(require("../../../assets/star.svg")).uri;
const bookmarkUri = Asset.fromModule(require("../../../assets/bookmark .svg")).uri;
const bookmarkFilledUri = Asset.fromModule(require("../../../assets/bookmark_filled.svg")).uri;
const refereeUri = Asset.fromModule(require("../../../assets/Referee.svg")).uri;
const calender1Uri = Asset.fromModule(require("../../../assets/calender1.svg")).uri;

const SCHEDULE = [
  { id: "1", title: "Semi-Final 1", date: "Friday, 15 May", time: "9:00 AM - 1:00 PM" },
  { id: "2", title: "Semi-Final 2", date: "Friday, 16 May", time: "9:00 AM - 1:00 PM" },
  { id: "3", title: "Semi-Final 3", date: "Friday, 17 May", time: "9:00 AM - 1:00 PM" },
];

const REQUIREMENTS = [
  "Minimum 2 years of cricket refereeing experience",
  "Knowledge of ICC cricket rules and regulations.",
  "Ability to handle pressure situations.",
  "Good physical fitness.",
  "Certification from recognized cricket association (preferred).",
];

const BENEFITS = [
  "Certificate of participation.",
  "Networking opportunities with professional cricket organizers.",
  "Meals and refreshments provided.",
  "Free tournament merchandise.",
];

const PROFILES = [
  { id: "p1", title: "Cricket Referee", sport: "Cricket", level: "Intermediate", rating: 4.8 },
  { id: "p2", title: "Cricket Referee", sport: "Cricket", level: "Intermediate", rating: 4.8 },
  { id: "p3", title: "Football Commentator", sport: "Football", level: "Professional", rating: 4.9 },
];

const COVER_MAX = 500;

const STATUS_BANNERS = {
  Shortlist: {
    bg: "#DBEAFE",
    title: "Shortlisted",
    message: "Great news! You've been shortlisted. The organizer may contact you soon.",
  },
  Pending: {
    bg: "#FFF4D1",
    title: "Pending Review",
    message: "Your application is under review. We'll notify you when there's an update.",
  },
  Accepted: {
    bg: "#D7F4E1",
    title: "Accepted",
    message: "Congratulations! Your application has been accepted by the organizer.",
  },
  Rejected: {
    bg: "#FFE2E2",
    title: "Rejected",
    message: "Unfortunately, your application was not selected this time.",
  },
  Confirmed: {
    bg: "#DBEAFE",
    title: "Confirmed",
    message: "Your booking is confirmed. Get ready for the match!",
  },
  "In Progress": {
    bg: "#FFEFD5",
    title: "In Progress",
    message: "This job is currently in progress. Good luck out there!",
  },
  Upcoming: {
    bg: "#D7F4E1",
    title: "Upcoming",
    // {timeLabel} placeholder is replaced at render time with the route param
    message: "Your match is coming up – {timeLabel}. Be prepared and arrive on time.",
  },
  Completed: {
    bg: "#D7F4E1",
    title: "Completed",
    message: "This job has been completed. Thanks for the great work!",
  },
};

const JobDetails = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [bookmarked, setBookmarked] = useState(false);

  const jobId = route.params?.jobId;
  const routeStatus = route.params?.status;
  const timeLabel = route.params?.timeLabel;
  const [job, setJob] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const jobTitleParam = job?.title || route.params?.title || "Referee Needed";
  const jobSubtitleParam = job?.venue || route.params?.subtitle || "Ionix Sports Club";
  const jobOrgParam = route.params?.org;
  const jobRateParam = route.params?.rate;
  const [appliedStatus, setAppliedStatus] = useState(routeStatus || null);
  const status = appliedStatus;
  const rawBanner = status ? STATUS_BANNERS[status] : null;
  const banner = rawBanner
    ? { ...rawBanner, message: rawBanner.message.replace("{timeLabel}", timeLabel || "soon") }
    : null;
  const alreadyApplied = !!status;
  const [applyOpen, setApplyOpen] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState(null);
  const [cover, setCover] = useState("");
  const [successOpen, setSuccessOpen] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        try {
          const token = await AsyncStorage.getItem("auth_token");
          const headers = { Authorization: `Bearer ${token}` };
          const reqs = [];
          if (jobId) reqs.push(axios.get(JOBS.POSTING_BY_ID(jobId), { headers }));
          else reqs.push(Promise.resolve(null));
          const userId = user?._id || user?.id;
          if (userId) reqs.push(axios.get(JOBS.MY_PROFILES(userId), { headers }));
          else reqs.push(Promise.resolve(null));

          const [jobRes, profRes] = await Promise.all(reqs);
          if (!active) return;
          if (jobRes?.data?.success) setJob(jobRes.data.job);
          if (profRes?.data?.success) {
            const list = profRes.data.profiles || [];
            setProfiles(list);
            if (list.length && !selectedProfileId) setSelectedProfileId(String(list[0]._id));
          }
        } catch (e) {
          /* keep fallback defaults */
        }
      })();
      return () => {
        active = false;
      };
    }, [jobId, user])
  );

  const openApply = () => setApplyOpen(true);
  const closeApply = () => setApplyOpen(false);

  const handleSubmit = async () => {
    if (submitting) return;
    const userId = user?._id || user?.id;
    if (!userId) {
      Alert.alert("Not signed in", "Please sign in again to apply.");
      return;
    }
    if (!jobId) {
      Alert.alert("Unavailable", "This job can't be applied to right now.");
      return;
    }
    try {
      setSubmitting(true);
      const token = await AsyncStorage.getItem("auth_token");
      const res = await axios.post(
        JOBS.APPLY,
        {
          jobId,
          applicantId: userId,
          professionalProfileId: selectedProfileId,
          coverMessage: cover,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data?.success) {
        setApplyOpen(false);
        setCover("");
        setSuccessOpen(true);
      } else {
        Alert.alert("Could not apply", res.data?.message || "Please try again.");
      }
    } catch (err) {
      Alert.alert("Could not apply", err?.response?.data?.message || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const closeSuccess = () => {
    setSuccessOpen(false);
    setAppliedStatus("Pending");
  };

  const scheduleList = job?.schedule?.length ? job.schedule : SCHEDULE;
  const requirementList = job?.requirements?.length ? job.requirements : REQUIREMENTS;
  const benefitList = job?.benefits?.length ? job.benefits : BENEFITS;
  const org = job?.organizer || {};
  const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

  // My professional profiles shown in the "Select professional Profile" list
  const myProfileCards = profiles.map((p) => ({
    id: String(p._id),
    title: ROLE_LABELS[p.role] || p.role,
    sport: (p.sports && p.sports[0]) || "",
    level: p.tier || "Professional",
    rating: p.rating || 0,
  }));

  const renderBullet = (text, key) => (
    <View key={key} style={styles.bulletRow}>
      <Text style={styles.bulletDot}>•</Text>
      <Text style={styles.bulletText}>{text}</Text>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#666666" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Job Details</Text>
        <TouchableOpacity
          onPress={() => setBookmarked((p) => !p)}
          style={styles.bookmarkBtn}
        >
          <SvgUri
            uri={bookmarked ? bookmarkFilledUri : bookmarkUri}
            width={20}
            height={20}
            color="#666666"
          />
        </TouchableOpacity>
      </View>
      <View style={styles.headerBorder} />

      {/* Status banner shown when viewing an existing application */}
      {banner && (
        <View
          style={[
            styles.statusBanner,
            { backgroundColor: banner.bg },
            status === "Shortlist" && { paddingVertical: 12, paddingHorizontal: 16 },
          ]}
        >
          <Text
            style={[
              styles.statusBannerTitle,
              status === "Shortlist" && {
                fontFamily: "Montserrat_600SemiBold",
                fontSize: 18,
                lineHeight: 28,
                letterSpacing: -0.44,
                color: "#0A0A0A",
                marginBottom: 1,
              },
            ]}
          >
            {banner.title}
          </Text>
          <Text
            style={[
              styles.statusBannerMessage,
              status === "Shortlist" && {
                fontFamily: "Poppins_400Regular",
                fontSize: 14,
                lineHeight: 20,
                letterSpacing: -0.15,
                color: "#0A0A0A",
                textAlign: "center",
              },
            ]}
          >
            {banner.message}
          </Text>
        </View>
      )}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: alreadyApplied ? 30 : 110 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Job Header */}
        <View style={styles.jobHeaderRow}>
          <View style={styles.logoWrap}>
            <SvgUri
              uri={refereeUri}
              width={60}
              height={60}
            />
          </View>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap" }}>
              <Text style={styles.jobTitle}>{jobTitleParam}</Text>
              <View style={[styles.sportBadge, { marginLeft: 50, marginRight: 0 }]}>
                <Text style={styles.sportBadgeText}>{job?.sport || "Cricket"}</Text>
              </View>
            </View>
            <Text style={styles.jobSubtitle}>{jobSubtitleParam}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.managerName}>{job?.managerName || "Sagar Talekar (Manager)"}</Text>
          <Text style={styles.addressText}>
            {job?.address ||
              "H.A. School, PBA SPORTS, near PBA SPORTS Welfare Centre, Hindustan Antibiotics Colony, Pimpri Colony, Pune, Pimpri-Chinchwad, Maharashtra 411018"}
          </Text>
        </View>

        {/* Earnings Card */}
        <View style={styles.earningCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.earningRate}>
              {inr(job?.ratePerMatch || 2500)} per match
            </Text>
            <Text style={styles.earningMatches}>{job?.matches || 3} matches</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={styles.estimatedLabel}>Estimated Earnings</Text>
            <Text style={styles.estimatedAmount}>{inr(job?.estimatedEarnings || 7500)}</Text>
          </View>
        </View>

        {/* Job Description */}
        <Text style={styles.sectionHeading}>Job Description</Text>
        <Text style={styles.bodyText}>
          {job?.description ||
            "You'll officiate matches fairly, enforce the rules of play, manage on-field decisions and keep the game flowing for everyone involved."}
        </Text>

        {/* About this Job */}
        <Text style={styles.sectionHeading}>About this Job</Text>
        <Text style={styles.bodyText}>
          {job?.about ||
            "The organizer is hiring an experienced professional to support its upcoming fixtures."}
        </Text>

        {/* Match Schedule */}
        <Text style={styles.sectionHeading}>Match Schedule</Text>
        {scheduleList.map((m, index) => (
          <View key={m.id || index} style={[styles.scheduleCard, index === 0 && { marginTop: 0 }]}>
            <View style={styles.calIconWrap}>
              <SvgUri
                uri={calender1Uri}
                width={24}
                height={24}
                color="#3B82F6"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.scheduleTitle}>{m.title}</Text>
              <Text style={styles.scheduleDate}>{m.date}</Text>
            </View>
            <View style={styles.timeRow}>
              <Ionicons name="time-outline" size={14} color="#6F6F6F" />
              <Text style={styles.timeText}>{m.time}</Text>
            </View>
          </View>
        ))}

        {/* Requirements */}
        <Text style={styles.sectionHeading}>Requirements</Text>
        <View style={styles.bulletList}>
          {requirementList.map((r, i) => renderBullet(r, `req-${i}`))}
        </View>

        {/* Benefits & Perks */}
        <Text style={styles.sectionHeading}>Benefits & Perks</Text>
        <View style={styles.bulletList}>
          {benefitList.map((b, i) => renderBullet(b, `ben-${i}`))}
        </View>

        {/* Organizer */}
        <View style={styles.orgRow}>
          <View style={styles.orgAvatar}>
            <Text style={styles.orgAvatarText}>
              {(org.name || "Mumbai Premier League")
                .split(" ")
                .map((w) => w[0])
                .join("")
                .slice(0, 3)
                .toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.orgName}>{org.name || "Mumbai Premier League"}</Text>
            <Text style={styles.orgDesc}>
              {org.description ||
                "Professional cricket tournament organizer with 5+ years experience"}
            </Text>
          </View>
        </View>

        <View style={styles.orgStatsRow}>
          <View style={styles.orgStat}>
            <SvgUri uri={starUri} width={14} height={14} />
            <Text style={styles.orgStatBold}> {org.rating || 4.8}</Text>
          </View>
          <View style={styles.orgStat}>
            <Text style={styles.orgStatBold}>{org.events || 24} </Text>
            <Text style={styles.orgStatLight}>Events</Text>
          </View>
          <View style={styles.orgStat}>
            <Text style={styles.orgStatBold}>{org.successRate || 98}% </Text>
            <Text style={styles.orgStatLight}>Success Rate</Text>
          </View>
        </View>
      </ScrollView>

      {/* Sticky Apply Button (hidden when already applied) */}
      {!alreadyApplied && (
        <View
          style={[
            styles.applyBar,
            { paddingBottom: insets.bottom > 0 ? insets.bottom : 12 },
          ]}
        >
          <TouchableOpacity style={styles.applyBtn} activeOpacity={0.9} onPress={openApply}>
            <Text style={styles.applyBtnText}>Apply for this Job</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Apply for Job Bottom Sheet */}
      <Modal
        visible={applyOpen}
        transparent
        animationType="slide"
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={closeApply}
      >
        <Pressable style={styles.modalBackdrop} onPress={closeApply} />

        <View style={styles.sheetAnchor} pointerEvents="box-none">
          {/* Floating close button */}
          <View style={styles.closeFabRow}>
            <TouchableOpacity style={styles.closeFab} onPress={closeApply} activeOpacity={0.85}>
              <Ionicons name="close" size={20} color="#1F1F1F" />
            </TouchableOpacity>
          </View>

          <View style={styles.applySheet}>
            <ScrollView
              style={{ flex: 1 }}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 16 }}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.applyTitle}>Apply for Job</Text>
              <View style={styles.applyDivider} />

              {/* Job summary */}
              <View style={styles.applyJobRow}>
                <View style={styles.applyLogoWrap}>
                  <SvgUri
                    uri={refereeUri}
                    width={60}
                    height={60}
                  />
                </View>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={styles.applyJobTitle}>{jobTitleParam}</Text>
                  <Text style={styles.applyJobSubtitle}>{jobSubtitleParam}</Text>
                </View>
                <Text style={styles.applyJobRate}>{jobRateParam || "₹7,500 /-"}</Text>
              </View>

              <Text style={styles.applySectionHeading}>Select professional Profile</Text>

              {myProfileCards.length === 0 && (
                <Text style={styles.bodyTextPlain}>
                  You have no professional profiles yet. You can still apply, or create one from
                  Browse Jobs → Application → My Profile.
                </Text>
              )}

              {myProfileCards.map((p) => {
                const selected = selectedProfileId === p.id;
                return (
                  <TouchableOpacity
                    key={p.id}
                    style={[styles.profileCard, selected && styles.profileCardSelected]}
                    activeOpacity={0.85}
                    onPress={() => setSelectedProfileId(p.id)}
                  >
                    <View
                      style={[
                        styles.profileIconWrap,
                        selected ? styles.profileIconWrapSelected : null,
                      ]}
                    >
                      <SvgUri
                        uri={calender1Uri}
                        width={24}
                        height={24}
                        color={selected ? "#15A765" : "#3B82F6"}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.profileTitle}>{p.title}</Text>
                      <View style={styles.profileMetaRow}>
                        <Text style={styles.profileMetaText}>{p.sport}</Text>
                        <Text style={styles.profileMetaDot}>•</Text>
                        <Text style={styles.profileMetaText}>{p.level}</Text>
                      </View>
                    </View>
                    <View style={styles.profileRating}>
                      <SvgUri uri={starUri} width={16} height={16} />
                      <Text style={styles.profileRatingText}>{p.rating}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}

              <Text style={[styles.applySectionHeading, { marginTop: 14 }]}>
                Cover Message<Text style={styles.applySectionMuted}>(Optional)</Text>
              </Text>
              <TextInput
                style={[styles.coverInput, cover ? { color: "#333333" } : null]}
                placeholder={"Introduce yourself and explain why you're a good fit for this job..."}
                placeholderTextColor="#9A9A9A"
                value={cover}
                onChangeText={(v) => setCover(v.slice(0, COVER_MAX))}
                multiline
                textAlignVertical="top"
              />
              <Text style={styles.charCounter}>{cover.length}/{COVER_MAX} characters</Text>

              <Text style={styles.noteText}>
                *Your application will be sent to Mumbai Premier League. They typically respond within 24-48 hours.
              </Text>
            </ScrollView>

            <View style={styles.applyDivider} />

            {/* Action bar */}
            <View style={[styles.actionBar, { paddingBottom: insets.bottom > 0 ? insets.bottom : 12 }]}>
              <TouchableOpacity style={styles.iconBtn} activeOpacity={0.85} onPress={closeApply}>
                <Ionicons name="close" size={22} color="#7D7380" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
                activeOpacity={0.9}
                onPress={handleSubmit}
                disabled={submitting}
              >
                <Text style={styles.submitBtnText}>
                  {submitting ? "Submitting..." : "Submit Application"}
                </Text>
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
        onRequestClose={closeSuccess}
      >
        <Pressable style={styles.successBackdrop} onPress={closeSuccess}>
          <Pressable style={styles.successCard} onPress={() => { }}>
            <View style={styles.successIconWrap}>
              <View style={styles.successIconCircle}>
                <Ionicons name="checkmark" size={42} color="#FFFFFF" />
              </View>
            </View>
            <Text style={styles.successTitle}>Application Submitted!</Text>
            <Text style={styles.successMessage}>
              Your application has been sent to Mumbai Premier League. You'll hear back within 24-48 hours.
            </Text>
            <TouchableOpacity style={styles.successBtn} activeOpacity={0.9} onPress={closeSuccess}>
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
  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  backBtn: {
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    flex: 1,
    fontFamily: "Montserrat_500Medium",
    fontWeight: "500",
    fontSize: 16,
    lineHeight: 28,
    letterSpacing: 0,
    color: "#1F1F1F",
    marginLeft: 8,
  },
  bookmarkBtn: {
    width: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  headerBorder: {
    height: 1,
    backgroundColor: "#DDDDDD",
  },
  // Status banner
  statusBanner: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  statusBannerTitle: {
    fontSize: 16,
    fontFamily: "Montserrat_700Bold",
    color: "#1F1F1F",
    marginBottom: 4,
  },
  statusBannerMessage: {
    fontSize: 12,
    fontFamily: "Montserrat_400Regular",
    color: "#1F1F1F",
    textAlign: "center",
    lineHeight: 17,
  },
  scroll: {
    flex: 1,
  },
  // Job header row
  jobHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  logoWrap: {
    width: 60,
    height: 60,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#F5F5F5",
    marginRight: 12,
    borderColor: "#EEEEFF",
    borderWidth: 1,
  },
  logo: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  jobTitle: {
    fontSize: 20,
    fontFamily: "Montserrat_500Medium",
    color: "#0A0A0A",
  },
  jobSubtitle: {
    fontSize: 14,
    fontFamily: "Montserrat_500Medium",
    color: "#453E4C",
  },
  sportBadge: {
    backgroundColor: "#F1F0FC",
    paddingHorizontal: 11,
    borderRadius: 10,
    height: 25,
    minWidth: 61,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  sportBadgeText: {
    fontFamily: "Poppins_400regular",
    fontSize: 12,
    lineHeight: 16,
    color: "#666666",
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  // Manager + address
  section: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  managerName: {
    fontSize: 16,
    fontFamily: "Montserrat_500Medium",
    color: "#0A0A0A",
    marginBottom: 4,
  },
  addressText: {
    fontSize: 12,
    fontFamily: "Montserrat_500Medium",
    color: "#453E4C",
    lineHeight: 19,
  },
  // Earnings Card
  earningCard: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 11,
    backgroundColor: "#F0FDF4",
    borderRadius: 10,
    padding: 13,
    borderColor: "#B9F8CF",
    borderWidth: 1,
  },
  earningRate: {
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
    color: "#008236",
  },
  earningMatches: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    color: "#008236",
  },
  estimatedLabel: {
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
    color: "#008236",
  },
  estimatedAmount: {
    fontSize: 24,
    fontFamily: "Poppins_700Bold",
    color: "#00A63E",
    marginTop: 2,
  },
  // Sections
  sectionHeading: {
    fontSize: 16,
    fontFamily: "Montserrat_600SemiBold",
    color: "#333333",
    marginTop: 24,
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  bodyText: {
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
    color: "#666666",
    lineHeight: 22,
    paddingHorizontal: 16,
  },
  // Schedule
  scheduleCard: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 10,
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 10,
  },
  calIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: "#DBEAFE",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  scheduleTitle: {
    fontSize: 14,
    fontFamily: "Montserrat_600SemiBold",
    color: "#333333",
  },
  scheduleDate: {
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
    color: "#666666",
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 16,
  },
  timeText: {
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
    color: "#333333",

  },
  // Bullets
  bulletList: {
    paddingHorizontal: 16,
  },
  bulletRow: {
    flexDirection: "row",
    paddingVertical: 3,
  },
  bulletDot: {
    fontSize: 14,
    color: "#666666",
    marginRight: 8,
    lineHeight: 20,
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
    color: "#666666",
    lineHeight: 20,
  },
  // Organizer
  orgRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    marginTop: 22,
  },
  orgAvatar: {
    width: 48,
    height: 48,
    borderRadius: 25,
    backgroundColor: "#2B7FFF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    marginBottom: 12,
  },
  orgAvatarText: {
    fontSize: 16,
    fontFamily: "Poppins_700Bold",
    color: "#FFFFFF",
  },
  orgName: {
    fontSize: 16,
    fontFamily: "Montserrat_600SemiBold",
    color: "#0A0A0A",
  },
  orgDesc: {
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
    color: "#4A5565",
    marginTop: 4,
    lineHeight: 17,
  },
  orgStatsRow: {
    flexDirection: "row",
    paddingHorizontal: 75,
    marginTop: 8,
    gap: 20,
    alignItems: "flex-end",
  },
  orgStat: {
    flexDirection: "row",
    alignItems: "center",
  },
  orgStatBold: {
    fontSize: 14,
    fontFamily: "Poppins_600SemiBold",
    color: "#101828",
  },
  orgStatLight: {
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
    color: "#6A7282",
  },
  // Apply bar
  applyBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#F1F2F3",
    borderTopWidth: 1,
    borderTopColor: "#EFEFEF",
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  applyBtn: {
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: "#15A765",
    justifyContent: "center",
    alignItems: "center",
  },
  applyBtnText: {
    fontSize: 16,
    fontFamily: "Montserrat_500Medium",
    color: "#FFFFFF",
  },
  // Apply for Job Sheet
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
  applySheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 16,
    height: Dimensions.get("window").height * 0.86,
  },
  applyTitle: {
    fontSize: 16,
    fontFamily: "Montserrat_600SemiBold",
    color: "#333333",
    marginBottom: 10,
  },
  applyDivider: {
    height: 1,
    backgroundColor: "#D6D6D6",
  },
  applyJobRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 12,
  },
  applyLogoWrap: {
    width: 60,
    height: 60,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#F5F5F5",
    marginRight: 12,
  },
  applyLogo: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  applyJobTitle: {
    fontSize: 20,
    fontFamily: "Montserrat_500Medium",
    color: "#0A0A0A",
  },
  applyJobSubtitle: {
    fontSize: 14,
    fontFamily: "Montserrat_500Medium",
    color: "#453E4C",
  },
  applyJobRate: {
    fontSize: 15,
    fontFamily: "Montserrat_700Bold",
    color: "#15A765",
  },
  applySectionHeading: {
    fontSize: 16,
    fontFamily: "Montserrat_600SemiBold",
    color: "#333333",
    marginTop: 24,
    marginBottom: 8,
  },
  applySectionMuted: {
    fontSize: 16,
    fontFamily: "Montserrat_500Medium",
    color: "#666666",
  },
  bodyTextPlain: {
    fontSize: 13,
    fontFamily: "Poppins_400Regular",
    color: "#666666",
    lineHeight: 19,
    marginBottom: 6,
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: "#F9FAFB",
  },
  profileCardSelected: {
    backgroundColor: "#E6F7EC",
    borderColor: "#15A765",
  },
  profileIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: "#E0EBFF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  profileIconWrapSelected: {
    backgroundColor: "#FFFFFF",
  },
  profileTitle: {
    fontSize: 14,
    fontFamily: "Montserrat_600SemiBold",
    color: "#333333",
  },
  profileMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  profileMetaText: {
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
    color: "#666666",
  },
  profileMetaDot: {
    fontSize: 12,
    color: "#1F1F1F",
  },
  profileRating: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 20,
  },
  profileRatingText: {
    fontSize: 12,
    fontFamily: "Poppins_600SemiBold",
    color: "#333333",
  },
  coverInput: {
    backgroundColor: "#EFF0F2",
    borderRadius: 16,
    paddingHorizontal: 16,
    minHeight: 110,
    fontSize: 16,
    fontFamily: "Poppins_400Regular",
    color: "#8D848F",
  },
  charCounter: {
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
    color: "#6A7282",
    marginTop: 4,
  },
  noteText: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    color: "#0088FF",
    lineHeight: 18,
    marginTop: 10,
  },
  actionBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 20,
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
  submitBtn: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    backgroundColor: "#15A765",
    justifyContent: "center",
    alignItems: "center",
  },
  submitBtnText: {
    fontSize: 16,
    fontFamily: "Montserrat_500Medium",
    color: "#FFFFFF",
  },
  // Success Modal
  successBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  successCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingTop: 28,
    paddingHorizontal: 24,
    paddingBottom: 22,
    alignItems: "center",
  },
  successIconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#E6F7EC",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  successIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#15A765",
    justifyContent: "center",
    alignItems: "center",
  },
  successTitle: {
    fontSize: 18,
    fontFamily: "Montserrat_700Bold",
    color: "#1F1F1F",
    marginBottom: 8,
    textAlign: "center",
  },
  successMessage: {
    fontSize: 13,
    fontFamily: "Montserrat_400Regular",
    color: "#6F6F6F",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  successBtn: {
    alignSelf: "stretch",
    height: 48,
    borderRadius: 12,
    backgroundColor: "#15A765",
    justifyContent: "center",
    alignItems: "center",
  },
  successBtnText: {
    fontSize: 15,
    fontFamily: "Montserrat_700Bold",
    color: "#FFFFFF",
  },
});

export default JobDetails;
