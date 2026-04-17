import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    StatusBar,
    ScrollView,
    Alert,
    Platform,
    Dimensions,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import AUTH from "../../api/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import API from '../../api/api';

const { width } = Dimensions.get('window');

const Profile = () => {
    const { logout, user } = useAuth();
    const navigation = useNavigation();
    const route = useRoute();
    const SERVER_URL = API.SERVER_URL;
    const insets = useSafeAreaInsets();

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

    const menuItems = [
        {
            id: 1,
            title: 'Personal Info',
            subtitle: 'Update your basic details',
            icon: 'person',
            color: '#007AFF',
            bgColor: '#F0F7FF',
            onPress: () => navigation.navigate('My Profile'),
        },
        {
            id: 7,
            title: 'Messages',
            subtitle: 'Chat with other players',
            icon: 'chatbubble-ellipses',
            color: '#007AFF',
            bgColor: '#F0F7FF',
            onPress: () => navigation.getParent()?.navigate('Chat', { screen: 'ChatList' }),
        },
        {
            id: 8,
            title: 'Book a Turf',
            subtitle: 'Browse and book sports venues',
            icon: 'football',
            color: '#059669',
            bgColor: '#ECFDF5',
            onPress: () => navigation.getParent()?.navigate('Home', { screen: 'TurfList' }),
        },
        {
            id: 11,
            title: 'My Career & Rankings',
            subtitle: 'Stats, history & achievements',
            icon: 'stats-chart',
            color: '#DC2626',
            bgColor: '#FEF2F2',
            onPress: () => navigation.navigate('TournamentHistory'),
        },
        {
            id: 2,
            title: 'Registered Events',
            subtitle: 'View your tournament history',
            icon: 'trophy',
            color: '#5856D6',
            bgColor: '#F5F5FF',
            onPress: () => {
                navigation.getParent()?.navigate('Events', { screen: 'EventScreen' });
            },
        },
        {
            id: 3,
            title: 'Payment History',
            subtitle: 'Manage your transactions',
            icon: 'card',
            color: '#34C759',
            bgColor: '#F0FFF4',
            onPress: () => navigation.navigate('Payment History'),
        },
        {
            id: 4,
            title: 'Equipment Exchange',
            subtitle: 'Buy, sell & manage sports gear',
            icon: 'basketball-outline',
            color: '#0079EE',
            bgColor: '#EFF6FF',
            onPress: () => navigation.navigate('EquipmentHub'),
        },
        {
            id: 10,
            title: 'My Services',
            subtitle: 'Trainer, Referee, Staff profiles',
            icon: 'briefcase',
            color: '#FF6A00',
            bgColor: '#FFF7ED',
            onPress: () => navigation.navigate('RoleHub'),
        },
        {
            id: 9,
            title: 'Invitations',
            subtitle: 'Tournament invites from players',
            icon: 'mail',
            color: '#4F46E5',
            bgColor: '#EEF2FF',
            onPress: () => navigation.navigate('Invitations'),
        },
    ];

    const supportItems = [
        {
            id: 1,
            title: "Help Center",
            subtitle: "FAQ's and Support",
            icon: 'help-circle',
            color: '#FF9500',
            bgColor: '#FFFBF0',
            onPress: () => navigation.navigate(`FAQ'S`),
        },
        {
            id: 2,
            title: 'Privacy & Security',
            subtitle: 'Policy and data usage',
            icon: 'shield-checkmark',
            color: '#FF2D55',
            bgColor: '#FFF0F3',
            onPress: () => navigation.navigate('Privacy & Policy'),
        },
    ];

    const [stats, setStats] = useState({
        totalTournaments: 0,
        upcomingEvents: 0,
    });

    useEffect(() => {
        fetchStats();
    }, []);

    // Re-fetch profile every time screen comes into focus (e.g. after editing)
    useFocusEffect(
        React.useCallback(() => {
            fetchProfileData();
        }, [])
    );

    const fetchStats = async () => {
        if (!user?._id && !user?.id) return;
        try {
            const userId = user._id || user.id;
            const response = await fetch(`${API.BASE_URL}/tournaments/bookings/user/${userId}`);
            const data = await response.json();

            if (data.success) {
                const bookings = data.data || [];
                const now = new Date();

                const upcoming = bookings.filter(b => {
                    const tDate = b.tournamentId?.startDate ? new Date(b.tournamentId.startDate) : null;
                    return tDate && tDate >= now;
                }).length;

                setStats({
                    totalTournaments: bookings.length,
                    upcomingEvents: upcoming,
                });
            }
        } catch (error) {
            console.error("Error fetching stats:", error);
        }
    };

    const fetchProfileData = async () => {
        if (!user || !user._id) return;
        try {
            const token = await AsyncStorage.getItem("auth_token");
            const response = await fetch(AUTH.ENDPOINTS.USER.PROFILE(user._id), {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await response.json();

            if (data.message && data.message.includes('Invalid')) {
                Alert.alert("Error", data.message);
                return;
            }

            setProfileData({
                name: data.name || user.name || "Member",
                dob: formatDateOfBirth(data.dateOfBirth),
                gender: data.sex ? data.sex.charAt(0).toUpperCase() + data.sex.slice(1) : "NA",
                clubName: data.clubNames?.length > 0 ? data.clubNames.join(", ") : "NA",
                contactNumber: data.mobile || "NA",
                emergencyContact: data.emergencyContact || "NA",
                email: data.email || user.email || "NA",
                address: data.address || "NA",
                achievements: data.achievements ? data.achievements.split("\n").filter(a => a.trim()) : [],
                profileImage: data.profileImage || null,
            });
        } catch (error) {
            console.error("Error fetching profile data:", error);
        }
    };

    const formatDateOfBirth = (dateString) => {
        if (!dateString) return "NA";
        const date = new Date(dateString);
        return date.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
    };

    const handleEditProfile = () => {
        navigation.navigate('My Profile');
    };

    const handleLogout = () => {
        Alert.alert(
            "Confirm Logout",
            "Are you sure you want to log out?",
            [
                { text: "Cancel", style: "cancel" },
                { text: "Log Out", style: "destructive", onPress: () => logout() }
            ]
        );
    };

    return (
        <View style={styles.mainContainer}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            <ScrollView
                style={styles.scrollContainer}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Modern Hero Header */}
                <View style={styles.heroSection}>
                    <LinearGradient
                        colors={['#004E93', '#007AFF', '#00B4DB']}
                        style={styles.heroGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    >
                        <View style={[styles.heroHeader, { paddingTop: insets.top + 10 }]}>
                            <View>
                                <Text style={styles.heroGreeting}>My Account</Text>
                                <Text style={styles.heroSubtext}>Manage your sports journey</Text>
                            </View>
                        </View>

                        <View style={styles.mainProfileContainer}>
                            <View style={styles.profileAvatarWrapper}>
                                <Image
                                    source={
                                        profileData.profileImage
                                            ? {
                                                uri: profileData.profileImage.trim().startsWith('http')
                                                    ? profileData.profileImage.trim()
                                                    : `${SERVER_URL?.replace(/\/$/, '')}/uploads/${profileData.profileImage.trim().replace(/^\.?\/?uploads\//i, '')}`
                                            }
                                            : require("../../../assets/mainProfile.jpg")
                                    }
                                    style={styles.mainAvatar}
                                    onError={() => {
                                        setProfileData((prev) => ({ ...prev, profileImage: null }));
                                    }}
                                />
                                <TouchableOpacity style={styles.camBadge} onPress={handleEditProfile}>
                                    <Ionicons name="camera" size={14} color="#FFF" />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.profileMeta}>
                                <Text style={styles.mainName}>{user?.name || "Member"}</Text>
                                <View style={styles.mainRoleBadge}>
                                    <Text style={styles.mainRoleText}>{user?.role || "Player"}</Text>
                                </View>
                            </View>
                        </View>
                    </LinearGradient>
                </View>

                {/* Floating Stats Overlay */}
                <View style={styles.statsOverlay}>
                    <View style={styles.ovStat}>
                        <Text style={styles.ovLabel}>Tournaments</Text>
                        <Text style={styles.ovValue}>{stats.totalTournaments}</Text>
                    </View>
                    <View style={styles.ovDivider} />
                    <View style={styles.ovStat}>
                        <Text style={styles.ovLabel}>Upcoming</Text>
                        <Text style={styles.ovValue}>{stats.upcomingEvents}</Text>
                    </View>
                    <View style={styles.ovDivider} />
                    <View style={styles.ovStat}>
                        <Text style={styles.ovLabel}>Won</Text>
                        <Text style={styles.ovValue}>0</Text>
                    </View>
                </View>

                {/* Content Section */}
                <View style={styles.contentPadded}>
                    <Text style={styles.groupLabel}>Account Overview</Text>
                    <View style={styles.modernCard}>
                        {menuItems.map((item, index) => (
                            <TouchableOpacity
                                key={item.id}
                                style={[styles.modernItem, index === menuItems.length - 1 && { borderBottomWidth: 0 }]}
                                onPress={item.onPress}
                            >
                                <View style={[styles.mIconBg, { backgroundColor: item.bgColor }]}>
                                    <Ionicons name={item.icon} size={22} color={item.color} />
                                </View>
                                <View style={styles.mTextContent}>
                                    <Text style={styles.mTitle}>{item.title}</Text>
                                    <Text style={styles.mSubtitle}>{item.subtitle}</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={20} color="#CFD8DC" />
                            </TouchableOpacity>
                        ))}
                    </View>

                    <Text style={styles.groupLabel}>Utility & Support</Text>
                    <View style={styles.modernCard}>
                        {supportItems.map((item, index) => (
                            <TouchableOpacity
                                key={item.id}
                                style={[styles.modernItem, index === supportItems.length - 1 && { borderBottomWidth: 0 }]}
                                onPress={item.onPress}
                            >
                                <View style={[styles.mIconBg, { backgroundColor: item.bgColor }]}>
                                    <Ionicons name={item.icon} size={22} color={item.color} />
                                </View>
                                <View style={styles.mTextContent}>
                                    <Text style={styles.mTitle}>{item.title}</Text>
                                    <Text style={styles.mSubtitle}>{item.subtitle}</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={20} color="#CFD8DC" />
                            </TouchableOpacity>
                        ))}
                    </View>

                    <TouchableOpacity style={styles.newLogoutBtn} onPress={handleLogout}>
                        <Ionicons name="power" size={20} color="#FFF" />
                        <Text style={styles.logoutTxt}>Sign Out</Text>
                    </TouchableOpacity>

                    <Text style={styles.versionText}>Version 2.0.1 (Stable)</Text>
                </View>

                <View style={styles.footerSpace} />
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    mainContainer: {
        flex: 1,
        backgroundColor: '#F7F9FC',
    },
    scrollContainer: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 40,
    },
    heroSection: {
        height: 240,
        borderBottomLeftRadius: 40,
        borderBottomRightRadius: 40,
        overflow: 'hidden',
    },
    heroGradient: {
        flex: 1,
        paddingHorizontal: 25,
    },
    heroHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 30,
    },
    heroGreeting: {
        fontSize: 26,
        fontWeight: '900',
        color: '#FFF',
        letterSpacing: -0.5,
    },
    heroSubtext: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.8)',
        fontWeight: '500',
    },
    settingsBtn: {
        width: 44,
        height: 44,
        borderRadius: 15,
        backgroundColor: 'rgba(255,255,255,0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    mainProfileContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    profileAvatarWrapper: {
        position: 'relative',
    },
    mainAvatar: {
        width: 90,
        height: 90,
        borderRadius: 30,
        borderWidth: 3,
        borderColor: '#FFF',
    },
    camBadge: {
        position: 'absolute',
        bottom: -5,
        right: -5,
        backgroundColor: '#007AFF',
        width: 30,
        height: 30,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: '#FFF',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    profileMeta: {
        marginLeft: 20,
    },
    mainName: {
        fontSize: 24,
        fontWeight: '800',
        color: '#FFF',
    },
    mainRoleBadge: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        alignSelf: 'flex-start',
        marginTop: 6,
    },
    mainRoleText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    statsOverlay: {
        flexDirection: 'row',
        backgroundColor: '#FFF',
        marginHorizontal: 25,
        marginTop: 20,
        borderRadius: 20,
        paddingVertical: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
    },
    ovStat: {
        flex: 1,
        alignItems: 'center',
    },
    ovLabel: {
        fontSize: 12,
        color: '#90A4AE',
        fontWeight: '600',
        marginBottom: 5,
    },
    ovValue: {
        fontSize: 18,
        fontWeight: '800',
        color: '#263238',
    },
    ovDivider: {
        width: 1,
        height: '60%',
        backgroundColor: '#ECEFF1',
        alignSelf: 'center',
    },
    contentPadded: {
        paddingHorizontal: 25,
        marginTop: 30,
    },
    groupLabel: {
        fontSize: 13,
        fontWeight: '800',
        color: '#B0BEC5',
        textTransform: 'uppercase',
        letterSpacing: 1.2,
        marginBottom: 15,
        marginLeft: 5,
    },
    modernCard: {
        backgroundColor: '#FFF',
        borderRadius: 25,
        padding: 10,
        marginBottom: 25,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 10,
        elevation: 2,
    },
    modernItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 15,
        paddingHorizontal: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#F5F7F8',
    },
    mIconBg: {
        width: 48,
        height: 48,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    mTextContent: {
        flex: 1,
        marginLeft: 15,
    },
    mTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#263238',
    },
    mSubtitle: {
        fontSize: 12,
        color: '#90A4AE',
        marginTop: 2,
    },
    newLogoutBtn: {
        marginTop: 10,
        height: 60,
        borderRadius: 20,
        overflow: 'hidden',
        backgroundColor: '#FF6A00',
        shadowColor: "#000000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 8,
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
    },
    logoutTxt: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '800',
    },
    versionText: {
        textAlign: 'center',
        marginTop: 30,
        color: '#B0BEC5',
        fontSize: 12,
        fontWeight: '600',
    },
    footerSpace: {
        height: 50,
    },
});

export default Profile;
