import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Alert,
  TextInput,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
  Dimensions,
  StatusBar,
} from "react-native";
import { Ionicons, MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import { CommonActions } from '@react-navigation/native';
import { useNavigation, useRoute } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useAuth } from "../../context/AuthContext";
import AUTH from "../../api/auth";
import API from '../../api/api'
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const EditScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { user, updateProfile, logout } = useAuth();
  const initialProfile = route.params?.profile || {};
  const SERVER_URL = API.SERVER_URL;

  // State variables
  const [profileImage, setProfileImage] = useState(null);
  const [achievements, setAchievements] = useState([""]);
  const [dob, setDob] = useState("");
  const [showPicker, setShowPicker] = useState(false);
  const [gender, setGender] = useState("");
  const [showGenderOptions, setShowGenderOptions] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [originalEmail, setOriginalEmail] = useState("");

  // Form fields
  const [name, setName] = useState("");
  const [clubName, setClubName] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");

  const genderOptions = ["Male", "Female", "Other"];

  const normalizeProfileImage = (imgPath) => {
    if (!imgPath) return null;
    if (typeof imgPath === "object" && imgPath.uri) return imgPath;
    if (typeof imgPath === "string") {
      const img = imgPath.replace(/\\/g, "/");
      const relativeAfterUploads = img.replace(/^\.?\/?uploads\//i, "");
      return { uri: `${SERVER_URL}/uploads/${relativeAfterUploads}` };
    }
    return null;
  };

  useEffect(() => {
    if (initialProfile && Object.keys(initialProfile).length > 0) {
      populateFormFields(initialProfile);
    } else {
      fetchProfileData();
    }
  }, []);

  const populateFormFields = (profile) => {
    setName(profile.name || "");
    setDob(formatDateString(profile.dateOfBirth) || "");
    setGender(profile.sex ? profile.sex.charAt(0).toUpperCase() + profile.sex.slice(1) : "");
    setClubName(profile.clubNames?.length > 0 ? profile.clubNames[0] : "");
    setContactNumber(profile.mobile || "");
    setEmergencyContact(profile.emergencyContact || "");
    setEmail(profile.email || "");
    setOriginalEmail(profile.email || "");
    setAddress(profile.address || "");

    if (profile.achievements) {
      const achievementsList = typeof profile.achievements === "string"
        ? profile.achievements.split("\n").filter((a) => a.trim())
        : Array.isArray(profile.achievements) ? profile.achievements : [];
      setAchievements(achievementsList.length > 0 ? achievementsList : [""]);
    }

    if (profile.profileImage) {
      setProfileImage(normalizeProfileImage(profile.profileImage));
    } else {
      setProfileImage(null);
    }
  };

  const getToken = async () => {
    try {
      return await AsyncStorage.getItem("auth_token");
    } catch (error) {
      console.error("Error getting token:", error);
      return null;
    }
  };

  const fetchProfileData = async () => {
    const userId = user?.id || user?._id;
    if (!userId) return;
    setLoading(true);
    try {
      const token = await getToken();
      const response = await fetch(AUTH.ENDPOINTS.USER.PROFILE(userId), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const profileData = await response.json();
      populateFormFields(profileData);
    } catch (error) {
      Alert.alert("Error", "Failed to load profile data");
    } finally {
      setLoading(false);
    }
  };

  const formatDateString = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return `${date.getDate().toString().padStart(2, "0")}/${(date.getMonth() + 1).toString().padStart(2, "0")}/${date.getFullYear()}`;
  };

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleEmailChange = (text) => {
    setEmail(text);
    setEmailError(validateEmail(text) ? "" : "Please enter a valid email address");
  };

  const onDateChange = (event, selectedDate) => {
    setShowPicker(false);
    if (selectedDate) {
      const formattedDate = `${selectedDate.getDate().toString().padStart(2, "0")}/${(selectedDate.getMonth() + 1).toString().padStart(2, "0")}/${selectedDate.getFullYear()}`;
      setDob(formattedDate);
    }
  };

  const handleAddAchievement = () => setAchievements([...achievements, ""]);

  const handleDeleteAchievement = (index) => {
    const updated = achievements.filter((_, i) => i !== index);
    setAchievements(updated.length > 0 ? updated : [""]);
  };

  const handleAchievementChange = (text, index) => {
    const updated = [...achievements];
    updated[index] = text;
    setAchievements(updated);
  };

  const uploadFromGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "We need permission to access your photos.");
        return;
      }

      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]) {
        setProfileImage({ uri: result.assets[0].uri });
        uploadProfileImage(result.assets[0]);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to pick image");
    }
  };

  const uploadProfileImage = async (imageInfo) => {
    if (!user || !imageInfo) return;
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("profile-image", {
        uri: imageInfo.uri,
        type: "image/jpeg",
        name: "profile-image.jpg",
      });

      const token = await getToken();
      const userId = user?.id || user?._id;
      const response = await fetch(AUTH.ENDPOINTS.USER.UPLOAD_IMAGE(userId), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const result = await response.json();
      if (result.imageUrl) {
        setProfileImage({ uri: `${SERVER_URL}/${result.imageUrl.replace(/\\/g, "/")}` });
      }
      Alert.alert("Success", "Profile picture updated successfully");
    } catch (error) {
      Alert.alert("Error", "Failed to upload profile picture");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async () => {
    if (!email) return Alert.alert("Missing Information", "Email is required");
    if (emailError) return Alert.alert("Invalid Email", "Please enter a valid email address");
    if (!name) return Alert.alert("Missing Information", "Name is required");
    if (!dob) return Alert.alert("Missing Information", "Date of birth is required");
    if (!gender) return Alert.alert("Missing Information", "Gender is required");
    if (!contactNumber) return Alert.alert("Missing Information", "Contact number is required");

    setLoading(true);
    try {
      const token = await getToken();
      const userId = user?.id || user?._id;
      if (!userId) {
        setLoading(false);
        return Alert.alert("Error", "User ID not found");
      }

      const dateParts = dob.split("/");
      const formattedDate = dateParts.length === 3 ? new Date(dateParts[2], dateParts[1] - 1, dateParts[0]).toISOString() : null;
      const formattedAchievements = achievements.filter((a) => a.trim().length > 0).join("\n");

      const profileSubmitData = {
        name,
        dateOfBirth: formattedDate,
        sex: gender.toLowerCase(),
        clubNames: clubName ? [clubName] : [],
        mobile: contactNumber,
        emergencyContact,
        email,
        address,
        achievements: formattedAchievements,
      };

      const response = await fetch(AUTH.ENDPOINTS.USER.PROFILE(userId), {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(profileSubmitData),
      });

      if (response.ok) {
        const emailChanged = email !== originalEmail;
        if (updateProfile) await updateProfile(userId, profileSubmitData, "user");

        if (emailChanged) {
          await logout();
          Alert.alert("Email Updated", "Please log in again with your new email.");
        } else {
          Alert.alert("Success", "Profile updated successfully", [
            {
              text: "OK",
              onPress: () => {
                navigation.dispatch(
                  CommonActions.reset({
                    index: 0,
                    routes: [{ name: "Profile", state: { routes: [{ name: "Player Profile" }] } }],
                  })
                );
              },
            },
          ]);
        }
      } else {
        const errorData = await response.json();
        Alert.alert("Error", errorData.message || "Failed to update profile");
      }
    } catch (error) {
      Alert.alert("Error", "An error occurred while updating profile");
    } finally {
      setLoading(false);
    }
  };

  const parseDateString = (dateStr) => {
    if (!dateStr) return new Date();
    const parts = dateStr.split("/");
    if (parts.length !== 3) return new Date();
    return new Date(parts[2], parts[1] - 1, parts[0]);
  };

  if (loading && !name) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading profile data...</Text>
      </View>
    );
  }

  const renderInput = (label, value, onChangeText, placeholder, icon, extraProps = {}) => (
    <View style={styles.inputWrapper}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={styles.modernInputContainer}>
        <Ionicons name={icon} size={20} color="#007AFF" style={styles.inputIcon} />
        <TextInput
          style={styles.modernInput}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#ADB5BD"
          {...extraProps}
        />
      </View>
    </View>
  );

  return (
    <View style={styles.mainContainer}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Header */}
      <View style={[styles.headerContainer, { paddingTop: insets.top + 10 }]}>
        <LinearGradient
          colors={['#004E93', '#007AFF']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        />
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <View style={{ width: 44 }} />
        </View>
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Image Section */}
        <View style={styles.imageEditSection}>
          <View style={styles.avatarOuterRing}>
            {uploadingImage ? (
              <View style={styles.imageLoader}>
                <ActivityIndicator size="small" color="#007AFF" />
              </View>
            ) : (
              <Image
                source={profileImage || require("../../../assets/editprofile.png")}
                style={styles.mainAvatar}
              />
            )}
            <TouchableOpacity style={styles.camBadge} onPress={uploadFromGallery}>
              <Ionicons name="camera" size={18} color="#FFF" />
            </TouchableOpacity>
          </View>
          <Text style={styles.imageHint}>Tap camera to change photo</Text>
        </View>

        {/* Form Sections */}
        <View style={styles.formSection}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="account-details" size={20} color="#007AFF" />
            <Text style={styles.sectionTitle}>Basic Information</Text>
          </View>

          <View style={styles.modernCard}>
            {renderInput("Full Name*", name, (t) => setName(t.replace(/[^A-Za-z. ]/g, "")), "Enter your name", "person-outline")}

            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Date of Birth*</Text>
              <TouchableOpacity style={styles.modernInputContainer} onPress={() => setShowPicker(true)}>
                <Ionicons name="calendar-outline" size={20} color="#007AFF" style={styles.inputIcon} />
                <Text style={[styles.modernInput, !dob && { color: '#ADB5BD' }]}>
                  {dob || "DD/MM/YYYY"}
                </Text>
              </TouchableOpacity>
            </View>

            {showPicker && (
              <DateTimePicker
                value={dob ? parseDateString(dob) : new Date()}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={onDateChange}
                maximumDate={new Date()}
              />
            )}

            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Gender*</Text>
              <TouchableOpacity
                style={styles.modernInputContainer}
                onPress={() => setShowGenderOptions(!showGenderOptions)}
              >
                <Ionicons name="transgender-outline" size={20} color="#007AFF" style={styles.inputIcon} />
                <Text style={[styles.modernInput, !gender && { color: '#ADB5BD' }]}>
                  {gender || "Select Category"}
                </Text>
                <Ionicons name={showGenderOptions ? "chevron-up" : "chevron-down"} size={18} color="#007AFF" />
              </TouchableOpacity>

              {showGenderOptions && (
                <View style={styles.genderDropdown}>
                  {genderOptions.map((option, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={styles.genderOption}
                      onPress={() => { setGender(option); setShowGenderOptions(false); }}
                    >
                      <Text style={[styles.genderText, gender === option && { color: '#007AFF', fontWeight: '700' }]}>
                        {option}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {renderInput("Club Name", clubName, setClubName, "Enter club name", "business-outline")}
          </View>

          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="contact-outline" size={20} color="#007AFF" />
            <Text style={styles.sectionTitle}>Contact Details</Text>
          </View>

          <View style={styles.modernCard}>
            {renderInput("Mobile Number*", contactNumber, (t) => setContactNumber(t.replace(/[^0-9]/g, "")), "10-digit number", "call-outline", { keyboardType: "phone-pad", maxLength: 10 })}
            {renderInput("Emergency Contact", emergencyContact, (t) => setEmergencyContact(t.replace(/[^0-9]/g, "")), "Relative's number", "alert-circle-outline", { keyboardType: "phone-pad", maxLength: 10 })}
            {renderInput("Email Address*", email, handleEmailChange, "your@email.com", "mail-outline", { keyboardType: "email-address", autoCapitalize: 'none' })}
            {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
            {renderInput("Home Address", address, setAddress, "Your full address", "location-outline", { multiline: true })}
          </View>

          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="trophy-outline" size={20} color="#007AFF" />
            <Text style={styles.sectionTitle}>Achievements</Text>
          </View>

          <View style={styles.modernCard}>
            {achievements.map((item, index) => (
              <View key={index} style={styles.achievementItem}>
                <View style={styles.achievementInputRow}>
                  <View style={styles.achievementInputContainer}>
                    <TextInput
                      style={styles.achievementInput}
                      placeholder="Award, Medal, certificate..."
                      value={item}
                      onChangeText={(text) => handleAchievementChange(text, index)}
                      multiline
                    />
                  </View>
                  <TouchableOpacity
                    style={styles.achDeleteBtn}
                    onPress={() => handleDeleteAchievement(index)}
                    disabled={index === 0 && achievements.length === 1}
                  >
                    <Ionicons name="trash-outline" size={20} color={index === 0 && achievements.length === 1 ? "#ECEFF1" : "#FF3B30"} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
            <TouchableOpacity style={styles.addAchBtn} onPress={handleAddAchievement}>
              <Ionicons name="add-circle-outline" size={20} color="#007AFF" />
              <Text style={styles.addAchText}>Add Achievement</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Sticky Footer Button */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 10 }]}>
        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={loading}>
          <LinearGradient
            colors={['#004E93', '#007AFF']}
            style={styles.submitGrad}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <>
                <Text style={styles.submitText}>Save Changes</Text>
                <Ionicons name="checkmark-circle" size={20} color="#FFF" style={{ marginLeft: 8 }} />
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  headerContainer: {
    paddingBottom: 20,
    zIndex: 10,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: 0.5,
  },
  scrollArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: "#007AFF",
    fontWeight: '600',
  },
  imageEditSection: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  avatarOuterRing: {
    width: 140,
    height: 140,
    borderRadius: 70,
    padding: 5,
    backgroundColor: '#FFF',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 8,
  },
  mainAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: 65,
  },
  imageLoader: {
    width: '100%',
    height: '100%',
    borderRadius: 65,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  camBadge: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#007AFF',
    borderWidth: 3,
    borderColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageHint: {
    marginTop: 12,
    fontSize: 12,
    color: '#90A4AE',
    fontWeight: '600',
  },
  formSection: {
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    marginLeft: 5,
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#343A40',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginLeft: 8,
  },
  modernCard: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 16,
    marginBottom: 25,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  inputWrapper: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#495057',
    marginBottom: 8,
    marginLeft: 4,
  },
  modernInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 15,
    paddingHorizontal: 15,
    height: 56,
    borderWidth: 1,
    borderColor: '#F1F3F5',
  },
  inputIcon: {
    marginRight: 12,
  },
  modernInput: {
    flex: 1,
    fontSize: 15,
    color: '#212529',
    fontWeight: '500',
  },
  genderDropdown: {
    backgroundColor: '#FFF',
    borderRadius: 15,
    marginTop: 5,
    borderWidth: 1,
    borderColor: '#F1F3F5',
    overflow: 'hidden',
  },
  genderOption: {
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F8F9FA',
  },
  genderText: {
    fontSize: 14,
    color: '#495057',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 12,
    marginTop: -15,
    marginBottom: 15,
    marginLeft: 4,
  },
  achievementItem: {
    marginBottom: 12,
  },
  achievementInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  achievementInputContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    borderRadius: 15,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F1F3F5',
  },
  achievementInput: {
    fontSize: 14,
    color: '#212529',
    minHeight: 40,
    textAlignVertical: 'top',
  },
  achDeleteBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF1F0',
  },
  addAchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 5,
    borderWidth: 1,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
    borderRadius: 15,
    gap: 8,
  },
  addAchText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#007AFF',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(248, 249, 250, 0.95)',
    paddingTop: 10,
  },
  submitBtn: {
    height: 60,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: "#007AFF",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 8,
  },
  submitGrad: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '800',
  },
});

export default EditScreen;
