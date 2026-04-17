import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    ImageBackground,
    Switch,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    Image,
    ActivityIndicator,
    Alert,
} from "react-native";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { BlurView } from "expo-blur";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useAuth } from "../../context/AuthContext";
import AUTH from "../../api/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from '@expo/vector-icons';
import API from '../../api/api'
import { LinearGradient } from "expo-linear-gradient";

const Profile = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const { user, updateUser, logout } = useAuth();
    const [isTrainer, setIsTrainer] = useState(false);
    const [availableRoles, setAvailableRoles] = useState(["Player"]);
    const [currentRole, setCurrentRole] = useState("Player");
    const [loading, setLoading] = useState(true);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [imageError, setImageError] = useState(false);
    const [canSwitchRole, setCanSwitchRole] = useState(false);
    const SERVER_URL = API.SERVER_URL;

    // Default profile data
    const [profileData, setProfileData] = useState({
        name: "",
        dob: "",
        gender: "",
        clubName: "",
        contactNumber: "",
        emergencyContact: "",
        email: "",
        address: "",
        achievements: [],
        profileImage: null,
    });

    const normalizeProfileImage = (imgPath) => {
        // Handle null or undefined image paths
        if (!imgPath) {
            return null;
        }

        // Fix backslashes
        const img = imgPath.replace(/\\/g, "/");

        // Remove any leading "uploads/" or "./uploads/"
        const relativeAfterUploads = img.replace(/^\.?\/?(uploads\/)/i, "");

        // Return the final absolute URL
        return `${SERVER_URL}/uploads/${relativeAfterUploads}`;
    };



    // Stats data for different sports
    const [sportsStats, setSportsStats] = useState({
        Cricket: { win: 0, lose: 0, draw: 0, total: 0 },
        Football: { win: 0, lose: 0, draw: 0, total: 0 },
        TableTennis: { win: 0, lose: 0, draw: 0, total: 0 },
        Swimming: { win: 0, lose: 0, draw: 0, total: 0 },
    });

    const [availableSports, setAvailableSports] = useState([
        "Cricket",
        "Football",
        "TableTennis",
        "Swimming",
    ]);
    const [activeTab, setActiveTab] = useState("Cricket");

    useEffect(() => {
        fetchProfileData();
        checkRoleSwitchAvailability();
    }, []);

    // Update profile data when route params change
    useEffect(() => {
        if (route.params) {
            setProfileData({
                name: route.params.name || profileData.name,
                dob: route.params.dob || profileData.dob,
                gender: route.params.gender || profileData.gender,
                clubName: route.params.clubName || profileData.clubName,
                contactNumber: route.params.contactNumber || profileData.contactNumber,
                emergencyContact:
                    route.params.emergencyContact || profileData.emergencyContact,
                email: route.params.email || profileData.email,
                address: route.params.address || profileData.address,
                achievements: route.params.achievements || profileData.achievements,
                profileImage: route.params.profileImage || profileData.profileImage,
            });
        }
    }, [route.params]);

    // Set default active tab when sports change
    useEffect(() => {
        if (availableSports.length > 0 && !activeTab) {
            setActiveTab(availableSports[0]);
        }
    }, [availableSports]);

    const getToken = async () => {
        try {
            return await AsyncStorage.getItem("auth_token");
        } catch (error) {
            console.error("Error getting token:", error);
            return null;
        }
    };

    const checkRoleSwitchAvailability = async () => {
        const userId = user?._id || user?.id;
        if (!userId) return;

        try {
            const token = await getToken();
            const response = await fetch(
                AUTH.ENDPOINTS.USER.CAN_SWITCH_ROLE(userId),
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );
            const data = await response.json();
            setCanSwitchRole(data.canSwitch);
            if (data.availableRoles) setAvailableRoles(data.availableRoles);
            if (data.currentRole) setCurrentRole(data.currentRole);
        } catch (error) {
            console.error("Error checking role switch availability:", error);
            setCanSwitchRole(false);
        }
    };

    const fetchProfileData = async () => {
        if (!user) {
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const token = await getToken();
            // Use the new endpoint to get complete user data
            const response = await fetch(AUTH.ENDPOINTS.CURRENT_USER, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await response.json();

            // ✅ Normalize profile image just like QR handler
            const normalizedProfileImage = normalizeProfileImage(data.profileImage);
            setProfileData({
                name: data.name || "NA",
                dob: formatDateOfBirth(data.dateOfBirth) || "NA",
                gender: data.sex
                    ? data.sex.charAt(0).toUpperCase() + data.sex.slice(1)
                    : "NA",
                clubName:
                    data.clubNames && data.clubNames.length > 0
                        ? data.clubNames.join(", ")
                        : "NA",
                contactNumber: data.mobile || "NA",
                emergencyContact: data.emergencyContact || "NA",
                email: data.email || "NA",
                address: data.address || "NA",
                achievements: data.achievements
                    ? data.achievements.split("\n").filter((a) => a.trim())
                    : [],
                profileImage: normalizedProfileImage, // ✅ normalized
            });

            setIsTrainer(data.role === "Trainer");

            // Sports + stats handling same as before...
        } catch (error) {
            console.error("Error fetching profile data:", error);
            Alert.alert("Error", "Failed to load profile data. Please check your internet connection.");
        } finally {
            setLoading(false);
        }
    };


    const toggleSwitch = async () => {
        const userId = user?._id || user?.id;
        if (!userId) return;

        try {
            const token = await getToken();
            const response = await fetch(AUTH.ENDPOINTS.USER.SWITCH_ROLE(userId), {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            });

            const data = await response.json();

            if (response.ok && data.success) {
                // Store new token and user data
                await AsyncStorage.setItem("auth_token", data.token);
                await AsyncStorage.setItem("auth_user", JSON.stringify(data.user));

                // Update AuthContext with new user and token - this triggers dashboard switch
                await updateUser(data.user, data.token);

                // Update local state
                setIsTrainer(data.user.role === "Trainer");

                Alert.alert("Success", data.message);
                // AppNavigator will automatically switch based on new user role
            } else {
                Alert.alert("Error", data.message || "Failed to switch account role");
            }
        } catch (error) {
            console.error("Error switching role:", error);
            Alert.alert("Error", "An error occurred while switching roles");
        }
    };

    const switchToRole = async (targetRole) => {
        const userId = user?._id || user?.id;
        if (!userId) return;

        try {
            const token = await getToken();
            const response = await fetch(AUTH.ENDPOINTS.USER.SWITCH_ROLE(userId), {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ targetRole }),
            });

            const data = await response.json();

            if (response.ok && data.success) {
                await AsyncStorage.setItem("auth_token", data.token);
                await AsyncStorage.setItem("auth_user", JSON.stringify(data.user));
                await updateUser(data.user, data.token);

                setCurrentRole(targetRole);
                setIsTrainer(targetRole === "Trainer");

                Alert.alert("Success", data.message);
            } else {
                Alert.alert("Error", data.message || "Failed to switch role");
            }
        } catch (error) {
            console.error("Error switching role:", error);
            Alert.alert("Error", "An error occurred while switching roles");
        }
    };

    const handleRoleSwitch = () => {
        const targetRole = isTrainer ? "Player" : "Trainer";
        Alert.alert("Switch Role", `Switch to ${targetRole} mode?`, [
            { text: "Cancel", style: "cancel" },
            { text: "Confirm", onPress: () => switchToRole(targetRole) },
        ]);
    };


    const formatDateOfBirth = (dateString) => {
        if (!dateString) return "NA";
        const date = new Date(dateString);
        const options = { year: "numeric", month: "long", day: "numeric" };
        return date.toLocaleDateString(undefined, options);
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#1B89FF" />
                <Text style={styles.loadingText}>Loading profile...</Text>
            </View>
        );
    }

    return (
        <ScrollView showsVerticalScrollIndicator={false} style={styles.container}>
            <View style={styles.headerContainer}>
                <LinearGradient
                    colors={["#004E93", "#00b4db"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.headerGradient}
                >
                    <View style={styles.topActions}>
                        {/* <TouchableOpacity
                            style={styles.iconButton}
                            onPress={() => navigation.goBack()}
                        >
                            <MaterialIcons name="arrow-back" size={24} color="#fff" />
                        </TouchableOpacity> */}
                        <TouchableOpacity
                            style={styles.iconButton}
                            onPress={() => navigation.navigate("EditProfile")}
                        >
                            <MaterialIcons name="edit" size={24} color="#fff" />
                        </TouchableOpacity>
                    </View>
                </LinearGradient>
            </View>

            <View style={styles.profileSection}>
                <View style={styles.profileImageWrapper}>
                    <Image
                        source={
                            profileData.profileImage && !imageError
                                ? { uri: profileData.profileImage }
                                : require("../../../assets/profile.jpg")
                        }
                        style={styles.profileImage}
                        onError={() => setImageError(true)}
                    />
                    {uploadingImage && (
                        <View style={styles.uploadingOverlay}>
                            <ActivityIndicator size="large" color="#ffffff" />
                        </View>
                    )}
                </View>
                <Text style={styles.profileName}>{profileData.name || "NA"}</Text>
                <View style={[styles.badgeContainer, { flexDirection: 'row', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }]}>
                    {availableRoles.map((role) => {
                        const isActive = currentRole === role;
                        const colors = role === "Trainer" ? ["#FF6A00", "#EE0979"]
                            : role === "Referee" ? ["#3B82F6", "#6366F1"]
                            : ["#004E93", "#00b4db"];
                        return (
                            <LinearGradient
                                key={role}
                                colors={isActive ? colors : ["#E5E7EB", "#D1D5DB"]}
                                style={[styles.roleBadge, { marginHorizontal: 0 }]}
                            >
                                <Text style={[styles.roleText, !isActive && { color: '#6B7280' }]}>
                                    {role === "Referee" ? "Umpire" : role}
                                    {isActive ? " ★" : ""}
                                </Text>
                            </LinearGradient>
                        );
                    })}
                </View>
            </View>

            {/* <View style={styles.statsCard}>
                <Text style={styles.statsTitle}>Sports Statistics</Text>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.tabContainer}
                >
                    {availableSports.map((sport) => (
                        <TouchableOpacity
                            key={sport}
                            style={[
                                styles.tabButton,
                                activeTab === sport && styles.activeTab
                            ]}
                            onPress={() => setActiveTab(sport)}
                        >
                            <Text style={[
                                styles.tabText,
                                activeTab === sport && styles.activeTabText
                            ]}>
                                {sport}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                <View style={styles.statsContainer}>
                    <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Total</Text>
                        <Text style={styles.statValue}>{sportsStats[activeTab]?.total || 0}</Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.statItem}>
                        <Text style={[styles.statLabel, { color: '#4CAF50' }]}>Win</Text>
                        <Text style={[styles.statValue, { color: '#4CAF50' }]}>{sportsStats[activeTab]?.win || 0}</Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.statItem}>
                        <Text style={[styles.statLabel, { color: '#F44336' }]}>Lose</Text>
                        <Text style={[styles.statValue, { color: '#F44336' }]}>{sportsStats[activeTab]?.lose || 0}</Text>
                    </View>
                </View>
            </View> */}

            <View style={styles.card1}>
                <Text style={styles.sectionTitle}>About Us</Text>
                <View style={styles.row}>
                    <MaterialIcons name="person-outline" size={20} color="#666" />
                    <Text style={styles.label}>Player Name:</Text>
                    <Text style={styles.value}>{profileData.name || "NA"}</Text>
                </View>
                <View style={styles.row}>
                    <MaterialCommunityIcons
                        name="calendar-outline"
                        size={20}
                        color="#666"
                    />
                    <Text style={styles.label}>Date of Birth:</Text>
                    <Text style={styles.value}>{profileData.dob || "NA"}</Text>
                </View>
                <View style={styles.row}>
                    <MaterialIcons name="wc" size={20} color="#666" />
                    <Text style={styles.label}>Gender:</Text>
                    <Text style={styles.value}>{profileData.gender || "NA"}</Text>
                </View>
                {profileData.clubName && (
                    <View style={styles.row}>
                        <MaterialCommunityIcons
                            name="account-group"
                            size={20}
                            color="#666"
                        />
                        <Text style={styles.label}>Club Name:</Text>
                        <Text style={styles.value}>{profileData.clubName}</Text>
                    </View>
                )}
            </View>

            <View style={styles.card1}>
                <Text style={styles.sectionTitle}>Contact</Text>
                <View style={styles.row}>
                    <MaterialCommunityIcons name="phone-outline" size={20} color="#666" />
                    <Text style={styles.label}>Contact Number:</Text>
                    <Text style={styles.value}>{profileData.contactNumber || "NA"}</Text>
                </View>
                {profileData.emergencyContact && (
                    <View style={styles.row}>
                        <MaterialCommunityIcons
                            name="phone-outline"
                            size={20}
                            color="#666"
                        />
                        <Text style={styles.label}>Emergency Contact:</Text>
                        <Text style={styles.value}>{profileData.emergencyContact}</Text>
                    </View>
                )}
                <View style={styles.row}>
                    <MaterialCommunityIcons name="email-outline" size={20} color="#666" />
                    <Text style={styles.label}>Email:</Text>
                    <Text style={styles.value}>{profileData.email || "NA"}</Text>
                </View>
                {profileData.address && (
                    <View style={styles.row1}>
                        <MaterialCommunityIcons
                            name="map-marker-outline"
                            size={20}
                            color="#666"
                        />
                        <View style={styles.column1}>
                            <Text style={styles.label1}>Address:</Text>
                            <Text style={styles.value1}>{profileData.address}</Text>
                        </View>
                    </View>
                )}
            </View>

            {profileData.achievements && profileData.achievements.length > 0 ? (
                <View style={styles.card1}>
                    <Text style={styles.sectionTitle}>Achievements</Text>
                    {profileData.achievements.map((achievement, index) => (
                        <View key={index} style={styles.row}>
                            <MaterialIcons name="workspace-premium" size={20} color="#666" />
                            <Text style={styles.value}>{achievement}</Text>
                        </View>
                    ))}
                </View>
            ) : (
                <View style={styles.card1}>
                    <Text style={styles.sectionTitle}>Achievements</Text>
                    <View style={styles.row}>
                        <MaterialIcons name="workspace-premium" size={20} color="#666" />
                        <Text style={styles.value}>NA</Text>
                    </View>
                </View>
            )}

            {canSwitchRole && availableRoles.length > 1 && (
                <View style={styles.card1}>
                    <Text style={styles.sectionTitle}>Switch Account Role</Text>
                    <Text style={{ fontSize: 11, color: '#999', marginBottom: 12, marginTop: -4 }}>
                        Tap a role to switch your active mode
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                        {availableRoles.map((role) => {
                            const isActive = currentRole === role;
                            const icon = role === "Trainer" ? "school"
                                : role === "Referee" ? "sports"
                                : "person";
                            return (
                                <TouchableOpacity
                                    key={role}
                                    style={{
                                        flex: 1, minWidth: 90, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                                        paddingVertical: 12, paddingHorizontal: 14, borderRadius: 14, gap: 6,
                                        backgroundColor: isActive ? '#004E93' : '#F3F4F6',
                                        borderWidth: isActive ? 0 : 1, borderColor: '#E5E7EB',
                                    }}
                                    onPress={() => {
                                        if (isActive) return;
                                        Alert.alert(
                                            "Switch Role",
                                            `Switch to ${role === "Referee" ? "Umpire" : role} mode?`,
                                            [
                                                { text: "Cancel", style: "cancel" },
                                                { text: "Switch", onPress: () => switchToRole(role) },
                                            ]
                                        );
                                    }}
                                    activeOpacity={isActive ? 1 : 0.7}
                                >
                                    <MaterialIcons name={icon} size={18} color={isActive ? '#FFF' : '#666'} />
                                    <Text style={{
                                        fontSize: 13, fontWeight: '800',
                                        color: isActive ? '#FFF' : '#374151',
                                    }}>
                                        {role === "Referee" ? "Umpire" : role}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>
            )}
            {/* <View style={styles.menuContainer}>
                <TouchableOpacity style={styles.menuItem} onPress={logout}>
                    <Ionicons name="person-outline" size={20} color="#666666" />
                    <Text style={styles.menuText}>Log Out</Text>
                </TouchableOpacity>
            </View> */}
        </ScrollView>
    );
};

// Keep all the styles from the original component
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F8F9FB",
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#F8F9FB",
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: "#666",
    },
    headerContainer: {
        height: 120,
        overflow: "hidden",
    },
    headerGradient: {
        flex: 1,
        paddingTop: 40,
        paddingHorizontal: 16,
    },
    topActions: {
        flexDirection: "row",
        justifyContent: "flex-end",
        alignItems: "center",
    },
    iconButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "rgba(255, 255, 255, 0.2)",
        justifyContent: "center",
        alignItems: "center",
    },
    profileSection: {
        alignItems: "center",
        marginTop: -70,
        marginBottom: 20,
    },
    profileImageWrapper: {
        width: 150,
        height: 150,
        borderRadius: 55,
        borderWidth: 4,
        borderColor: "#fff",
        elevation: 8,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        backgroundColor: "#fff",
        overflow: "visible",
    },
    profileImage: {
        width: "100%",
        height: "100%",
        borderRadius: 55,
    },
    profileName: {
        fontSize: 24,
        fontWeight: "bold",
        color: "#333",
        marginTop: 12,
    },
    badgeContainer: {
        marginTop: 8,
    },
    roleBadge: {
        paddingHorizontal: 16,
        paddingVertical: 4,
        borderRadius: 20,
    },
    roleText: {
        color: "#fff",
        fontSize: 14,
        fontWeight: "600",
    },
    statsCard: {
        backgroundColor: "#fff",
        marginHorizontal: 16,
        borderRadius: 20,
        padding: 20,
        elevation: 4,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        marginBottom: 20,
    },
    statsTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#333",
        marginBottom: 16,
    },
    tabContainer: {
        flexDirection: "row",
        marginBottom: 20,
    },
    tabButton: {
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: "#F0F2F5",
        marginRight: 10,
    },
    activeTab: {
        backgroundColor: "#004E93",
    },
    tabText: {
        color: "#666",
        fontWeight: "600",
    },
    activeTabText: {
        color: "#fff",
    },
    statsContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    statItem: {
        flex: 1,
        alignItems: "center",
    },
    statLabel: {
        fontSize: 12,
        color: "#666",
        marginBottom: 4,
        fontWeight: "600",
    },
    statValue: {
        fontSize: 20,
        fontWeight: "bold",
        color: "#004E93",
    },
    divider: {
        width: 1,
        height: 30,
        backgroundColor: "#EEE",
    },
    card1: {
        backgroundColor: "#fff",
        borderRadius: 20,
        padding: 20,
        marginHorizontal: 16,
        marginBottom: 16,
        elevation: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#004E93",
        marginBottom: 16,
    },
    row: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 12,
    },
    label: {
        fontSize: 14,
        fontWeight: "600",
        color: "#666",
        marginLeft: 10,
        flex: 1,
    },
    value: {
        fontSize: 14,
        color: "#333",
        fontWeight: "500",
    },
    row1: {
        flexDirection: "row",
        alignItems: "flex-start",
        marginBottom: 12,
    },
    column1: {
        flex: 1,
        marginLeft: 10,
    },
    label1: {
        fontSize: 14,
        fontWeight: "600",
        color: "#666",
    },
    value1: {
        fontSize: 14,
        color: "#333",
        fontWeight: "500",
        marginTop: 2,
    },
    switchRoleContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: "#F0F7FF",
        padding: 15,
        borderRadius: 15,
    },
    roleInfo: {
        flexDirection: "row",
        alignItems: "center",
    },
    roleTextContainer: {
        marginLeft: 12,
    },
    currentRoleLabel: {
        fontSize: 12,
        color: "#666",
    },
    currentRoleValue: {
        fontSize: 16,
        fontWeight: "bold",
        color: "#004E93",
    },
    switchButton: {
        backgroundColor: "#FF6A00",
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 25,
        elevation: 3,
    },
    switchButtonText: {
        color: "#fff",
        fontWeight: "bold",
        fontSize: 12,
        marginLeft: 4,
    },
});

export default Profile;
