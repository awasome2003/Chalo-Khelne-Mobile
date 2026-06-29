import React, { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  StatusBar,
  Dimensions,
  Modal,
  Pressable,
  Animated,
  PanResponder,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons, Feather } from "@expo/vector-icons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
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

const refereeUri = Asset.fromModule(require("../../../assets/Referee.svg")).uri;
const filterUri = Asset.fromModule(require("../../../assets/filter.svg")).uri;
const calenderUri = Asset.fromModule(require("../../../assets/calender.svg")).uri;
const envelopeUri = Asset.fromModule(require("../../../assets/envelope.svg")).uri;
const starUri = Asset.fromModule(require("../../../assets/star.svg")).uri;

const { width } = Dimensions.get("window");

const SAMPLE_JOBS = [
  {
    id: "1",
    title: "Referee Needed",
    role: "Referee",
    venue: "Andheri Sports Complex",
    manager: "Amit Sharma (Manager)",
    location: "Baner, Pune",
    sport: "Cricket",
    date: "14 Oct 2026",
    applicants: 8,
    rate: "₹799/-",
    rateUnit: "per hour",
  },
  {
    id: "2",
    title: "Coach Needed",
    role: "Coach",
    venue: "Powai Sports Arena",
    manager: "Vikram Patel (Manager)",
    location: "Powai, Mumbai",
    sport: "Football",
    date: "18 Oct 2026",
    applicants: 5,
    rate: "₹1,200/-",
    rateUnit: "per hour",
  },
  {
    id: "3",
    title: "Cameraman Needed",
    role: "Cameraman",
    venue: "DY Patil Stadium",
    manager: "Neha Iyer (Manager)",
    location: "Navi Mumbai",
    sport: "Cricket",
    date: "22 Oct 2026",
    applicants: 12,
    rate: "₹999/-",
    rateUnit: "per hour",
  },
  {
    id: "4",
    title: "Commentator Needed",
    role: "Commentator",
    venue: "Pune Badminton Hall",
    manager: "Rohan Joshi (Manager)",
    location: "Kothrud, Pune",
    sport: "Badminton",
    date: "25 Oct 2026",
    applicants: 3,
    rate: "₹1,500/-",
    rateUnit: "per hour",
  },
  {
    id: "5",
    title: "Scorer Needed",
    role: "Scorer",
    venue: "NCA Ground",
    manager: "Priya Singh (Manager)",
    location: "Bandra, Mumbai",
    sport: "Cricket",
    date: "28 Oct 2026",
    applicants: 7,
    rate: "₹699/-",
    rateUnit: "per hour",
  },
];

const ROLE_OPTIONS = ["All", "Referee", "Coach", "Cameraman", "Commentator", "Scorer"];
const SPORT_OPTIONS = ["All", "Cricket", "Football", "Badminton", "Basketball"];

const APPLICATIONS = [
  {
    id: "a1",
    title: "Referee Needed",
    venue: "Andheri Sports Complex",
    appliedOn: "5 May",
    rate: "₹799/-",
    rateUnit: "per hour",
    status: "Shortlist",
  },
  {
    id: "a2",
    title: "Referee Needed",
    venue: "Andheri Sports Complex",
    appliedOn: "5 May",
    rate: "₹799/-",
    rateUnit: "per hour",
    status: "Pending",
  },
  {
    id: "a3",
    title: "Referee Needed",
    venue: "Andheri Sports Complex",
    appliedOn: "5 May",
    rate: "₹799/-",
    rateUnit: "per hour",
    status: "Accepted",
  },
  {
    id: "a4",
    title: "Referee Needed",
    venue: "Andheri Sports Complex",
    appliedOn: "5 May",
    rate: "₹799/-",
    rateUnit: "per hour",
    status: "Rejected",
  },
];

const STATUS_STYLES = {
  Shortlist: { bg: "#E0EBFF", text: "#2563EB" },
  Pending: { bg: "#FFF4D1", text: "#C68B00" },
  Accepted: { bg: "#D7F4E1", text: "#1A8E4A" },
  Rejected: { bg: "#FFE2E2", text: "#D7263D" },
};

const SUB_TABS = [
  { key: "applications", label: "Applications", icon: "document-text-outline" },
  { key: "requests", label: "Requests", icon: "mail-outline", dot: true },
  { key: "myProfile", label: "My Profile", icon: "person-outline" },
];

const PROFILE_STATS = [
  { key: "earnings", label: "Total Earnings", value: "₹1,25,000", sub: "All Time", valueColor: "#258C3F" },
  { key: "month", label: "This Month", value: "₹1,25,000", sub: "↑ 25% from last month", valueColor: "#258C3F" },
  { key: "rating", label: "Rating", value: "4.8", sub: "42 Reviews", isRating: true, valueColor: "#666666" },
  { key: "jobs", label: "Total Jobs", value: "45", sub: "Completed", valueColor: "#666666" },
];

const PROFILE_JOBS = {
  active: [
    {
      id: "pj1",
      title: "Football Commentator",
      event: "Corporate football tournament",
      org: "Tech Crop Events",
      location: "Andheri Sports Complex",
      time: "08:00 AM - 02:00 PM",
      date: "Monday, 15 May 2026",
      rate: "₹2,500/-",
      status: "Confirmed",
    },
    {
      id: "pj2",
      title: "Football Commentator",
      event: "Corporate football tournament",
      org: "Tech Crop Events",
      location: "Andheri Sports Complex",
      time: "08:00 AM - 02:00 PM",
      date: "Monday, 15 May 2026",
      rate: "₹4,000/-",
      status: "Confirmed",
    },
    {
      id: "pj3",
      title: "Football Commentator",
      event: "Corporate football tournament",
      org: "Tech Crop Events",
      location: "Andheri Sports Complex",
      time: "08:00 AM - 02:00 PM",
      date: "Monday, 15 May 2026",
      rate: "₹3,000/-",
      status: "In Progress",
    },
  ],
  upcoming: [
    {
      id: "up1",
      title: "Cricket Referee",
      event: "Weekend Tournament",
      org: "Local Sports Club",
      location: "Marine Drive",
      date: "Monday, 25 May 2026",
      rate: "₹2,000/-",
      timeLabel: "2 Day left",
    },
    {
      id: "up2",
      title: "Cricket Commentator",
      event: "University Championships",
      org: "Mumbai University",
      location: "Andheri Sports Complex",
      date: "Monday, 15 May 2026",
      rate: "₹3,500/-",
      timeLabel: "2 h ago",
    },
    {
      id: "up3",
      title: "Football Referee",
      event: "Inter-College Cup",
      org: "Sports Federation",
      location: "Powai Ground",
      date: "Friday, 30 May 2026",
      rate: "₹2,500/-",
      timeLabel: "5 Day left",
    },
    {
      id: "up4",
      title: "Badminton Scorer",
      event: "City Championship",
      org: "Pune Sports Club",
      location: "Kothrud Badminton Hall",
      date: "Sunday, 1 June 2026",
      rate: "₹1,200/-",
      timeLabel: "7 Day left",
    },
    {
      id: "up5",
      title: "Basketball Commentator",
      event: "Corporate League",
      org: "Tech Crop Events",
      location: "DY Patil Stadium",
      date: "Saturday, 7 June 2026",
      rate: "₹2,800/-",
      timeLabel: "13 Day left",
    },
  ],
  completed: [
    {
      id: "cp1",
      title: "Cricket Referee",
      event: "State Level Tournament",
      org: "Maharashtra Cricket Association",
      completedOn: "25 May 2026",
      earned: "₹3,000/-",
      rating: 5.0,
      review: "Excellent referee! Very professional and punctual.",
    },
    {
      id: "cp2",
      title: "Event Cameraman",
      event: "Corporate Match",
      org: "XYZ Company",
      completedOn: "1 May 2026",
      earned: "₹2,500/-",
      rating: 4.0,
      review: "Good quality footage",
    },
  ],
};

const PROFILE_JOB_TABS = [
  { key: "active", label: "Active" },
  { key: "upcoming", label: "Upcoming" },
  { key: "completed", label: "Completed" },
];

const JOB_STATUS_STYLES = {
  Confirmed: { bg: "#E5F3FF", text: "#007DEB", icon: "checkmark-outline" },
  "In Progress": { bg: "#FFEFD5", text: "#D97706", icon: "time-outline" },
  Completed: { bg: "#D7F4E1", text: "#1A8E4A", icon: "checkmark-done-outline" },
};

const REQUESTS = [
  {
    id: "r1",
    title: "Birthday Cricket Match",
    fromName: "Rahul Sharma",
    role: "Referee",
    location: "Andheri Sports Complex",
    date: "15 May 2026",
    rate: "₹1,500/-",
    isNew: true,
  },
  {
    id: "r2",
    title: "Football Tournament",
    fromName: "Elite Sports Club",
    role: "Commentator",
    location: "Powai Ground",
    date: "20 May 2026",
    rate: "₹2,000/-",
    isNew: true,
  },
];

const PROFILE_SPORT_FILTERS = [
  { key: "All", label: "All" },
  { key: "Cricket", label: "Cricket (02)" },
  { key: "Football", label: "Football (03)" },
  { key: "Badminton", label: "Badminton" },
];

