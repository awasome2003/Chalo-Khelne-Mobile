import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  TextInput,
  Modal,
  Alert,
  Image,
} from "react-native";
import { Ionicons, Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SvgUri } from "react-native-svg";
import { Asset } from "expo-asset";
import * as DocumentPicker from "expo-document-picker";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "../../context/AuthContext";
import JOBS from "../../api/jobs";

const { width } = Dimensions.get("window");

// Load local SVG assets
const whistleUri = Asset.fromModule(require("../../../assets/whistle .svg")).uri;
const scorerUri = Asset.fromModule(require("../../../assets/scorer.svg")).uri;
const cameramanUri = Asset.fromModule(require("../../../assets/cameraman.svg")).uri;
const commentatorUri = Asset.fromModule(require("../../../assets/commentator.svg")).uri;
const eventstaffUri = Asset.fromModule(require("../../../assets/eventstaff.svg")).uri;
const physiotherapyUri = Asset.fromModule(require("../../../assets/Physiotherapy.svg")).uri;
const photographerUri = Asset.fromModule(require("../../../assets/photographer.svg")).uri;
const groundstaffUri = Asset.fromModule(require("../../../assets/Groundstaff.svg")).uri;
const partyUri = Asset.fromModule(require("../../../assets/party.svg")).uri;
const coachUri = Asset.fromModule(require("../../../assets/coach.svg")).uri;
const lightbulbUri = Asset.fromModule(require("../../../assets/lightbulb.svg")).uri;
const editUri = Asset.fromModule(require("../../../assets/Edit.svg")).uri;
const flexibleUri = Asset.fromModule(require("../../../assets/flexible.svg")).uri;
const calendarStarUri = Asset.fromModule(require("../../../assets/calendar-star 1.svg")).uri;

const ROLES = [
  {
    id: "referee",
    label: "Referee/ Umpire",
    uri: whistleUri,
  },
  {
    id: "coach",
    label: "Trainer/ Coach",
    uri: coachUri,
  },
  {
    id: "scorer",
    label: "Scorer",
    uri: scorerUri,
  },
  {
    id: "cameraman",
    label: "Cameraman",
    uri: cameramanUri,
  },
  {
    id: "commentator",
    label: "Commentator",
    uri: commentatorUri,
  },
  {
    id: "event_staff",
    label: "Event Staff",
    uri: eventstaffUri,
  },
  {
    id: "physiotherapist",
    label: "Physiotherapist",
    uri: physiotherapyUri,
  },
  {
    id: "photographer",
    label: "Photographer",
    uri: photographerUri,
  },
  {
    id: "ground_staff",
    label: "Ground Staff",
    uri: groundstaffUri,
  },
];

const SPORTS_OPTIONS = [
  "Cricket",
  "Football",
  "Badminton",
  "Basketball",
  "Table Tennis",
  "Tennis",
  "Volleyball",
  "Hockey",
  "Kabaddi",
  "Swimming",
];

const EXPERIENCE_LEVELS = [
  { id: "fresher", label: "Fresher", duration: "0-1 year" },
  { id: "intermediate", label: "Intermediate", duration: "1-3 years" },
  { id: "professional", label: "Professional", duration: "3-5 years" },
  { id: "experienced", label: "Experienced", duration: "5+ Years" },
];

const AVAILABILITY_OPTIONS = [
  { id: "full_time", label: "Full Time", icon: "briefcase-outline" },
  { id: "part_time", label: "Part Time", icon: "time-outline" },
  { id: "weekends_only", label: "Weekends Only", icon: "calendar-outline" },
  { id: "event_based", label: "Event Based", icon: "star-outline" },
  { id: "flexible_hours", label: "Flexible Hours", icon: "refresh-circle-outline" },
];

const RATE_TYPES = [
  { id: "per_hour", label: "Per Hour", icon: "time-outline" },
  { id: "per_match", label: "Per Match", icon: "trophy-outline" },
  { id: "per_day", label: "Per Day", icon: "calendar-outline" },
];

const CreateProfessionalProfileScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  // State management
  const [submitting, setSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedRole, setSelectedRole] = useState(null);
  const [selectedSports, setSelectedSports] = useState(["Cricket"]); // Cricket pre-selected to match mockup
  const [city, setCity] = useState("");
  const [selectedExperience, setSelectedExperience] = useState(null);
  const [selectedAvailability, setSelectedAvailability] = useState([]);
  const [selectedRateType, setSelectedRateType] = useState(null);
  const [rateAmount, setRateAmount] = useState("");
  const [experienceText, setExperienceText] = useState("");
  const [certificateName, setCertificateName] = useState("");
  const [certificateFile, setCertificateFile] = useState(null);
  const [certificates, setCertificates] = useState([]); // up to 3 files
  const [openToNegotiation, setOpenToNegotiation] = useState(false);
  const [successVisible, setSuccessVisible] = useState(false);

  const roleNameMap = {
    referee: "Referee",
    coach: "Trainer",
    scorer: "Scorer",
    cameraman: "Cameraman",
    commentator: "Commentator",
    event_staff: "Event Staff",
    physiotherapist: "Physiotherapist",
    photographer: "Photographer",
    ground_staff: "Ground Staff",
  };

  const pickCertificate = async () => {
    if (certificates.length >= 3) {
      Alert.alert("Limit reached", "You can upload up to 3 certificates.");
      return;
    }
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/*"],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled) return;
      const file = result.assets?.[0];
      if (!file) return;
      if (file.size && file.size > 5 * 1024 * 1024) {
        Alert.alert("File too large", "Please choose a file under 5 MB.");
        return;
      }
      setCertificates((prev) => [...prev, file]);
    } catch (err) {
      Alert.alert("Upload failed", err?.message || "Could not pick file.");
    }
  };

  const removeCertificate = (idx) => {
    setCertificates((prev) => prev.filter((_, i) => i !== idx));
  };

  const toggleAvailability = (id) => {
    setSelectedAvailability((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      navigation.goBack();
    }
  };

  const handleContinue = () => {
    if (currentStep === 1) {
      if (selectedRole) setCurrentStep(2);
    } else if (currentStep === 2) {
      setCurrentStep(3);
    } else if (currentStep === 3) {
      if (selectedExperience) setCurrentStep(4);
    } else if (currentStep === 4) {
      if (selectedRateType && rateAmount.trim() && experienceText.trim()) setCurrentStep(5);
    } else if (currentStep === 5) {
      submitProfile();
    }
  };

  const submitProfile = async () => {
    if (submitting) return;
    const userId = user?._id || user?.id;
    if (!userId) {
      Alert.alert("Not signed in", "Please sign in again to create a profile.");
      return;
    }
    // Collapse the index-tagged sport selections back to unique sport names
    const sports = [
      ...new Set(selectedSports.map((s) => (s.includes("-") ? s.split("-")[0] : s))),
    ];
    const payload = {
      userId,
      role: selectedRole,
      sports,
      city,
      experienceLevel: selectedExperience || "intermediate",
      availability: selectedAvailability,
      rateType: selectedRateType || "per_hour",
      rateAmount: Number(rateAmount) || 0,
      negotiable: openToNegotiation,
      about: experienceText,
      certificates: certificates.map((c) => ({
        name: c.name || "",
        uri: c.uri || "",
        mimeType: c.mimeType || "",
      })),
    };
    try {
      setSubmitting(true);
      const token = await AsyncStorage.getItem("auth_token");
      const res = await axios.post(JOBS.CREATE_PROFILE, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data?.success) {
        setSuccessVisible(true);
      } else {
        Alert.alert("Could not save", res.data?.message || "Please try again.");
      }
    } catch (err) {
      Alert.alert("Could not save", err?.response?.data?.message || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleSportSelection = (sport, index) => {
    // Unique identifier combining name and index to support duplicate entries like "Tennis"
    const identifier = `${sport}-${index}`;
    setSelectedSports((prev) =>
      prev.includes(identifier)
        ? prev.filter((x) => x !== identifier)
        : [...prev, identifier]
    );
  };

  const isSportSelected = (sport, index) => {
    const identifier = `${sport}-${index}`;
    // Support pre-selecting "Cricket" when empty or initial load
    if (sport === "Cricket" && selectedSports.includes("Cricket")) {
      return true;
    }
    return selectedSports.includes(identifier) || selectedSports.includes(sport);
  };

  const renderIcon = (role) => {
    const color = selectedRole === role.id ? "#FF8D28" : "#333333";
    return (
      <SvgUri
        uri={role.uri}
        width={24}
        height={24}
        color={color}
      />
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleBack}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={24} color="#0A0A0A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Professional Profile</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Stepper Progress */}
        <View style={styles.stepperContainer}>
          {/* Step 1 */}
          {currentStep > 1 ? (
            <View style={styles.completedStepCircle}>
              <Ionicons name="checkmark" size={18} color="#FFFFFF" />
            </View>
          ) : (
            <View style={styles.activeStepOuterRing}>
              <View style={styles.activeStepCircle}>
                <Text style={styles.activeStepText}>1</Text>
              </View>
            </View>
          )}

          <View style={[styles.stepperLine, currentStep > 1 && styles.stepperLineCompleted]} />

          {/* Step 2 */}
          {currentStep > 2 ? (
            <View style={styles.completedStepCircle}>
              <Ionicons name="checkmark" size={18} color="#FFFFFF" />
            </View>
          ) : currentStep === 2 ? (
            <View style={styles.activeStepOuterRing}>
              <View style={styles.activeStepCircle}>
                <Text style={styles.activeStepText}>2</Text>
              </View>
            </View>
          ) : (
            <View style={styles.inactiveStepCircle}>
              <Text style={styles.inactiveStepText}>2</Text>
            </View>
          )}

          <View style={[styles.stepperLine, currentStep > 2 && styles.stepperLineCompleted]} />

          {/* Step 3 */}
          {currentStep > 3 ? (
            <View style={styles.completedStepCircle}>
              <Ionicons name="checkmark" size={18} color="#FFFFFF" />
            </View>
          ) : currentStep === 3 ? (
            <View style={styles.activeStepOuterRing}>
              <View style={styles.activeStepCircle}>
                <Text style={styles.activeStepText}>3</Text>
              </View>
            </View>
          ) : (
            <View style={styles.inactiveStepCircle}>
              <Text style={styles.inactiveStepText}>3</Text>
            </View>
          )}

          <View style={[styles.stepperLine, currentStep > 3 && styles.stepperLineCompleted]} />

          {/* Step 4 */}
          {currentStep > 4 ? (
            <View style={styles.completedStepCircle}>
              <Ionicons name="checkmark" size={18} color="#FFFFFF" />
            </View>
          ) : currentStep === 4 ? (
            <View style={styles.activeStepOuterRing}>
              <View style={styles.activeStepCircle}>
                <Text style={styles.activeStepText}>4</Text>
              </View>
            </View>
          ) : (
            <View style={styles.inactiveStepCircle}>
              <Text style={styles.inactiveStepText}>4</Text>
            </View>
          )}

          <View style={[styles.stepperLine, currentStep > 4 && styles.stepperLineCompleted]} />

          {/* Step 5 */}
          {currentStep === 5 ? (
            <View style={styles.activeStepOuterRing}>
              <View style={styles.activeStepCircle}>
                <Text style={styles.activeStepText}>5</Text>
              </View>
            </View>
          ) : (
            <View style={styles.inactiveStepCircle}>
              <Text style={styles.inactiveStepText}>5</Text>
            </View>
          )}
        </View>

        {currentStep === 1 && (
          <>
            {/* Step 1 Heading */}
            <View style={styles.headingSection}>
              <Text style={styles.titleText}>Select Your Professional Role</Text>
              <Text style={styles.subtitleText}>Choose the primary service you want to offer</Text>
            </View>

            {/* Grid of Roles */}
            <View style={styles.gridContainer}>
              {ROLES.map((role) => {
                const isSelected = selectedRole === role.id;
                return (
                  <TouchableOpacity
                    key={role.id}
                    style={[
                      styles.roleCard,
                      isSelected && styles.roleCardSelected,
                    ]}
                    onPress={() => setSelectedRole(role.id)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.iconContainer}>{renderIcon(role)}</View>
                    <Text
                      style={[
                        styles.roleLabel,
                        isSelected && styles.roleLabelSelected,
                      ]}
                    >
                      {role.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Tip Box */}
            <View style={styles.tipBox}>
              <SvgUri
                uri={lightbulbUri}
                width={20}
                height={20}
                color="#0088FF"
                style={styles.tipIcon}
              />
              <Text style={styles.tipText}>
                <Text style={styles.tipTextBold}>Tip: </Text>
                You can create multiple professional profiles for different roles.
              </Text>
            </View>
          </>
        )}

        {currentStep === 2 && (
          <>
            {/* Step 2 Heading */}
            <View style={styles.headingSection}>
              <Text style={styles.titleText}>Sports & Location</Text>
              <Text style={styles.subtitleText}>Select sports you can work with and your city</Text>
            </View>

            {/* Languages Known Section (Chips) */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Sports Known</Text>
                <Text style={styles.selectedCountText}>
                  {selectedSports.length} selected
                </Text>
              </View>

              <View style={styles.chipsContainer}>
                {SPORTS_OPTIONS.map((sport, index) => {
                  const isSelected = isSportSelected(sport, index);
                  return (
                    <TouchableOpacity
                      key={`${sport}-${index}`}
                      style={[
                        styles.chipButton,
                        isSelected && styles.chipButtonActive,
                      ]}
                      onPress={() => toggleSportSelection(sport, index)}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          isSelected && styles.chipTextActive,
                        ]}
                      >
                        {sport}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Location Input Section */}
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Location</Text>
              <TextInput
                style={styles.cityInput}
                placeholder="Enter your city"
                placeholderTextColor="#9CA3AF"
                value={city}
                onChangeText={setCity}
              />
            </View>
          </>
        )}

        {currentStep === 3 && (
          <>
            {/* Step 3 Heading */}
            <View style={styles.headingSection}>
              <Text style={styles.titleText}>Experience & Availability</Text>
              <Text style={styles.subtitleText}>
                Tell us about your experience level and availability
              </Text>
            </View>

            {/* Experience level */}
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Experience level</Text>
              <View style={{ gap: 12 }}>
                {EXPERIENCE_LEVELS.map((level) => {
                  const isSelected = selectedExperience === level.id;
                  return (
                    <TouchableOpacity
                      key={level.id}
                      style={[
                        styles.expCard,
                        isSelected && styles.expCardSelected,
                      ]}
                      activeOpacity={0.85}
                      onPress={() => setSelectedExperience(level.id)}
                    >
                      <Text
                        style={[
                          styles.expTitle,
                          isSelected && styles.expTitleSelected,
                        ]}
                      >
                        {level.label}
                      </Text>
                      <Text style={styles.expDuration}>{level.duration}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Availability */}
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Availability</Text>
              <View style={styles.availGrid}>
                {AVAILABILITY_OPTIONS.map((opt) => {
                  const isSelected = selectedAvailability.includes(opt.id);
                  return (
                    <TouchableOpacity
                      key={opt.id}
                      style={[
                        styles.availCard,
                        isSelected && styles.availCardSelected,
                      ]}
                      activeOpacity={0.85}
                      onPress={() => toggleAvailability(opt.id)}
                    >
                      {opt.id === "flexible_hours" ? (
                        <SvgUri
                          uri={flexibleUri}
                          width={24}
                          height={24}
                          color={isSelected ? "#FF8D28" : "#666666"}
                        />
                      ) : opt.id === "event_based" ? (
                        <SvgUri
                          uri={calendarStarUri}
                          width={24}
                          height={24}
                          color={isSelected ? "#FF8D28" : "#666666"}
                        />
                      ) : (
                        <Ionicons
                          name={opt.icon}
                          size={24}
                          color={isSelected ? "#FF8D28" : "#666666"}
                        />
                      )}
                      <Text
                        style={[
                          styles.availLabel,
                          isSelected && styles.availLabelSelected,
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </>
        )}

        {currentStep === 4 && (
          <>
            {/* Step 4 Heading */}
            <View style={styles.headingSection}>
              <Text style={styles.titleText}>Pricing Setup</Text>
              <Text style={styles.subtitleText}>Set your rates & pricing structure</Text>
            </View>

            {/* Rate Type */}
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Rate Type</Text>
              <View style={styles.rateTypeRow}>
                {RATE_TYPES.map((rt) => {
                  const isSelected = selectedRateType === rt.id;
                  return (
                    <TouchableOpacity
                      key={rt.id}
                      style={[
                        styles.rateTypeCard,
                        isSelected && styles.rateTypeCardSelected,
                      ]}
                      activeOpacity={0.85}
                      onPress={() => setSelectedRateType(rt.id)}
                    >
                      <Ionicons
                        name={rt.icon}
                        size={26}
                        color={isSelected ? "#FF8D28" : "#4B5563"}
                      />
                      <Text
                        style={[
                          styles.rateTypeLabel,
                          isSelected && styles.rateTypeLabelSelected,
                        ]}
                      >
                        {rt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Your Rate */}
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Your Rate</Text>
              <TextInput
                style={styles.rateInput}
                placeholder="Enter amount in ₹"
                placeholderTextColor="#9CA3AF"
                keyboardType="numeric"
                value={rateAmount}
                onChangeText={setRateAmount}
              />
            </View>

            {/* Open to Negotiation banner */}
            <TouchableOpacity
              style={styles.negotiationBanner}
              activeOpacity={0.85}
              onPress={() => setOpenToNegotiation((v) => !v)}
            >
              <View style={[styles.negotiationCheckbox, openToNegotiation && styles.negotiationCheckboxChecked]}>
                {openToNegotiation && (
                  <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.negotiationTitle}>Open to Negotiation</Text>
                <Text style={styles.negotiationBody}>
                  Allow clients to discuss and negotiate rates based on event requirements
                </Text>
              </View>
            </TouchableOpacity>

            {/* Experience & Portfolio sub-heading */}
            <View style={[styles.headingSection, { marginBottom: 12 }]}>
              <Text style={styles.titleText}>Experience & Portfolio</Text>
              <Text style={styles.subtitleText}>Add details to build trust and credibility</Text>
            </View>

            {/* Tell us about your experience */}
            <View style={[styles.sectionContainer, { marginBottom: 16 }]}>
              <Text style={styles.sectionTitle}>Tell us about your experience</Text>
              <TextInput
                style={styles.experienceTextarea}
                placeholder={"Describe your experience, notable events you've worked on, skills, etc."}
                placeholderTextColor="#9CA3AF"
                multiline
                textAlignVertical="top"
                maxLength={500}
                value={experienceText}
                onChangeText={setExperienceText}
              />
              <Text style={styles.charCount}>{experienceText.length}/500 characters</Text>
            </View>

            {/* Certification (Optional) */}
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Certification (Optional)</Text>

              {certificates.length === 0 ? (
                <TouchableOpacity
                  style={styles.uploadBox}
                  activeOpacity={0.85}
                  onPress={pickCertificate}
                >
                  <Ionicons name="ribbon-outline" size={28} color="#4B5563" />
                  <Text style={styles.uploadText} numberOfLines={1}>
                    Upload certificates
                  </Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.certGrid}>
                  {certificates.map((file, idx) => {
                    const isImage = (file.mimeType || "").startsWith("image/");
                    return (
                      <View key={`${file.uri}-${idx}`} style={styles.certThumb}>
                        {isImage ? (
                          <Image source={{ uri: file.uri }} style={styles.certThumbImage} />
                        ) : (
                          <View style={styles.certThumbFile}>
                            <Ionicons name="document-text-outline" size={28} color="#4B5563" />
                            <Text style={styles.certThumbName} numberOfLines={2}>
                              {file.name}
                            </Text>
                          </View>
                        )}
                        <TouchableOpacity
                          style={styles.certThumbRemove}
                          activeOpacity={0.7}
                          onPress={() => removeCertificate(idx)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Ionicons name="close" size={14} color="#FFFFFF" />
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                  {certificates.length < 3 && (
                    <TouchableOpacity
                      style={[styles.certThumb, styles.certThumbAdd]}
                      activeOpacity={0.7}
                      onPress={pickCertificate}
                    >
                      <Ionicons name="add" size={28} color="#9CA3AF" />
                    </TouchableOpacity>
                  )}
                </View>
              )}

              <Text style={styles.charCount}>
                {certificates.length}/3 files · PDF or image, up to 5 MB each
              </Text>
            </View>

            {/* Get Verified banner */}
            <View style={styles.verifiedBanner}>
              <Ionicons
                name="checkmark-circle-outline"
                size={22}
                color="#0088FF"
                style={{ marginTop: 1, marginRight: 10 }}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.verifiedTitle}>Get Verified</Text>
                <Text style={styles.verifiedBody}>
                  Upload government ID and relevant certifications to get a verified
                  badge. Verified professionals get 3x more job requests!
                </Text>
              </View>
            </View>
          </>
        )}

        {currentStep === 5 && (() => {
          const roleLabel = selectedRole === "referee" || !selectedRole ? "Referee /umpire" : (ROLES.find((r) => r.id === selectedRole)?.label || "-");
          const sportsLabel = (() => {
            const names = selectedSports.map((s) => s.includes("-") ? s.split("-")[0] : s);
            const unique = [...new Set(names)];
            return unique.length ? unique.join(", ") : "Cricket";
          })();
          const displayCity = city || "Pune";
          const expObj = EXPERIENCE_LEVELS.find((e) => e.id === selectedExperience);
          const expLabel = expObj ? `${expObj.label} /${expObj.duration}` : "Intermediate /1-3 years";
          const availLabel = selectedAvailability.length
            ? selectedAvailability
              .map((id) => AVAILABILITY_OPTIONS.find((a) => a.id === id)?.label)
              .filter(Boolean)
              .join(", ")
            : "Part Time";
          const rateTypeLabel = RATE_TYPES.find((r) => r.id === selectedRateType)?.label || "";
          const formattedRate = rateAmount ? Number(rateAmount).toLocaleString("en-IN") : "1,200";
          const displayRateType = rateTypeLabel || "Per Hour";
          const aboutMeText = experienceText || "Describe your experience, notable events you've worked on, skills, etc.";
          const certText = certificates.length
            ? certificates.map((c) => c.name).join(", ")
            : "Describe your experience, notable events you've worked on, skills, etc.";

          return (
            <>
              {/* Preview Heading */}
              <View style={styles.reviewHeading}>
                <Text style={styles.reviewTitle}>Review your Profile</Text>
                <Text style={styles.reviewSubtitle}>
                  Please review all details before creating your professional account
                </Text>
              </View>

              {/* Professional Role */}
              <View style={styles.reviewCard}>
                <View style={styles.reviewCardHeader}>
                  <Text style={styles.reviewCardTitle}>Professional Role</Text>
                </View>
                <Text style={styles.reviewValueGreen}>{roleLabel}</Text>
                <TouchableOpacity style={styles.editIconBtn} onPress={() => setCurrentStep(1)} activeOpacity={0.7}>
                  <View style={{ width: 19, height: 19 }}>
                    <SvgUri uri={editUri} width="100%" height="100%" />
                  </View>
                </TouchableOpacity>
              </View>

              {/* Sports & Location */}
              <View style={styles.reviewCard}>
                <View style={[styles.reviewCardHeader, { marginBottom: 24 }]}>
                  <Text style={styles.reviewCardTitle}>Sports & Location</Text>
                </View>
                <Text style={styles.reviewRow}>
                  <Text style={styles.reviewKey}>Sports : </Text>
                  <Text style={styles.reviewValueGreen}>{sportsLabel}</Text>
                </Text>
                <Text style={styles.reviewRow}>
                  <Text style={styles.reviewKey}>Location : </Text>
                  <Text style={styles.reviewValueGreen}>{displayCity}</Text>
                </Text>
                <TouchableOpacity style={[styles.editIconBtn, { top: 10, right: 10, marginTop: 0 }]} onPress={() => setCurrentStep(2)} activeOpacity={0.7}>
                  <View style={{ width: 19, height: 19 }}>
                    <SvgUri uri={editUri} width="100%" height="100%" />
                  </View>
                </TouchableOpacity>
              </View>

              {/* Experience & Availability */}
              <View style={styles.reviewCard}>
                <View style={[styles.reviewCardHeader, { marginBottom: 24 }]}>
                  <Text style={styles.reviewCardTitle}>Experience & Availability</Text>
                </View>
                <Text style={styles.reviewRow}>
                  <Text style={styles.reviewKey}>Experience Level : </Text>
                  <Text style={styles.reviewValueGreen}>{expLabel}</Text>
                </Text>
                <Text style={styles.reviewRow}>
                  <Text style={styles.reviewKey}>Availability : </Text>
                  <Text style={styles.reviewValueGreen}>{availLabel}</Text>
                </Text>
                <TouchableOpacity style={[styles.editIconBtn, { top: 10, right: 10, marginTop: 0 }]} onPress={() => setCurrentStep(3)} activeOpacity={0.7}>
                  <View style={{ width: 19, height: 19 }}>
                    <SvgUri uri={editUri} width="100%" height="100%" />
                  </View>
                </TouchableOpacity>
              </View>

              {/* Pricing */}
              <View style={styles.reviewCard}>
                <View style={[styles.reviewCardHeader, { marginBottom: 24 }]}>
                  <Text style={styles.reviewCardTitle}>Pricing</Text>
                </View>
                <View style={styles.pricingInner}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pricingLabel}>Your Rate</Text>
                    <Text style={styles.pricingAmount}>
                      ₹{formattedRate}
                      <Text style={styles.pricingPer}>  {displayRateType}</Text>
                    </Text>
                  </View>
                  {openToNegotiation && (
                    <Text style={styles.negotiableBadge}>Negotiable</Text>
                  )}
                </View>
                <TouchableOpacity style={[styles.editIconBtn, { top: 10, right: 10, marginTop: 0 }]} onPress={() => setCurrentStep(4)} activeOpacity={0.7}>
                  <View style={{ width: 19, height: 19 }}>
                    <SvgUri uri={editUri} width="100%" height="100%" />
                  </View>
                </TouchableOpacity>
              </View>

              {/* About Me */}
              <View style={styles.reviewCard}>
                <View style={[styles.reviewCardHeader, { marginBottom: 20 }]}>
                  <Text style={styles.reviewCardTitle}>About Me</Text>
                </View>
                <Text style={styles.reviewBody}>{aboutMeText}</Text>
                <TouchableOpacity style={[styles.editIconBtn, { top: 10, right: 10, marginTop: 0 }]} onPress={() => setCurrentStep(4)} activeOpacity={0.7}>
                  <View style={{ width: 19, height: 19 }}>
                    <SvgUri uri={editUri} width="100%" height="100%" />
                  </View>
                </TouchableOpacity>
              </View>

              {/* Certification */}
              <View style={styles.reviewCard}>
                <View style={[styles.reviewCardHeader, { marginBottom: 24 }]}>
                  <Text style={styles.reviewCardTitle}>Certification (Optional)</Text>
                </View>
                {certificates.length > 0 ? (
                  <View style={[styles.certGrid, { marginTop: 4 }]}>
                    {certificates.map((file, idx) => {
                      const isImage = (file.mimeType || "").startsWith("image/");
                      return (
                        <View key={`${file.uri}-${idx}`} style={styles.certThumb}>
                          {isImage ? (
                            <Image source={{ uri: file.uri }} style={styles.certThumbImage} />
                          ) : (
                            <View style={styles.certThumbFile}>
                              <Ionicons name="document-text-outline" size={28} color="#4B5563" />
                              <Text style={styles.certThumbName} numberOfLines={2}>
                                {file.name}
                              </Text>
                            </View>
                          )}
                        </View>
                      );
                    })}
                  </View>
                ) : (
                  <Text style={styles.reviewBody}>{certText}</Text>
                )}
                <TouchableOpacity style={[styles.editIconBtn, { top: 10, right: 10, marginTop: 0 }]} onPress={() => setCurrentStep(4)} activeOpacity={0.7}>
                  <View style={{ width: 19, height: 19 }}>
                    <SvgUri uri={editUri} width="100%" height="100%" />
                  </View>
                </TouchableOpacity>
              </View>

              {/* Ready to Go Live banner */}
              <View style={styles.verifiedBanner}>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={22}
                  color="#0088FF"
                  style={{ marginTop: 1, marginRight: 10 }}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.verifiedTitle}>Ready to Go Live!</Text>
                  <Text style={styles.verifiedBody}>
                    Once you create your profile, it will be visible to players and
                    organizers looking to hire professionals. You'll start receiving job
                    opportunities and hire requests.
                  </Text>
                </View>
              </View>
            </>
          );
        })()}

      </ScrollView>

      {/* Sticky bottom CTA */}
      <View style={[styles.stickyFooter, { paddingBottom: insets.bottom + 12 }]}>
        {currentStep === 2 || currentStep === 3 || currentStep === 4 || currentStep === 5 ? (
          (() => {
            const stepDisabled =
              currentStep === 2
                ? false
                : currentStep === 3
                  ? !selectedExperience
                  : currentStep === 4
                    ? !selectedRateType || !rateAmount.trim() || !experienceText.trim()
                    : currentStep === 5
                      ? submitting
                      : false;
            const ctaLabel =
              currentStep === 5
                ? submitting
                  ? "Saving..."
                  : "Create Professional Profile"
                : "Continue";
            return (
              <View style={styles.bottomRow}>
                <TouchableOpacity
                  style={[
                    styles.backSquareBtn,
                    currentStep === 5 && { borderColor: "#DDDDDD" }
                  ]}
                  onPress={handleBack}
                  activeOpacity={0.8}
                >
                  <Ionicons name="arrow-back" size={22} color={currentStep === 5 ? "#111827" : "#15A765"} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.continueButtonRow,
                    stepDisabled && styles.continueButtonDisabled,
                  ]}
                  onPress={handleContinue}
                  disabled={stepDisabled}
                  activeOpacity={0.85}
                >
                  <Text style={styles.continueButtonText}>{ctaLabel}</Text>
                  <Ionicons
                    name="arrow-forward"
                    size={20}
                    color="#FFFFFF"
                    style={{ marginLeft: 10 }}
                  />
                </TouchableOpacity>
              </View>
            );
          })()
        ) : (
          <TouchableOpacity
            style={[
              styles.continueButton,
              currentStep === 1 && !selectedRole && styles.continueButtonDisabled,
            ]}
            onPress={handleContinue}
            disabled={currentStep === 1 && !selectedRole}
            activeOpacity={0.8}
          >
            <Text style={styles.continueButtonText}>Continue</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Success Modal */}
      <Modal
        visible={successVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSuccessVisible(false)}
      >
        <View style={styles.successBackdrop}>
          <View style={styles.successCard}>
            <SvgUri
              uri={partyUri}
              width={160}
              height={160}
              style={styles.successImage}
            />
            <Text style={styles.successTitle}>
              You're Now a {roleNameMap[selectedRole] || "Professional"}!
            </Text>
            <Text style={styles.successBody}>
              Your {roleNameMap[selectedRole]?.toLowerCase() || "professional"} profile is ready.{"\n"}
              What would you like to do next?
            </Text>
            <View style={styles.successButtonRow}>
              <TouchableOpacity
                style={styles.successSecondaryBtn}
                activeOpacity={0.85}
                onPress={() => {
                  setSuccessVisible(false);
                  navigation.goBack();
                }}
              >
                <Text style={styles.successSecondaryText}>View Profile</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.successPrimaryBtn}
                activeOpacity={0.85}
                onPress={() => {
                  setSuccessVisible(false);
                  navigation.navigate("BrowseJobs");
                }}
              >
                <Text style={styles.successPrimaryText}>Browse job</Text>
              </TouchableOpacity>
            </View>
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  backButton: {
    marginRight: 10,
    padding: 4,
    marginLeft: -4,
  },
  headerTitle: {
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 18,
    lineHeight: 22,
    color: "#0A0A0A",
    fontWeight: "600",
  },
  scrollView: {
    flex: 1,
  },
  stickyFooter: {
    backgroundColor: "#FFFFFF",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  stepperContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginTop: 4,
    marginBottom: 20,
  },
  completedStepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#00BA00",
    justifyContent: "center",
    alignItems: "center",
  },
  activeStepOuterRing: {
    width: 40,
    height: 40,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: "#FF8D2833",
    justifyContent: "center",
    alignItems: "center",
  },
  activeStepCircle: {
    width: 32,
    height: 32,
    borderRadius: 50,
    backgroundColor: "#FF8D28",
    justifyContent: "center",
    alignItems: "center",
  },
  activeStepText: {
    color: "#FFFFFF",
    fontFamily: "Montserrat_700Bold",
    fontWeight: "700",
    fontSize: 16,
    lineHeight: 16,
    letterSpacing: 0,
    textAlign: "center",
  },
  inactiveStepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#EEEFF1",
    justifyContent: "center",
    alignItems: "center",
  },
  inactiveStepText: {
    color: "#B0B5BC",
    fontFamily: "Montserrat_700Bold",
    fontWeight: "700",
    fontSize: 16,
    lineHeight: 16,
    letterSpacing: 0,
    textAlign: "center",
  },
  stepperLine: {
    flex: 1,
    height: 3,
    backgroundColor: "#EEEFF1",
    marginHorizontal: 6,
    borderRadius: 2,
  },
  stepperLineCompleted: {
    backgroundColor: "#00BA00",
  },
  headingSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  titleText: {
    fontFamily: "Montserrat_500Medium",
    fontWeight: "500",
    fontSize: 16,
    lineHeight: 16,
    letterSpacing: 0,
    color: "#1A181B",
    marginBottom: 2,
  },
  subtitleText: {
    fontFamily: "Montserrat_500Medium",
    fontWeight: "500",
    fontSize: 14,
    lineHeight: 14,
    letterSpacing: 0,
    color: "#8D848F",
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 20,
    justifyContent: "space-between",
    gap: 16,
  },
  roleCard: {
    width: 164,
    height: 86,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EFF1F5",
    paddingTop: 16,
    paddingRight: 12,
    paddingBottom: 16,
    paddingLeft: 12,
    marginBottom: 0,
    gap: 10,
    justifyContent: "flex-start",
    alignItems: "flex-start",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  roleCardSelected: {
    borderColor: "#FF8D28",
    borderWidth: 1.5,
    backgroundColor: "#FFF4E5",
  },
  iconContainer: {
    alignSelf: "flex-start",
  },
  roleLabel: {
    width: 147,
    height: 18,
    fontFamily: "Montserrat_500Medium",
    fontWeight: "500",
    fontSize: 16,
    lineHeight: 18,
    letterSpacing: 0,
    color: "#0A0A0A",
  },
  roleLabelSelected: {
    fontFamily: "Montserrat_500Medium",
    fontWeight: "500",
    color: "#FF8D28",
  },
  tipBox: {
    backgroundColor: "#E5F0FF",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    marginTop: 24,
    marginBottom: 24,
  },
  tipIcon: {
    marginRight: 8,
  },
  tipText: {
    flex: 1,
    fontFamily: "Poppins_400Regular",
    fontWeight: "400",
    fontSize: 12,
    lineHeight: 17.4,
    letterSpacing: 0,
    color: "#0088FF",
    textAlign: "center",
  },
  tipTextBold: {
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "600",
    fontSize: 14,
    lineHeight: 16,
    letterSpacing: -0.15,
    color: "#0088FF",
  },
  continueButton: {
    backgroundColor: "#15A765",
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 12,
  },
  continueButtonDisabled: {
    backgroundColor: "#A7F3D0",
  },
  continueButtonText: {
    fontFamily: "Montserrat_500Medium",
    color: "#FFFFFF",
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "500",
  },
  // Step 2 specific styles
  sectionContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0A0A0A",
    marginBottom: 8,
  },
  selectedCountText: {
    fontSize: 14,
    color: "#1877F2",
    fontWeight: "500",
  },
  chipsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chipButton: {
    backgroundColor: "#F3F4F6",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 4,
  },
  chipButtonActive: {
    backgroundColor: "#FFF4E5",
    borderWidth: 1,
    borderColor: "#FF8D28",
  },
  chipText: {
    color: "#6B7280",
    fontSize: 14,
  },
  chipTextActive: {
    color: "#FF8D28",
    fontWeight: "600",
  },
  cityInput: {
    backgroundColor: "#F3F4F6",
    borderRadius: 24,
    height: 48,
    paddingHorizontal: 20,
    fontSize: 15,
    color: "#0A0A0A",
  },

  // -- Step 3: Experience & Availability --
  expCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#DDDDDD",
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  expCardSelected: {
    borderColor: "#FF8D28",
    borderWidth: 1.5,
    backgroundColor: "#FFF4E5",
  },
  expTitle: {
    fontSize: 14,
    fontFamily: "Montserrat_600SemiBold",
    color: "#0A0A0A",
    marginBottom: 2,
  },
  expTitleSelected: {
    color: "#FF8D28",
  },
  expDuration: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    color: "#666666",
  },
  availGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 12,
  },
  availCard: {
    width: (width - 52) / 2,
    minHeight: 86,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EFF1F5",
    paddingHorizontal: 18,
    paddingVertical: 16,
    alignItems: "flex-start",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  availCardSelected: {
    borderColor: "#FF8D28",
    borderWidth: 1.5,
    backgroundColor: "#FFF4E5",
  },
  availLabel: {
    fontSize: 16,
    fontFamily: "Montserrat_500Medium",
    color: "#1A181B",
    marginTop: 10,
    textAlign: "left",
    alignSelf: "flex-start",
  },
  availLabelSelected: {
    color: "#FF8D28",
    fontWeight: "600",
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    marginTop: 16,
    gap: 12,
  },
  backSquareBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#15A765",
    alignItems: "center",
    justifyContent: "center",
  },
  continueButtonRow: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#15A765",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  // -- Step 4: Pricing Setup --
  rateTypeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  rateTypeCard: {
    flex: 1,
    minHeight: 86,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EFF1F5",
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  rateTypeCardSelected: {
    borderColor: "#FF8D28",
    borderWidth: 1.5,
    backgroundColor: "#FFF4E5",
  },
  rateTypeLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#0A0A0A",
    marginTop: 10,
  },
  rateTypeLabelSelected: {
    color: "#FF8D28",
    fontWeight: "600",
  },
  rateInput: {
    backgroundColor: "#F2F2F2",
    borderRadius: 24,
    height: 48,
    paddingHorizontal: 20,
    fontSize: 14,
    color: "#0A0A0A",
  },
  negotiationBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginHorizontal: 20,
    marginTop: 0,
    marginBottom: 24,
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#F0F8FF",
  },
  negotiationCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: "#D6ECFF",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    marginTop: 1,
  },
  negotiationCheckboxChecked: {
    backgroundColor: "#0088FF",
    borderColor: "#D6ECFF",
  },
  negotiationTitle: {
    fontSize: 14,
    fontFamily: "Montserrat_600SemiBold",
    color: "#0088FF",
    marginBottom: 4,
  },
  negotiationBody: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    color: "#0088FF",
    lineHeight: 18,
  },

  // -- Step 5: Experience & Portfolio --
  experienceTextarea: {
    backgroundColor: "#F3F4F6",
    borderRadius: 10,
    minHeight: 110,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    fontSize: 14,
    color: "#0A0A0A",
    lineHeight: 20,
  },
  charCount: {
    fontSize: 12,
    color: "#8E9AA0",
    marginTop: 6,
  },
  uploadBox: {
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#D1D5DB",
    borderStyle: "dashed",
    minHeight: 96,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
  },
  uploadText: {
    fontSize: 14,
    color: "#4B5563",
    marginTop: 8,
    maxWidth: "90%",
  },
  uploadSubText: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 4,
  },
  removeFileBtn: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    marginTop: 8,
    paddingVertical: 4,
  },
  removeFileText: {
    fontSize: 12,
    color: "#EF4444",
    marginLeft: 6,
    fontWeight: "600",
  },
  certGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  certThumb: {
    width: (width - 40 - 24) / 3,
    aspectRatio: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    overflow: "hidden",
    position: "relative",
  },
  certThumbImage: {
    width: "100%",
    height: "100%",
  },
  certThumbFile: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  certThumbName: {
    fontSize: 10,
    color: "#4B5563",
    marginTop: 4,
    textAlign: "center",
  },
  certThumbRemove: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(239, 68, 68, 0.95)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  certThumbAdd: {
    borderStyle: "dashed",
    borderColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  verifiedBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    alignSelf: "center",
    width: 345,
    height: 93,
    marginTop: 4,
    marginBottom: 24,
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#F0F8FF",
    borderWidth: 0.5,
    borderColor: "#D6ECFF",
  },
  verifiedTitle: {
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 16,
    letterSpacing: -0.15,
    color: "#0088FF",
    marginBottom: 2,
  },
  verifiedBody: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    fontWeight: "400",
    color: "#0088FF",
    lineHeight: 17.4,
    letterSpacing: 0,
  },

  // -- Step 5: Review --
  reviewHeading: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  reviewTitle: {
    fontFamily: "Montserrat_500Medium",
    fontSize: 16,
    lineHeight: 16,
    letterSpacing: 0,
    color: "#1A181B",
    marginBottom: 2,
  },
  reviewSubtitle: {
    fontFamily: "Montserrat_500Medium",
    fontSize: 14,
    lineHeight: 14,
    letterSpacing: 0,
    color: "#8D848F",
  },
  reviewCard: {
    marginHorizontal: 20,
    marginBottom: 8,
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#DDDDDD",
    backgroundColor: "#FFFFFF",
    position: "relative",
  },
  reviewCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    paddingRight: 40,
  },
  reviewCardTitle: {
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 16,
    lineHeight: 16,
    letterSpacing: 0,
    color: "#1A181B",
    flex: 1,
  },
  editIconBtn: {
    position: "absolute",
    top: "50%",
    marginTop: -10,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#F2F3F4",
    alignItems: "center",
    justifyContent: "center",
  },
  reviewRow: {
    fontSize: 12,
    fontFamily: "Montserrat_500Medium",
    marginBottom: 3,
    lineHeight: 20,
    paddingRight: 40,
  },
  reviewKey: {
    color: "#666666",
    fontWeight: "500",
  },
  reviewValueGreen: {
    fontFamily: "Poppins_600SemiBold",
    color: "#15A765",
    fontSize: 12,
    lineHeight: 20,
    letterSpacing: 0,
  },
  reviewBody: {
    fontSize: 12,
    fontFamily: "Montserrat_500Medium",
    color: "#666666",
    lineHeight: 20,
    paddingRight: 40,
  },
  pricingInner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8FBEF",
    borderColor: "#DDDDDD",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginTop: 4,
  },
  pricingLabel: {
    fontSize: 12,
    fontFamily: "Montserrat_500Medium",
    color: "#666666",
    marginBottom: 5,
  },
  pricingAmount: {
    fontSize: 24,
    fontFamily: "Poppins_700Bold",
    color: "#15A765",
  },
  pricingPer: {
    fontSize: 12,
    fontFamily: "Montserrat_500Medium",
    color: "#666666",
  },
  negotiableBadge: {
    fontSize: 14,
    fontFamily: "Poppins_600SemiBold",
    color: "#15A765",
    marginLeft: 12,
  },

  // -- Success Modal --
  successBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  successCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingTop: 24,
    paddingBottom: 22,
    paddingHorizontal: 22,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  successImage: {
    width: 160,
    height: 160,
    marginBottom: 8,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0A0A0A",
    textAlign: "center",
    marginBottom: 8,
  },
  successBody: {
    fontSize: 14,
    color: "#4B5563",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 22,
  },
  successButtonRow: {
    flexDirection: "row",
    width: "100%",
    gap: 12,
  },
  successSecondaryBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#15A765",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  successSecondaryText: {
    color: "#15A765",
    fontSize: 15,
    fontWeight: "700",
  },
  successPrimaryBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#15A765",
    alignItems: "center",
    justifyContent: "center",
  },
  successPrimaryText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
});

export default CreateProfessionalProfileScreen;