const PROFESSIONAL_PROFILES = [
  {
    id: "p1",
    role: "Commentator",
    sport: "Cricket",
    tier: "Professional",
    rating: "4.9",
    jobsDone: "32",
    earned: "₹98,000",
    active: false,
  },
  {
    id: "p2",
    role: "Referee",
    sport: "Football",
    tier: "Professional",
    rating: "4.9",
    jobsDone: "32",
    earned: "₹98,000",
    active: true,
  },
  {
    id: "p3",
    role: "Commentator",
    sport: "Football",
    tier: "Professional",
    rating: "4.9",
    jobsDone: "32",
    earned: "₹98,000",
    active: false,
  },
];

const KNOB_SIZE = 36;
const KNOB_INSET = 6;

const ProfileActionToggle = ({ isActive, onActivate, onDeactivate }) => {
  const translateX = useRef(new Animated.Value(0)).current;
  const offsetRef = useRef(0);
  const maxXRef = useRef(0);
  const isActiveRef = useRef(isActive);
  const firedRef = useRef(false);
  const callbacksRef = useRef({ onActivate, onDeactivate });

  isActiveRef.current = isActive;
  callbacksRef.current = { onActivate, onDeactivate };

  const onLayout = (e) => {
    const w = e.nativeEvent.layout.width;
    const newMax = Math.max(0, w - KNOB_SIZE - KNOB_INSET * 2);
    if (newMax === maxXRef.current) return;
    maxXRef.current = newMax;
    const target = isActiveRef.current ? newMax : 0;
    offsetRef.current = target;
    translateX.setValue(target);
  };

  React.useEffect(() => {
    const max = maxXRef.current;
    if (max === 0) return;
    const target = isActive ? max : 0;
    offsetRef.current = target;
    Animated.spring(translateX, {
      toValue: target,
      useNativeDriver: true,
      friction: 7,
      tension: 80,
    }).start();
  }, [isActive, translateX]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 6 && Math.abs(g.dx) > Math.abs(g.dy),
      onMoveShouldSetPanResponderCapture: (_, g) =>
        Math.abs(g.dx) > 6 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
      onPanResponderGrant: () => {
        firedRef.current = false;
        translateX.stopAnimation((v) => {
          offsetRef.current = v;
        });
      },
      onPanResponderMove: (_, g) => {
        const max = maxXRef.current;
        const next = Math.max(0, Math.min(max, offsetRef.current + g.dx));
        translateX.setValue(next);
      },
      onPanResponderRelease: (_, g) => {
        const max = maxXRef.current;
        const threshold = max * 0.35;
        const finalX = Math.max(0, Math.min(max, offsetRef.current + g.dx));
        const active = isActiveRef.current;
        const cbs = callbacksRef.current;

        const settle = (to, fire) => {
          Animated.spring(translateX, {
            toValue: to,
            useNativeDriver: true,
            friction: 7,
            tension: 80,
          }).start();
          offsetRef.current = to;
          if (fire && !firedRef.current) {
            firedRef.current = true;
            fire();
          }
        };

        if (!active && finalX >= threshold) {
          settle(0, cbs.onActivate);
        } else if (active && finalX <= max - threshold) {
          settle(max, cbs.onDeactivate);
        } else {
          settle(active ? max : 0, null);
        }
      },
      onPanResponderTerminate: () => {
        const snap = isActiveRef.current ? maxXRef.current : 0;
        Animated.spring(translateX, {
          toValue: snap,
          useNativeDriver: true,
          friction: 7,
          tension: 80,
        }).start();
        offsetRef.current = snap;
      },
    })
  ).current;

  return (
    <View
      onLayout={onLayout}
      style={[
        styles.swipeTrack,
        isActive && styles.swipeTrackActive,
      ]}
      {...panResponder.panHandlers}
    >
      <Text
        style={[
          styles.swipeLabel,
          isActive && styles.swipeLabelActive,
        ]}
      >
        {isActive ? "Deactivate Profile" : "Activate Profile"}
      </Text>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.swipeKnob,
          isActive && styles.swipeKnobActive,
          { transform: [{ translateX }] },
        ]}
      >
        <Ionicons
          name={isActive ? "chevron-back" : "chevron-forward"}
          size={14}
          color="#FFFFFF"
          style={{ marginRight: -6 }}
        />
        <Ionicons
          name={isActive ? "chevron-back" : "chevron-forward"}
          size={14}
          color="#FFFFFF"
        />
      </Animated.View>
    </View>
  );
};

const BrowseJobs = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const userId = user?._id || user?.id;
  const [activeTab, setActiveTab] = useState("browse");
  const [search, setSearch] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [selectedSports, setSelectedSports] = useState([]);
  const [activeSubTab, setActiveSubTab] = useState("applications");
  const [profileTab, setProfileTab] = useState("dashboard");
  const [profileJobTab, setProfileJobTab] = useState("active");
  const [profileSportFilter, setProfileSportFilter] = useState("All");

  // ── server-backed data ──
  const [jobsList, setJobsList] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [applications, setApplications] = useState([]);
  const [appStats, setAppStats] = useState({ total: 0, pending: 0, accepted: 0, rejected: 0 });
  const [requests, setRequests] = useState([]);
  const [dashStats, setDashStats] = useState(null);
  const [dashJobs, setDashJobs] = useState({ active: [], upcoming: [], completed: [] });
  const [myProfiles, setMyProfiles] = useState([]);

  const [profilesActiveMap, setProfilesActiveMap] = useState({});

  const authHeaders = async () => {
    const token = await AsyncStorage.getItem("auth_token");
    return { Authorization: `Bearer ${token}` };
  };

  const fetchJobs = useCallback(async () => {
    setLoadingJobs(true);
    try {
      const headers = await authHeaders();
      const res = await axios.get(JOBS.POSTINGS, { headers });
      if (res.data?.success) {
        setJobsList(
          (res.data.jobs || []).map((j) => ({
            id: String(j._id),
            jobId: String(j._id),
            title: j.title,
            role: ROLE_LABELS[j.role] || j.role,
            venue: j.venue,
            manager: j.managerName,
            location: j.location,
            sport: j.sport,
            date: j.schedule?.[0]?.date || "",
            applicants: j.applicantsCount || 0,
            rate: `₹${(j.rate || 0).toLocaleString("en-IN")}/-`,
            rateUnit: j.rateUnit || "per hour",
          }))
        );
      }
    } catch (e) {
      setJobsList([]);
      setLoadError(true);
    } finally {
      setLoadingJobs(false);
    }
  }, []);

  const fetchApplications = useCallback(async () => {
    if (!userId) return;
    try {
      const headers = await authHeaders();
      const res = await axios.get(JOBS.MY_APPLICATIONS(userId), { headers });
      if (res.data?.success) {
        setApplications(res.data.applications || []);
        setAppStats(res.data.stats || { total: 0, pending: 0, accepted: 0, rejected: 0 });
      }
    } catch (e) {
      setLoadError(true);
    }
  }, [userId]);

  const fetchRequests = useCallback(async () => {
    if (!userId) return;
    try {
      const headers = await authHeaders();
      const res = await axios.get(JOBS.RECEIVED_HIRES(userId), { headers });
      if (res.data?.success) setRequests(res.data.requests || []);
    } catch (e) {
      setLoadError(true);
    }
  }, [userId]);

  const fetchDashboard = useCallback(async () => {
    if (!userId) return;
    try {
      const headers = await authHeaders();
      const res = await axios.get(JOBS.DASHBOARD(userId), { headers });
      if (res.data?.success) {
        setDashStats(res.data.stats);
        setDashJobs(res.data.jobs || { active: [], upcoming: [], completed: [] });
      }
    } catch (e) {
      setLoadError(true);
    }
  }, [userId]);

  const fetchMyProfiles = useCallback(async () => {
    if (!userId) return;
    try {
      const headers = await authHeaders();
      const res = await axios.get(JOBS.MY_PROFILES(userId), { headers });
      if (res.data?.success) {
        const list = res.data.profiles || [];
        setMyProfiles(list);
        setProfilesActiveMap(
          list.reduce((acc, p) => ({ ...acc, [String(p._id)]: p.isActive }), {})
        );
      }
    } catch (e) {
      setLoadError(true);
    }
  }, [userId]);

  const reloadAll = useCallback(() => {
    setLoadError(false);
    fetchJobs();
    fetchApplications();
    fetchRequests();
    fetchDashboard();
    fetchMyProfiles();
  }, [fetchJobs, fetchApplications, fetchRequests, fetchDashboard, fetchMyProfiles]);

  useFocusEffect(useCallback(() => { reloadAll(); }, [reloadAll]));
  const [activateConfirmProfile, setActivateConfirmProfile] = useState(null);
  const [deactivateConfirmProfile, setDeactivateConfirmProfile] = useState(null);

  const toggleProfileActive = (id) => {
    const isCurrentlyActive = !!profilesActiveMap[id];
    const src = myProfiles.find((p) => String(p._id) === String(id));
    const pro = { id, role: src ? ROLE_LABELS[src.role] || src.role : "Profile" };
    if (isCurrentlyActive) {
      setDeactivateConfirmProfile(pro);
    } else {
      setActivateConfirmProfile(pro);
    }
  };

  const setProfileActive = async (id, isActive) => {
    try {
      const headers = await authHeaders();
      await axios.patch(JOBS.SET_PROFILE_ACTIVE(id), { isActive }, { headers });
      setProfilesActiveMap((prev) => ({ ...prev, [id]: isActive }));
      fetchMyProfiles();
    } catch (err) {
      Alert.alert("Could not update", err?.response?.data?.message || err.message);
    }
  };

  const cancelActivate = () => setActivateConfirmProfile(null);
  const confirmActivate = () => {
    if (activateConfirmProfile) setProfileActive(activateConfirmProfile.id, true);
    setActivateConfirmProfile(null);
  };

  const [requestAccepted, setRequestAccepted] = useState(null);
  const [requestRejected, setRequestRejected] = useState(null);

  const respondToRequest = async (req, status) => {
    try {
      const headers = await authHeaders();
      await axios.patch(JOBS.RESPOND_HIRE(req.id), { status }, { headers });
      fetchRequests();
      fetchDashboard();
      return true;
    } catch (err) {
      Alert.alert("Could not update", err?.response?.data?.message || err.message);
      return false;
    }
  };

  // Only show the success popup once the server actually confirmed the change.
  const openAcceptPopup = async (req) => {
    if (await respondToRequest(req, "accepted")) setRequestAccepted(req);
  };
  const closeAcceptPopup = () => setRequestAccepted(null);
  const openRejectPopup = async (req) => {
    if (await respondToRequest(req, "rejected")) setRequestRejected(req);
  };
  const closeRejectPopup = () => setRequestRejected(null);

  const cancelDeactivate = () => setDeactivateConfirmProfile(null);
  const confirmDeactivate = () => {
    if (deactivateConfirmProfile) setProfileActive(deactivateConfirmProfile.id, false);
    setDeactivateConfirmProfile(null);
  };

  const pad2 = (n) => String(n).padStart(2, "0");
  const applicationStats = [
    { label: "Total", value: pad2(appStats.total) },
    { label: "Pending", value: pad2(appStats.pending) },
    { label: "Accepted", value: pad2(appStats.accepted) },
    { label: "Rejected", value: pad2(appStats.rejected) },
  ];

  // Professional profile cards (My Profile → Profile tab)
  const professionalCards = myProfiles.map((p) => ({
    id: String(p._id),
    role: ROLE_LABELS[p.role] || p.role,
    sport: (p.sports && p.sports[0]) || "",
    tier: p.tier || "Professional",
    rating: p.rating || 0,
    jobsDone: 0,
    earned: "₹0",
  }));

  const visibleProfiles =
    profileSportFilter === "All"
      ? professionalCards
      : professionalCards.filter((p) => p.sport === profileSportFilter);

  // Dashboard stat cards built from derived server stats
  const profileStats = [
    {
      key: "earnings",
      label: "Total Earnings",
      value: dashStats?.totalEarnings || "₹0",
      sub: "All Time",
      valueColor: "#258C3F",
    },
    {
      key: "month",
      label: "This Month",
      value: dashStats?.thisMonth || "₹0",
      sub: "Current month",
      valueColor: "#258C3F",
    },
    {
      key: "rating",
      label: "Rating",
      value: dashStats?.rating || "0.0",
      sub: `${dashStats?.reviewCount || 0} Reviews`,
      isRating: true,
      valueColor: "#666666",
    },
    {
      key: "jobs",
      label: "Total Jobs",
      value: String(dashStats?.totalJobs ?? 0),
      sub: "Completed",
      valueColor: "#666666",
    },
  ];

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

  const filteredJobs = jobsList.filter((job) => {
    if (selectedRoles.length > 0 && !selectedRoles.includes(job.role)) return false;
    if (selectedSports.length > 0 && !selectedSports.includes(job.sport)) return false;
    const q = search.trim().toLowerCase();
    if (q) {
      const haystack = [
        job.title,
        job.role,
        job.venue,
        job.manager,
        job.location,
        job.sport,
      ]
        .join(" ")
        .toLowerCase();
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

  const renderRequestCard = (req) => (
    <View key={req.id} style={styles.reqCard}>
      <View style={styles.reqHeaderRow}>
        <View style={{ flex: 1, paddingRight: 8 }}>
          <Text style={styles.reqTitle}>{req.title}</Text>
          <Text style={styles.reqFrom}>from {req.fromName}</Text>
        </View>
        {req.isNew && (
          <View style={styles.newBadge}>
            <Text style={styles.newBadgeText}>New</Text>
          </View>
        )}
      </View>

      <View style={styles.reqMetaRow}>
        <Ionicons name="briefcase-outline" size={16} color="#666666" />
        <Text style={styles.reqMetaLabel}>Role: </Text>
        <Text style={styles.reqMetaValue}>{req.role}</Text>
      </View>
      <View style={styles.reqMetaRow}>
        <Ionicons name="location-outline" size={16} color="#666666" />
        <Text style={styles.reqMetaValue}>{req.location}</Text>
      </View>
      <View style={styles.reqMetaRow}>
        <SvgUri
          uri={calenderUri}
          width={16}
          height={16}
          color="#666666"
        />
        <Text style={styles.reqMetaValue}>{req.date}</Text>
      </View>

      <Text style={styles.reqRate}>{req.rate}</Text>

      <View style={styles.reqActions}>
        <TouchableOpacity
          style={styles.rejectBtn}
          activeOpacity={0.8}
          onPress={() => openRejectPopup(req)}
        >
          <Ionicons name="close" size={22} color="#D7263D" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.acceptBtn}
          activeOpacity={0.9}
          onPress={() => openAcceptPopup(req)}
        >
          <Ionicons name="checkmark" size={18} color="#FFFFFF" />
          <Text style={styles.acceptBtnText}>Accept</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderApplicationCard = (app) => {
    const status = STATUS_STYLES[app.status] || STATUS_STYLES.Pending;
    const goToDetails = () =>
      navigation.navigate("JobDetails", {
        jobId: app.id,
        status: app.status,
        title: app.title,
        subtitle: app.venue,
        rate: app.rate,
      });
    return (
      <TouchableOpacity
        key={app.id}
        style={styles.appCard}
        activeOpacity={0.85}
        onPress={goToDetails}
      >
        <View style={styles.appTopRow}>
          <View style={styles.appLogoWrap}>
            <SvgUri
              uri={refereeUri}
              width="100%"
              height="100%"
            />
          </View>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={styles.appTitle}>{app.title}</Text>
              <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                <Text style={[styles.statusBadgeText, { color: status.text }]}>{app.status}</Text>
              </View>
            </View>
            <Text style={styles.appVenue} numberOfLines={1}>
              {app.venue}
            </Text>
          </View>
        </View>

        <View style={styles.appDivider} />

        <Text style={styles.appAppliedOn}>Applied on {app.appliedOn}</Text>

        <View style={styles.appBottomRow}>
          <View style={styles.appRateRow}>
            <Text style={styles.appRate}>{app.rate} </Text>
            <Text style={styles.appRateUnit}>{app.rateUnit}</Text>
          </View>
          <TouchableOpacity activeOpacity={0.7} onPress={goToDetails}>
            <Text style={styles.viewDetailsLink}>View Details</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderJobCard = (job) => (
    <TouchableOpacity
      key={job.id}
      style={styles.jobCard}
      activeOpacity={0.85}
      onPress={() =>
        navigation.navigate("JobDetails", {
          jobId: job.id,
          title: job.title,
          subtitle: job.venue,
          rate: job.rate,
        })
      }
    >
      <View style={styles.jobTopRow}>
        <View style={styles.jobLogoWrap}>
          <SvgUri
            uri={refereeUri}
            width="100%"
            height="100%"
          />
        </View>
        <View style={{ flex: 1, paddingRight: 6 }}>
          <Text style={styles.jobTitle}>{job.title}</Text>
          <Text style={styles.jobVenue} numberOfLines={1}>
            {job.venue}
          </Text>
        </View>
        <View style={styles.sportBadge}>
          <Text style={styles.sportBadgeText}>{job.sport}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.jobMidRow}>
        <View style={{ flex: 1, paddingRight: 6 }}>
          <Text style={styles.jobManager}>{job.manager}</Text>
          <Text style={styles.jobLocation} numberOfLines={1}>
            {job.location}
          </Text>
        </View>
        <Text style={styles.jobDate}>{job.date}</Text>
      </View>

      <View style={styles.jobBottomRow}>
        <Text style={styles.jobApplicants}>{job.applicants} Applicants</Text>
        <View style={styles.rateRow}>
          <Text style={styles.jobRate}>{job.rate} </Text>
          <Text style={styles.jobRateUnit}>{job.rateUnit}</Text>
        </View>
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
        <Text style={styles.headerTitle}>Sports Jobs & Opportunities</Text>
      </View>

      {loadError && (
        <TouchableOpacity
          onPress={reloadAll}
          activeOpacity={0.85}
          style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#FFE2E2", paddingVertical: 10, marginHorizontal: 16, borderRadius: 10, marginBottom: 8 }}
        >
          <Ionicons name="cloud-offline-outline" size={16} color="#D7263D" />
          <Text style={{ color: "#D7263D", fontFamily: "Montserrat_600SemiBold", fontSize: 13 }}>
            Couldn't load some data. Tap to retry.
          </Text>
        </TouchableOpacity>
      )}

      {/* Tabs */}
      <View style={styles.tabsWrap}>
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === "browse" && styles.tabActive]}
            onPress={() => setActiveTab("browse")}
            activeOpacity={0.85}
          >
            <Text style={[styles.tabText, activeTab === "browse" && styles.tabTextActive]}>
              Browse
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === "application" && styles.tabActive]}
            onPress={() => setActiveTab("application")}
            activeOpacity={0.85}
          >
            <Text style={[styles.tabText, activeTab === "application" && styles.tabTextActive]}>
              Application
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {activeTab === "application" ? (
        <View style={{ flex: 1 }}>
          {/* Sub-tabs */}
          <View style={styles.subTabsRow}>
            {SUB_TABS.map((t) => {
              const active = activeSubTab === t.key;
              return (
                <TouchableOpacity
                  key={t.key}
                  style={styles.subTab}
                  activeOpacity={0.8}
                  onPress={() => setActiveSubTab(t.key)}
                >
                  <View style={styles.subTabInner}>
                    <View style={styles.subTabIconWrap}>
                      {t.key === "requests" ? (
                        <SvgUri
                          uri={envelopeUri}
                          width={16}
                          height={16}
                          color={active ? "#15A765" : "#7A7A7A"}
                        />
                      ) : (
                        <Ionicons
                          name={t.icon}
                          size={16}
                          color={active ? "#15A765" : "#7A7A7A"}
                        />
                      )}
                      {t.dot && <View style={styles.subTabDot} />}
                    </View>
                    <Text
                      style={[styles.subTabText, active && styles.subTabTextActive]}
                      numberOfLines={1}
                    >
                      {t.label}
                    </Text>
                  </View>
                  {active && <View style={styles.subTabUnderline} />}
                </TouchableOpacity>
              );
            })}
          </View>
          <View style={styles.subTabsDivider} />

          <ScrollView
            style={{ flex: 1, backgroundColor: "#FFFFFF" }}
            contentContainerStyle={{
              paddingBottom:
                activeSubTab === "myProfile" && profileTab === "profile" ? 120 : 30,
            }}
            showsVerticalScrollIndicator={false}
          >
            {activeSubTab === "applications" && (
              <>
                {/* Stats row */}
                <View style={styles.statsBg}>
                  <View style={styles.statsRow}>
                    {applicationStats.map((s) => (
                      <View key={s.label} style={styles.statBox}>
                        <Text style={styles.statValue}>{s.value}</Text>
                        <Text style={styles.statLabel}>{s.label}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                {/* Application cards */}
                <View style={styles.appList}>
                  {applications.length > 0 ? (
                    applications.map(renderApplicationCard)
                  ) : (
                    <View style={styles.subTabEmpty}>
                      <Ionicons name="document-text-outline" size={40} color="#CCCCCC" />
                      <Text style={styles.subTabEmptyText}>No applications yet</Text>
                    </View>
                  )}
                </View>
              </>
            )}

            {activeSubTab === "requests" && (
              <View style={{ paddingHorizontal: 16, paddingTop: 14 }}>
                {/* Info banner */}
                <View style={styles.infoBanner}>
                  <SvgUri
                    uri={envelopeUri}
                    width={20}
                    height={20}
                    color="#1E88F5"
                    style={{ marginTop: 2 }}
                  />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.infoTitle}>Personal Hiring Request</Text>
                    <Text style={styles.infoMessage}>
                      Players and organizers can directly request your services for their events
                    </Text>
                  </View>
                </View>

                {/* Request cards */}
                <View style={{ marginTop: 14, gap: 14 }}>
                  {requests.length > 0 ? (
                    requests.map(renderRequestCard)
                  ) : (
                    <View style={styles.subTabEmpty}>
                      <Ionicons name="mail-outline" size={40} color="#CCCCCC" />
                      <Text style={styles.subTabEmptyText}>No hire requests yet</Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            {activeSubTab === "myProfile" && (
              <View style={{ flex: 1 }}>
                {/* Dashboard / Profile toggle */}
                <View style={styles.dashToggleWrap}>
                  <View style={styles.dashToggle}>
                    <TouchableOpacity
                      style={[
                        styles.dashToggleBtn,
                        profileTab === "dashboard" && styles.dashToggleBtnActive,
                      ]}
                      activeOpacity={0.85}
                      onPress={() => setProfileTab("dashboard")}
                    >
                      <Text
                        style={[
                          styles.dashToggleText,
                          profileTab === "dashboard" && styles.dashToggleTextActive,
                        ]}
                      >
                        Dashboard
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.dashToggleBtn,
                        profileTab === "profile" && styles.dashToggleBtnActive,
                      ]}
                      activeOpacity={0.85}
                      onPress={() => setProfileTab("profile")}
                    >
                      <Text
                        style={[
                          styles.dashToggleText,
                          profileTab === "profile" && styles.dashToggleTextActive,
                        ]}
                      >
                        Profile
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {profileTab === "dashboard" ? (
                  <>
                    {/* Stats grid 2x2 */}
                    <View style={styles.profileStatsWrap}>
                      <View style={styles.profileStatsGrid}>
                        {profileStats.map((s) => (
                          <View key={s.key} style={styles.profileStatCard}>
                            <Text style={styles.profileStatLabel}>{s.label}</Text>
                            <View style={styles.profileStatValueRow}>
                              {s.isRating && (
                                <SvgUri
                                  uri={starUri}
                                  width={18}
                                  height={18}
                                  style={{ marginRight: 4 }}
                                />
                              )}
                              <Text
                                style={[
                                  styles.profileStatValue,
                                  s.valueColor && { color: s.valueColor },
                                ]}
                              >
                                {s.value}
                              </Text>
                            </View>
                            <Text style={styles.profileStatSub}>{s.sub}</Text>
                          </View>
                        ))}
                      </View>
                    </View>

                    {/* Job tabs */}
                    <View style={styles.jobTabsRow}>
                      {PROFILE_JOB_TABS.map((t) => {
                        const active = profileJobTab === t.key;
                        return (
                          <TouchableOpacity
                            key={t.key}
                            style={styles.jobTab}
                            activeOpacity={0.8}
                            onPress={() => setProfileJobTab(t.key)}
                          >
                            <Text
                              style={[
                                styles.jobTabText,
                                active && styles.jobTabTextActive,
                              ]}
                            >
                              {t.label} ({pad2((dashJobs[t.key] || []).length)})
                            </Text>
                            {active && <View style={styles.jobTabUnderline} />}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                    <View style={styles.subTabsDivider} />

                    {/* Job cards */}
                    <View style={styles.profileJobsList}>
                      {(dashJobs[profileJobTab] || []).length === 0 ? (
                        <View style={styles.subTabEmpty}>
                          <Ionicons name="briefcase-outline" size={40} color="#CCCCCC" />
                          <Text style={styles.subTabEmptyText}>No {profileJobTab} jobs</Text>
                        </View>
                      ) : (
                        (dashJobs[profileJobTab] || []).map((job) => {
                          const isUpcoming = profileJobTab === "upcoming";
                          const isCompleted = profileJobTab === "completed";
                          const sStyle = JOB_STATUS_STYLES[job.status] || JOB_STATUS_STYLES.Confirmed;

                          if (isCompleted) {
                            return (
                              <TouchableOpacity
                                key={job.id}
                                style={styles.profileJobCard}
                                activeOpacity={0.9}
                                onPress={() =>
                                  navigation.navigate("JobDetails", {
                                    jobId: job.id,
                                    status: "Completed",
                                    title: job.title,
                                    subtitle: job.event,
                                    org: job.org,
                                    rate: job.earned,
                                  })
                                }
                              >
                                <View style={styles.profileJobTopRow}>
                                  <View style={{ flex: 1, paddingRight: 8 }}>
                                    <View style={styles.completedTitleRow}>
                                      <Text style={styles.profileJobTitle}>{job.title}</Text>
                                      <Ionicons
                                        name="checkmark-circle"
                                        size={18}
                                        color="#15A765"
                                        style={{ marginLeft: 6 }}
                                      />
                                    </View>
                                    <Text style={styles.profileJobEvent}>{job.event}</Text>
                                    <Text style={styles.profileJobOrg}>{job.org}</Text>
                                  </View>
                                  <View style={{ alignItems: "flex-end" }}>
                                    <Text style={styles.completedRate}>{job.earned}</Text>
                                    <Text style={styles.completedEarnedLabel}>Earned</Text>
                                  </View>
                                </View>

                                <View style={styles.profileJobMetaRow}>
                                  <Ionicons name="calendar-outline" size={16} color="#6F6F6F" />
                                  <Text style={styles.profileJobMetaText}>
                                    Completed: {job.completedOn}
                                  </Text>
                                </View>

                                <View style={styles.completedRatingRow}>
                                  <Ionicons name="star" size={16} color="#F5B400" />
                                  <Text style={styles.completedRatingText}>{job.rating.toFixed(1)}</Text>
                                </View>

                                {job.review && (
                                  <View style={styles.completedReviewWrap}>
                                    <Text style={styles.completedReviewText}>"{job.review}"</Text>
                                  </View>
                                )}
                              </TouchableOpacity>
                            );
                          }

                          return (
                            <View key={job.id} style={styles.profileJobCard}>
                              <View style={styles.profileJobTopRow}>
                                <View style={{ flex: 1, paddingRight: 8 }}>
                                  <Text style={styles.profileJobTitle}>{job.title}</Text>
                                  <Text style={styles.profileJobEvent}>{job.event}</Text>
                                  <Text style={styles.profileJobOrg}>{job.org}</Text>
                                </View>
                                {isUpcoming ? (
                                  <Text style={styles.timeLeftText}>{job.timeLabel}</Text>
                                ) : (
                                  <View style={[styles.profileStatusBadge, { backgroundColor: sStyle.bg }]}>
                                    <Ionicons name={sStyle.icon} size={12} color={sStyle.text} />
                                    <Text style={[styles.profileStatusText, { color: sStyle.text }]}>
                                      {job.status}
                                    </Text>
                                  </View>
                                )}
                              </View>

                              <View style={styles.profileJobMeta}>
                                <View style={styles.profileJobMetaRow}>
                                  <Ionicons name="location-outline" size={16} color="#6F6F6F" />
                                  <Text style={styles.profileJobMetaText}>{job.location}</Text>
                                </View>
                                {!isUpcoming && (
                                  <View style={styles.profileJobMetaRow}>
                                    <Ionicons name="time-outline" size={16} color="#6F6F6F" />
                                    <Text style={styles.profileJobMetaText}>{job.time}</Text>
                                  </View>
                                )}
                                <View style={styles.profileJobMetaRow}>
                                  <Ionicons name="calendar-outline" size={16} color="#6F6F6F" />
                                  <Text style={styles.profileJobMetaText}>{job.date}</Text>
                                </View>
                              </View>

                              <Text style={styles.profileJobRate}>{job.rate}</Text>

                              {isUpcoming ? (
                                <TouchableOpacity
                                  style={styles.upcomingDetailsBtn}
                                  activeOpacity={0.85}
                                  onPress={() =>
                                    navigation.navigate("JobDetails", {
                                      jobId: job.id,
                                      status: "Upcoming",
                                      timeLabel: job.timeLabel,
                                      title: job.title,
                                      subtitle: job.event,
                                      org: job.org,
                                      rate: job.rate,
                                    })
                                  }
                                >
                                  <Text style={styles.upcomingDetailsBtnText}>View Details</Text>
                                </TouchableOpacity>
                              ) : (
                                <View style={styles.profileJobActions}>
                                  <TouchableOpacity
                                    style={styles.viewDetailsBtn}
                                    activeOpacity={0.85}
                                    onPress={() =>
                                      navigation.navigate("JobDetails", {
                                        jobId: job.id,
                                        status: job.status,
                                        title: job.title,
                                        subtitle: job.event,
                                        org: job.org,
                                        rate: job.rate,
                                      })
                                    }
                                  >
                                    <Text style={styles.viewDetailsBtnText}>View Details</Text>
                                  </TouchableOpacity>
                                  <TouchableOpacity style={styles.chatBtn} activeOpacity={0.9}>
                                    <Text style={styles.chatBtnText}>Chat Organizer</Text>
                                  </TouchableOpacity>
                                </View>
                              )}
                            </View>
                          );
                        })
                      )}
                    </View>
                  </>
                ) : (
                  <View style={{ flex: 1 }}>
                    {/* Sport filter chips */}
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.profSportRow}
                    >
                      {PROFILE_SPORT_FILTERS.map((f) => {
                        const active = profileSportFilter === f.key;
                        return (
                          <TouchableOpacity
                            key={f.key}
                            style={[
                              styles.profSportChip,
                              active && styles.profSportChipActive,
                            ]}
                            activeOpacity={0.85}
                            onPress={() => setProfileSportFilter(f.key)}
                          >
                            <Text
                              style={[
                                styles.profSportChipText,
                                active && styles.profSportChipTextActive,
                              ]}
                            >
                              {f.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>

                    {/* Profile cards */}
                    <View style={styles.profCardsList}>
                      {visibleProfiles.map((p) => {
                        const isActive = !!profilesActiveMap[p.id];
                        return (
                          <View key={p.id} style={styles.profCard}>
                            <View style={styles.profCardHeader}>
                              <View style={{ flex: 1, paddingRight: 10 }}>
                                <Text style={styles.profCardTitle}>{p.role}</Text>
                                <Text style={styles.profCardSubtitle}>
                                  {p.sport} • {p.tier}
                                </Text>
                              </View>
                              <TouchableOpacity
                                style={styles.profEditBtn}
                                activeOpacity={0.8}
                              >
                                <Feather name="edit-2" size={16} color="#6F6F6F" />
                              </TouchableOpacity>
                            </View>

                            <View style={styles.profStatsRow}>
                              <View style={styles.profStatCol}>
                                <Text style={styles.profStatValue}>{p.rating}</Text>
                                <Text style={styles.profStatLabel}>Rating</Text>
                              </View>
                              <View style={styles.profStatCol}>
                                <Text style={styles.profStatValue}>{p.jobsDone}</Text>
                                <Text style={styles.profStatLabel}>Jobs Done</Text>
                              </View>
                              <View style={styles.profStatCol}>
                                <Text
                                  style={[styles.profStatValue, { color: "#15A765" }]}
                                >
                                  {p.earned}
                                </Text>
                                <Text style={styles.profStatLabel}>Earned</Text>
                              </View>
                            </View>

                            <ProfileActionToggle
                              isActive={isActive}
                              onActivate={() => toggleProfileActive(p.id)}
                              onDeactivate={() => toggleProfileActive(p.id)}
                            />
                          </View>
                        );
                      })}
                    </View>

                  </View>
                )}
              </View>
            )}
          </ScrollView>

          {/* Sticky Create Professional Profile CTA */}
          {activeSubTab === "myProfile" && profileTab === "profile" && (
            <View
              style={[
                styles.createProfileBar,
                { paddingBottom: insets.bottom > 0 ? insets.bottom : 12 },
              ]}
            >
              <TouchableOpacity
                style={styles.createProfileBtn}
                activeOpacity={0.9}
                onPress={() => navigation.navigate("CreateProfessionalProfile")}
              >
                <Text style={styles.createProfileBtnText}>
                  Create Professional Profile
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{ paddingBottom: 30 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Need a Professional Section */}
          <View style={styles.heroSection}>
            <Text style={styles.heroTitle}>Need a Professional ?</Text>

            <View style={styles.heroCardsRow}>
              <TouchableOpacity style={styles.browseJobCard} activeOpacity={0.9}>
                <View style={styles.browseJobIconWrap}>
                  <Feather name="search" size={26} color="#FF8D28" />
                </View>
                <Text style={styles.browseJobTitle}>Browse Job</Text>
                <Text style={styles.browseJobSubtitle}>Search & Apply</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickHireWrap}
                activeOpacity={0.9}
                onPress={() => navigation.navigate("HireProfessional")}
              >
                <LinearGradient
                  colors={["#FF8A3D", "#F26B1F"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.quickHireCard}
                >
                  <View style={styles.quickHireIconWrap}>
                    <Feather name="globe" size={26} color="#FFFFFF" />
                  </View>
                  <Text style={styles.quickHireTitle}>Quick Hire</Text>
                  <Text style={styles.quickHireSubtitle}>Search & Hire Now</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>

            <Text style={styles.heroHelper}>
              Booked a turf? Hire a referee, scorer, or cameraman{"\n"}for your match!
            </Text>
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

          {/* Filter chips */}
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

          {/* Job Listings */}
          <View style={styles.jobsList}>
            {loadingJobs ? (
              <View style={styles.emptyResults}>
                <ActivityIndicator size="large" color="#15A765" />
              </View>
            ) : filteredJobs.length > 0 ? (
              filteredJobs.map(renderJobCard)
            ) : (
              <View style={styles.emptyResults}>
                <Ionicons name="search-outline" size={40} color="#CCCCCC" />
                <Text style={styles.emptyResultsTitle}>No opportunities found</Text>
                <Text style={styles.emptyResultsHint}>
                  Try a different search or clear the filters
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      )}

      {/* Activate Profile Confirmation */}
      <Modal
        visible={!!activateConfirmProfile}
        transparent
        animationType="fade"
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={cancelActivate}
      >
        <Pressable style={styles.activateBackdrop} onPress={cancelActivate}>
          <Pressable style={styles.activateCard} onPress={() => { }}>
            <View style={styles.activateIconCircle}>
              <Ionicons name="checkmark" size={42} color="#FFFFFF" />
            </View>
            <Text style={styles.activateTitle}>
              Activate {activateConfirmProfile?.role || "Referee"} Profile?
            </Text>
            <Text style={styles.activateBody}>
              Your {(activateConfirmProfile?.role || "referee").toLowerCase()} profile will become active and visible for:
            </Text>
            <View style={styles.activateList}>
              <Text style={styles.activateBullet}>{"•"}  Match requests</Text>
              <Text style={styles.activateBullet}>{"•"}  Tournament assignments</Text>
              <Text style={styles.activateBullet}>
                {"•"}  {activateConfirmProfile?.role || "Referee"} job opportunities
              </Text>
            </View>
            <Text style={styles.activateSwitchNote}>You can switch profiles anytime.</Text>
            <View style={styles.activateBtnRow}>
              <TouchableOpacity
                style={styles.activateCancelBtn}
                activeOpacity={0.85}
                onPress={cancelActivate}
              >
                <Text style={styles.activateCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.activateConfirmBtn}
                activeOpacity={0.9}
                onPress={confirmActivate}
              >
                <Text style={styles.activateConfirmText}>Activate</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Deactivate Profile Confirmation */}
      <Modal
        visible={!!deactivateConfirmProfile}
        transparent
        animationType="fade"
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={cancelDeactivate}
      >
        <Pressable style={styles.activateBackdrop} onPress={cancelDeactivate}>
          <Pressable style={styles.activateCard} onPress={() => { }}>
            <View style={styles.deactivateIconWrap}>
              <Ionicons name="warning-outline" size={48} color="#FF2D55" />
            </View>
            <Text style={styles.activateTitle}>
              Deactivate {deactivateConfirmProfile?.role || "Referee"} Profile?
            </Text>
            <Text style={styles.activateBody}>You will stop receiving:</Text>
            <View style={styles.activateList}>
              <Text style={styles.activateBullet}>{"•"}  Match requests</Text>
              <Text style={styles.activateBullet}>{"•"}  Job applications</Text>
              <Text style={styles.activateBullet}>{"•"}  Tournament invitations</Text>
            </View>
            <Text style={styles.activateSwitchNote}>
              Your profile data and history will remain safe.
            </Text>
            <View style={styles.activateBtnRow}>
              <TouchableOpacity
                style={styles.activateCancelBtn}
                activeOpacity={0.85}
                onPress={cancelDeactivate}
              >
                <Text style={styles.activateCancelText}>Keep Active</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deactivateConfirmBtn}
                activeOpacity={0.9}
                onPress={confirmDeactivate}
              >
                <Text style={styles.activateConfirmText}>Deactivate</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Match Request Accepted Popup */}
      <Modal
        visible={!!requestAccepted}
        transparent
        animationType="fade"
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={closeAcceptPopup}
      >
        <Pressable style={styles.reqPopupBackdrop} onPress={closeAcceptPopup}>
          <Pressable style={styles.reqPopupCard} onPress={() => { }}>
            <TouchableOpacity
              style={styles.reqPopupCloseBtn}
              activeOpacity={0.8}
              onPress={closeAcceptPopup}
            >
              <Ionicons name="close" size={20} color="#1F1F1F" />
            </TouchableOpacity>

            <View style={styles.reqAcceptIconCircle}>
              <Ionicons name="checkmark" size={32} color="#FFFFFF" />
            </View>
            <Text style={styles.reqPopupTitle}>Match Request Accepted</Text>
            <Text style={styles.reqPopupBody}>Event has been added to your schedule.</Text>
            <Text style={styles.reqPopupBody}>You will receive:</Text>
            <View style={styles.reqPopupList}>
              <Text style={styles.reqPopupBullet}>{"•"}  Match reminders</Text>
              <Text style={styles.reqPopupBullet}>{"•"}  Live scoreboard access</Text>
              <Text style={styles.reqPopupBullet}>{"•"}  Event updates</Text>
            </View>
            <TouchableOpacity
              style={styles.reqPopupOutlineBtn}
              activeOpacity={0.85}
              onPress={() => {
                const req = requestAccepted;
                closeAcceptPopup();
                if (req) {
                  navigation.navigate("JobDetails", {
                    jobId: req.id,
                    status: "Accepted",
                    title: req.title,
                    subtitle: req.fromName,
                    rate: req.rate,
                  });
                }
              }}
            >
              <Text style={styles.reqPopupOutlineBtnText}>view details</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Match Request Rejected Popup */}
      <Modal
        visible={!!requestRejected}
        transparent
        animationType="fade"
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={closeRejectPopup}
      >
        <Pressable style={styles.reqPopupBackdrop} onPress={closeRejectPopup}>
          <Pressable style={styles.reqPopupCard} onPress={() => { }}>
            <TouchableOpacity
              style={styles.reqPopupCloseBtn}
              activeOpacity={0.8}
              onPress={closeRejectPopup}
            >
              <Ionicons name="close" size={20} color="#1F1F1F" />
            </TouchableOpacity>

            <View style={styles.reqRejectIconCircle}>
              <Ionicons name="close" size={32} color="#FFFFFF" />
            </View>
            <Text style={styles.reqPopupTitle}>Match Request Rejected</Text>
            <Text style={styles.reqPopupBody}>The request has been declined.</Text>
            <Text style={styles.reqPopupBody}>Please note:</Text>
            <View style={styles.reqPopupList}>
              <Text style={styles.reqPopupBullet}>{"•"}  Requester will be notified</Text>
              <Text style={styles.reqPopupBullet}>{"•"}  Event will not be added to your schedule</Text>
              <Text style={styles.reqPopupBullet}>{"•"}  You can review past requests anytime</Text>
            </View>
            <TouchableOpacity
              style={styles.reqPopupOutlineBtn}
              activeOpacity={0.85}
              onPress={() => {
                const req = requestRejected;
                closeRejectPopup();
                if (req) {
                  navigation.navigate("JobDetails", {
                    jobId: req.id,
                    status: "Rejected",
                    title: req.title,
                    subtitle: req.fromName,
                    rate: req.rate,
                  });
                }
              }}
            >
              <Text style={styles.reqPopupOutlineBtnText}>view details</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

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
          {/* Floating close button above the sheet */}
          <View style={styles.closeFabRow}>
            <TouchableOpacity
              style={styles.closeFab}
              onPress={() => setFilterOpen(false)}
              activeOpacity={0.85}
            >
              <Ionicons name="close" size={20} color="#1F1F1F" />
            </TouchableOpacity>
          </View>

          <View style={styles.sheet}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 8 }}
              bounces={false}
            >
              <Text style={styles.sheetTitle}>Filter by</Text>

              <Text style={styles.sheetSection}>Role</Text>
              {ROLE_OPTIONS.map((role) =>
                renderCheckRow(
                  role,
                  isOptionChecked(role, selectedRoles, ROLE_VALUES),
                  () => toggleRole(role)
                )
              )}

              <View style={styles.sheetDivider} />

              <Text style={styles.sheetSection}>Sports</Text>
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
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 0,
    backgroundColor: "#FFFFFF",
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
  // Tabs
  tabsWrap: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: "#FFFFFF",
  },
  tabs: {
    flexDirection: "row",
    backgroundColor: "#F7F7F7",
    borderRadius: 73,
    padding: 4,
    borderColor: "#F0F0F0",
    borderWidth: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 30,
  },
  tabActive: {
    backgroundColor: "#15A765",
  },
  tabText: {
    fontSize: 16,
    fontFamily: "Montserrat_500Medium",
    color: "#333333",
  },
  tabTextActive: {
    color: "#FFFFFF",
  },
  scroll: {
    flex: 1,
  },
  // Hero
  heroSection: {
    backgroundColor: "#FFF7F0",
    paddingHorizontal: 32,
    paddingVertical: 12,

  },
  heroTitle: {
    fontSize: 20,
    fontFamily: "Montserrat_600SemiBold",
    color: "#1A181B",
    marginBottom: 12,
  },
  heroCardsRow: {
    flexDirection: "row",
    gap: 16,
  },
  browseJobCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#F26B1F",
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  browseJobIconWrap: {
    marginBottom: 8,
  },
  browseJobTitle: {
    fontSize: 16,
    fontFamily: "Poppins_500medium",
    color: "#FF8D28",
    marginBottom: 0,
  },
  browseJobSubtitle: {
    fontSize: 12,
    fontFamily: "Poppins_400regular",
    color: "#FF8D28",
  },
  quickHireWrap: {
    flex: 1,
    borderRadius: 16,
    overflow: "hidden",
  },
  quickHireCard: {
    flex: 1,
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
  },
  quickHireIconWrap: {
    marginBottom: 8,
  },
  quickHireTitle: {
    fontSize: 16,
    fontFamily: "Poppins_500medium",
    color: "#FFFFFF",
    marginBottom: 0,
  },
  quickHireSubtitle: {
    fontSize: 12,
    fontFamily: "Poppins_400regular",
    color: "#FFFFFF",
  },
  heroHelper: {
    fontSize: 14,
    fontFamily: "Poppins_400regular",
    color: "#666666",
    textAlign: "center",
    marginTop: 10,
  },
  // Search row
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 10,
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
    marginLeft: 16,
    fontSize: 14,
    fontFamily: "Montserrat_500Regular",
    color: "#666666",
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
  // Chips
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
  // Jobs list
  jobsList: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },
  jobCard: {
    flexDirection: "column",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EEEEFF",
    padding: 16,
    minHeight: 170,
    shadowColor: "#8B96BA",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
  },
  jobLogoWrap: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: "#F5F5F5",
    borderColor: "#EEEEFF",
    borderWidth: 1,
    overflow: "hidden",
    marginRight: 12,
  },
  jobLogo: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  jobContent: {
    flex: 1,
  },
  jobTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 17.5,
  },
  jobTitle: {
    fontSize: 20,
    fontFamily: "Montserrat_500Medium",
    color: "#0A0A0A",
    marginTop: 9,
  },
  jobVenue: {
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
    marginTop: 9,
  },
  sportBadgeText: {
    fontFamily: "Poppins_400regular",
    fontSize: 12,
    lineHeight: 16,
    color: "#666666",
    includeFontPadding: false,
    textAlignVertical: "center",
  },

  jobMidRow: {
    flexDirection: "row",
  },
  jobManager: {
    fontSize: 16,
    fontFamily: "Montserrat_500Medium",
    color: "#0A0A0A",
  },
  jobLocation: {
    fontSize: 14,
    fontFamily: "Montserrat_500Medium",
    color: "#453E4C",
    marginTop: 4,
  },
  jobDate: {
    fontSize: 14,
    fontFamily: "Montserrat_500Medium",
    color: "#666666",
  },
  jobBottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  jobApplicants: {
    fontSize: 12,
    fontFamily: "Montserrat_500Medium",
    color: "#666666",
  },
  rateRow: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  jobRate: {
    fontSize: 16,
    fontFamily: "Montserrat_600SemiBold",
    color: "#258C3F",
  },
  jobRateUnit: {
    fontSize: 12,
    fontFamily: "Montserrat_400Regular",
    color: "#453E4C",
  },
  // Filter modal
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
    paddingBottom: 16,
    maxHeight: Dimensions.get("window").height * 0.78,
  },
  sheetTitle: {
    fontSize: 14,
    fontFamily: "Poppins_500Medium",
    color: "#333333",
    marginBottom: 8,
  },
  sheetSection: {
    fontSize: 16,
    fontFamily: "Montserrat_600SemiBold",
    color: "#666666",
    marginBottom: 8,
  },
  sheetDivider: {
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
  // Application tab
  subTabsRow: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    gap: 16,
  },
  subTab: {
    flex: 1,
    paddingTop: 0,
    gap: 4
  },
  subTabInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    gap: 8,
  },
  subTabIconWrap: {
    position: "relative",
  },
  subTabDot: {
    position: "absolute",
    top: -8,
    right: -90,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#E53935",
  },
  subTabText: {
    fontFamily: "Montserrat_500Medium",
    fontWeight: "500",
    fontSize: 16,
    lineHeight: 16,
    letterSpacing: 0,
    color: "#666666",
  },
  subTabTextActive: {
    color: "#15A765",
  },
  subTabUnderline: {
    height: 3,
    backgroundColor: "#15A765",
    borderRadius: 2,
    marginHorizontal: 4,
    marginBottom: -1,
  },
  subTabsDivider: {
    height: 1,
    backgroundColor: "#DDDDDD",
  },
  statsBg: {
    backgroundColor: "#F9FAFB",
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
  },
  statBox: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#EEF1FA",
  },
  statValue: {
    fontSize: 20,
    fontFamily: "Montserrat_600SemiBold",
    color: "#333333",
  },
  statLabel: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    color: "#666666",
    marginTop: 4,
  },
  appList: {
    paddingHorizontal: 0,
    paddingTop: 10,
    gap: 12,
  },
  appCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EEEEFF",
    padding: 16,
    height: 142,
    width: 375,
    maxWidth: "100%",
    alignSelf: "center",
    justifyContent: "space-between",
    shadowColor: "#8B96BA",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
    opacity: 1,
  },
  appTopRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  appLogoWrap: {
    width: 60,
    height: 60,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#F5F5F5",
    marginRight: 13,
    borderColor: "#EEEEFF",
  },
  appLogo: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  appTitle: {
    fontSize: 20,
    fontFamily: "Montserrat_500Medium",
    color: "#0A0A0A",
  },
  appVenue: {
    fontSize: 14,
    fontFamily: "Montserrat_500Medium",
    color: "#453E4C",

  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: "#DBEAFE",
  },
  statusBadgeText: {
    fontSize: 12,
    fontFamily: "Poppins_500Medium",
    color: "#1447E6",
  },

  appBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 0,
  },
  appAppliedOn: {
    fontSize: 14,
    fontFamily: "Montserrat_500Medium",
    color: "#333333",
    marginTop: 8,
  },
  appRateRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: 0,
  },
  appRate: {
    fontSize: 16,
    fontFamily: "Montserrat_600SemiBold",
    color: "#258C3F",
  },
  appRateUnit: {
    fontSize: 12,
    fontFamily: "Montserrat_400Regular",
    color: "#453E4C",
  },
  viewDetailsLink: {
    fontSize: 12,
    fontFamily: "Montserrat_400Regular",
    color: "#1E88F5",
    textDecorationLine: "underline",
    textDecorationStyle: "solid",
  },
  // Requests sub-tab
  infoBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#F0F8FF",
    borderRadius: 16,
    padding: 16,
  },
  infoTitle: {
    fontSize: 14,
    fontFamily: "Montserrat_600SemiBold",
    color: "#0088FF",
    marginBottom: 2,
  },
  infoMessage: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    color: "#0088FF",
    lineHeight: 17,
  },
  reqCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EEEEFF",
    padding: 16,
    height: 290,
    width: 375,
    maxWidth: "100%",
    alignSelf: "center",
    justifyContent: "space-between",
    shadowColor: "#8B96BA",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
    opacity: 1,
  },
  reqHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  reqTitle: {
    fontFamily: "Montserrat_500Medium",
    fontSize: 20,
    lineHeight: 24,
    letterSpacing: -0.31,
    color: "#1A181B",
    marginBottom: 2,
  },
  reqFrom: {
    fontFamily: "Montserrat_500Medium",
    fontSize: 14,
    lineHeight: 14,
    letterSpacing: 0,
    color: "#666666",
  },
  newBadge: {
    backgroundColor: "#E5F3FF",
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 25,
  },
  newBadgeText: {
    fontSize: 12,
    fontFamily: "Poppins_500Medium",
    color: "#007DEB",
  },
  reqMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 0,
  },
  reqMetaLabel: {
    fontFamily: "Poppins_400Regular",
    fontWeight: "400",
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0,
    color: "#666666",
    marginLeft: 8,
    textAlignVertical: "center",
  },
  reqMetaValue: {
    fontFamily: "Poppins_400Regular",
    fontWeight: "400",
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0,
    color: "#1A181B",
    marginLeft: 4,
    flexShrink: 1,
    textAlignVertical: "center",
  },
  reqRate: {
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "600",
    fontSize: 20,
    lineHeight: 20,
    letterSpacing: 0,
    color: "#258C3F",
    marginTop: 10,
  },
  reqActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginTop: 16,
  },
  rejectBtn: {
    width: 48,
    height: 44,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#FF383C",
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  acceptBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#15A765",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  acceptBtnText: {
    fontSize: 16,
    fontFamily: "Montserrat_500Medium",
    color: "#FFFFFF",
  },
  // Sub-tab empty state
  subTabEmpty: {
    paddingTop: 80,
    alignItems: "center",
  },
  subTabEmptyText: {
    fontSize: 14,
    fontFamily: "Montserrat_500Medium",
    color: "#9A9A9A",
    marginTop: 12,
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
  // My Profile - Dashboard
  dashToggleWrap: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
    backgroundColor: "#FFFFFF",
  },
  dashToggle: {
    flexDirection: "row",
    backgroundColor: "#F7F7F7",
    borderRadius: 73,
    padding: 4,
    borderColor: "#F0F0F0",
    borderWidth: 1,
  },
  dashToggleBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 30,
  },
  dashToggleBtnActive: {
    backgroundColor: "#15A765",
  },
  dashToggleText: {
    fontSize: 16,
    fontFamily: "Montserrat_500Medium",
    color: "#333333",
  },
  dashToggleTextActive: {
    color: "#FFFFFF",
  },
  profileStatsWrap: {
    backgroundColor: "#F9FAFB",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  profileStatsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  profileStatCard: {
    width: "48.5%",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EEF1FA",
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  profileStatLabel: {
    fontFamily: "Montserrat_400Regular",
    fontWeight: "400",
    fontSize: 16,
    lineHeight: 16,
    letterSpacing: 0,
    color: "#333333",
    marginBottom: 6,
  },
  profileStatValueRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  profileStatValue: {
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "600",
    fontSize: 20,
    lineHeight: 20,
    letterSpacing: 0,
    color: "#15A765",
  },
  profileStatSub: {
    fontFamily: "Montserrat_400Regular",
    fontWeight: "400",
    fontSize: 12,
    lineHeight: 12,
    letterSpacing: 0,
    color: "#666666",
  },
  jobTabsRow: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 22,
  },
  jobTab: {
    paddingBottom: 0,
  },
  jobTabText: {
    fontFamily: "Montserrat_500Medium",
    fontWeight: "500",
    fontSize: 16,
    lineHeight: 16,
    letterSpacing: 0,
    color: "#6F6F6F",
    paddingTop: 10,
    paddingBottom: 10,
  },
  jobTabTextActive: {
    color: "#15A765",
  },
  jobTabUnderline: {
    height: 3,
    backgroundColor: "#15A765",
    borderRadius: 2,
    marginTop: 0,
    marginBottom: -1,
  },
  profileJobsList: {
    paddingHorizontal: 16,
    paddingTop: 14,
    gap: 14,
  },
  profileJobCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EEEEFF",
    padding: 16,
    shadowColor: "#8B96BA",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 3,
  },
  profileJobTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  profileJobTitle: {
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "600",
    fontSize: 20,
    lineHeight: 20,
    letterSpacing: -0.31,
    color: "#1A181B",
  },
  profileJobEvent: {
    fontFamily: "Montserrat_400Regular",
    fontWeight: "400",
    fontSize: 14,
    lineHeight: 14,
    letterSpacing: 0,
    color: "#333333",
    marginTop: 4,
  },
  profileJobOrg: {
    fontFamily: "Montserrat_400Regular",
    fontWeight: "400",
    fontSize: 12,
    lineHeight: 12,
    letterSpacing: 0,
    color: "#666666",
    marginTop: 2,
    marginBottom: 12,
  },
  profileStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
  },
  profileStatusText: {
    fontFamily: "Poppins_500Medium",
    fontWeight: "500",
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0,
    textAlignVertical: "center",
  },
  profileJobMeta: {
    marginTop: 12,
    gap: 6,
  },
  profileJobMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  profileJobMetaText: {
    fontFamily: "Poppins_400Regular",
    fontWeight: "400",
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0,
    color: "#1A181B",
    textAlignVertical: "center",
  },
  profileJobRate: {
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "600",
    fontSize: 20,
    lineHeight: 20,
    letterSpacing: 0,
    color: "#15A765",
    marginTop: 12,
    marginBottom: 12,
  },
  profileJobActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  viewDetailsBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#F2F4F7",
    justifyContent: "center",
    alignItems: "center",
  },
  viewDetailsBtnText: {
    fontSize: 14,
    fontFamily: "Montserrat_600SemiBold",
    color: "#15A765",
  },
  chatBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#15A765",
    justifyContent: "center",
    alignItems: "center",
  },
  chatBtnText: {
    fontSize: 14,
    fontFamily: "Montserrat_600SemiBold",
    color: "#FFFFFF",
  },
  timeLeftText: {
    fontSize: 12,
    fontFamily: "Montserrat_500Medium",
    color: "#7A7A7A",
  },
  upcomingDetailsBtn: {
    marginTop: 14,
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#15A765",
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  upcomingDetailsBtnText: {
    fontSize: 16,
    fontFamily: "Montserrat_600SemiBold",
    color: "#15A765",
  },
  // Completed job card
  completedTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  completedRate: {
    fontSize: 18,
    fontFamily: "Montserrat_700Bold",
    color: "#258C3F",
  },
  completedEarnedLabel: {
    fontSize: 12,
    fontFamily: "Montserrat_400Regular",
    color: "#7A7A7A",
    marginTop: 2,
  },
  completedRatingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
  },
  completedRatingText: {
    fontSize: 14,
    fontFamily: "Montserrat_700Bold",
    color: "#1F1F1F",
  },
  completedReviewWrap: {
    backgroundColor: "#F4F5F7",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 12,
  },
  completedReviewText: {
    fontSize: 13,
    fontFamily: "Montserrat_500Medium",
    fontStyle: "italic",
    color: "#4A4A4A",
  },

  // -- My Profile - Profile tab --
  profSportRow: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 4,
    gap: 8,
  },
  profSportChip: {
    paddingHorizontal: 14,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F2F2F2",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  profSportChipActive: {
    backgroundColor: "#E6F7EE",
  },
  profSportChipText: {
    fontFamily: "Montserrat_500Medium",
    fontSize: 13,
    color: "#7A7A7A",
  },
  profSportChipTextActive: {
    color: "#15A765",
  },
  profCardsList: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 24,
    gap: 14,
  },
  profCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  profCardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  profCardTitle: {
    fontFamily: "Montserrat_700Bold",
    fontWeight: "700",
    fontSize: 18,
    lineHeight: 24,
    color: "#1F1F1F",
  },
  profCardSubtitle: {
    fontFamily: "Montserrat_400Regular",
    fontSize: 13,
    color: "#6F6F6F",
    marginTop: 2,
  },
  profEditBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#F2F2F2",
    alignItems: "center",
    justifyContent: "center",
  },
  profStatsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: 16,
    marginBottom: 18,
    paddingHorizontal: 4,
  },
  profStatCol: {
    flex: 1,
    alignItems: "center",
  },
  profStatValue: {
    fontFamily: "Montserrat_700Bold",
    fontWeight: "700",
    fontSize: 18,
    color: "#1F1F1F",
  },
  profStatLabel: {
    fontFamily: "Montserrat_400Regular",
    fontSize: 12,
    color: "#7A7A7A",
    marginTop: 2,
  },
  profActionBtn: {
    height: 48,
    borderRadius: 24,
    backgroundColor: "#F2F2F2",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
    position: "relative",
  },
  profActionBtnActive: {
    backgroundColor: "#E6F7EE",
  },
  profActionText: {
    fontFamily: "Montserrat_500Medium",
    fontWeight: "500",
    fontSize: 15,
    color: "#5C5C5C",
  },
  profActionTextActive: {
    color: "#15A765",
  },
  profActionIconDark: {
    position: "absolute",
    left: 6,
    top: 6,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#5C5C5C",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  profActionIconGreen: {
    position: "absolute",
    right: 6,
    top: 6,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#15A765",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  createProfileBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#EFEFEF",
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  createProfileBtn: {
    height: 52,
    borderRadius: 12,
    backgroundColor: "#15A765",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  createProfileBtnText: {
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "600",
    fontSize: 15,
    color: "#FFFFFF",
  },
  // Activate Profile confirmation modal
  activateBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  activateCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingTop: 28,
    paddingHorizontal: 24,
    paddingBottom: 22,
    alignItems: "stretch",
  },
  activateIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#15A765",
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginBottom: 18,
  },
  activateTitle: {
    fontSize: 20,
    fontFamily: "Montserrat_700Bold",
    color: "#1F1F1F",
    marginBottom: 12,
  },
  activateBody: {
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
    color: "#6F6F6F",
    lineHeight: 20,
    marginBottom: 10,
  },
  activateList: {
    marginBottom: 12,
    gap: 4,
  },
  activateBullet: {
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
    color: "#6F6F6F",
    lineHeight: 22,
  },
  activateSwitchNote: {
    fontSize: 14,
    fontFamily: "Montserrat_600SemiBold",
    color: "#1F1F1F",
    marginBottom: 18,
  },
  activateBtnRow: {
    flexDirection: "row",
    gap: 12,
  },
  activateCancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#D6D6D6",
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  activateCancelText: {
    fontSize: 15,
    fontFamily: "Montserrat_500Medium",
    color: "#5C5C5C",
  },
  activateConfirmBtn: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#15A765",
    justifyContent: "center",
    alignItems: "center",
  },
  activateConfirmText: {
    fontSize: 15,
    fontFamily: "Montserrat_500Medium",
    color: "#FFFFFF",
  },
  deactivateIconWrap: {
    alignSelf: "center",
    marginBottom: 18,
  },
  deactivateConfirmBtn: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FF2D55",
    justifyContent: "center",
    alignItems: "center",
  },
  // Swipe-to-toggle pill
  swipeTrack: {
    height: 48,
    borderRadius: 24,
    backgroundColor: "#F2F2F2",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
    position: "relative",
    overflow: "hidden",
  },
  swipeTrackActive: {
    backgroundColor: "#E6F7EE",
  },
  swipeLabel: {
    fontFamily: "Montserrat_500Medium",
    fontWeight: "500",
    fontSize: 15,
    color: "#5C5C5C",
  },
  swipeLabelActive: {
    color: "#15A765",
  },
  swipeKnob: {
    position: "absolute",
    left: 6,
    top: 6,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#5C5C5C",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  swipeKnobActive: {
    backgroundColor: "#15A765",
  },
  // Request Accept / Reject popups
  reqPopupBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 28,
  },
  reqPopupCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingTop: 32,
    paddingHorizontal: 24,
    paddingBottom: 22,
    alignItems: "stretch",
    position: "relative",
  },
  reqPopupCloseBtn: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  reqAcceptIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#15A765",
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginBottom: 14,
  },
  reqRejectIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#FF2D55",
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginBottom: 14,
  },
  reqPopupTitle: {
    fontSize: 20,
    fontFamily: "Montserrat_600SemiBold",
    color: "#333333",
    marginBottom: 8,
  },
  reqPopupBody: {
    fontSize: 16,
    fontFamily: "Poppins_400Regular",
    color: "#6F6F6F",
    lineHeight: 20,
    marginBottom: 0,
  },
  reqPopupList: {
    marginTop: 4,
    marginBottom: 16,
    gap: 0,
  },
  reqPopupBullet: {
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
    color: "#666666",
    lineHeight: 22,
  },
  reqPopupOutlineBtn: {
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D6D6D6",
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  reqPopupOutlineBtnText: {
    fontSize: 15,
    fontFamily: "Montserrat_500Medium",
    color: "#5C5C5C",
  },
});

export default BrowseJobs;
