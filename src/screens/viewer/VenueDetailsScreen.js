import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import API from "../../api/api";
import { authFetch } from "../../api/authFetch";
import useBottomInset from "../../hooks/useBottomInset";
import { assetUrl } from "../../utils/assetUrl";

// ─── Green design system tokens ──────────────────────────────────────────
const GREEN = "#15A765"; // primary brand — buttons, active states, accents
const GREEN_DARK = "#0F8A55"; // gradients, emphasis text
const GREEN_TINT = "#E8F7F0"; // active chip bg, soft fills
const AMBER = "#F59E0B"; // SPARING accent only (badges/medals/highlights)
const TEXT_DARK = "#1A181B"; // headings / primary text
const TEXT_MUTED = "#6B7280"; // secondary text, labels, placeholders
const BORDER = "#EEEEFF"; // card/search borders
const FIELD_BG = "#F4F4F5"; // input/track/inactive-chip bg
const SCREEN_BG = "#FFFFFF"; // screen background

const SCREEN_WIDTH = Dimensions.get("window").width;

const VenueDetailsScreen = ({ route, navigation }) => {
  const bottom = useBottomInset();
  const insets = useSafeAreaInsets();
  const { venueId } = route.params || {};
  const [activeTab, setActiveTab] = useState("About");
  const [venue, setVenue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchVenueDetails();
  }, [venueId]);

  const fetchVenueDetails = async () => {
    if (!venueId) {
      setError("Venue ID is missing");
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await authFetch(API.ENDPOINTS.TURFS.BY_ID(venueId));
      const data = await response.json();

      if (data) {
        // Adapt server response to our display structure
        const adaptedVenue = {
          id: data._id,
          name: data.name,
          location: data.address
            ? `${data.address.fullAddress || ""}, ${data.address.area || ""}, ${
                data.address.city || ""
              }-${data.address.pincode || ""}`
            : "Location not available",
          distance: "Distance not available", // Would need to calculate based on user location
          rating: data.ratings?.average || 0,
          ratingCount: data.ratings?.count || 0,
          images: data.images?.map((img) => assetUrl(img)) || [],
          discount: data.discount || null,
          sports: Array.isArray(data.sports)
            ? data.sports.map((sport) =>
                typeof sport === "object" ? sport.name : sport
              )
            : [],
          favorite: false, // Would need to get this from user preferences
          phone: data.phone || "Not available",
          email: data.email || "Not available",
          website: data.website || "Not available",
          openingHours: data.openingHours || "Not specified",
          description: data.description || "No description available",
          amenities: mapFacilitiesToAmenities(data.facilities),
          reviews: Array.isArray(data.reviews)
            ? data.reviews.map((review) => ({
                id: review._id,
                user: review.user?.name || "Anonymous",
                rating: review.rating,
                date: formatDate(review.createdAt),
                comment: review.comment || "No comment",
              }))
            : [],
          availableSlots: [], // To be implemented or fetched from a separate endpoint
        };

        setVenue(adaptedVenue);
      } else {
        setError("Failed to load venue details");
      }
    } catch (error) {
      console.error("Error fetching venue details:", error);
      setError("Failed to connect to the server");
    } finally {
      setLoading(false);
    }
  };

  // Helper function to map facilities to amenities
  const mapFacilitiesToAmenities = (facilities) => {
    if (!facilities) return [];

    const amenitiesMap = {
      lockerRooms: "Changing Rooms",
      parking: "Parking",
      foodCourt: "Refreshments",
      wifi: "Wifi",
      floodLights: "Floodlights",
      shower: "Shower",
      restrooms: "Restrooms",
      artificialTurf: "Artificial Turf",
      drinkingWater: "Drinking Water",
      loungeArea: "Lounge Area",
      surveillanceCameras: "CCTV Surveillance",
      firstAidKit: "First Aid Kit",
    };

    return Object.entries(facilities)
      .filter(([_, value]) => value === true)
      .map(([key, _]) => amenitiesMap[key])
      .filter((item) => item); // Remove undefined items
  };

  // Helper function to format dates
  const formatDate = (dateString) => {
    if (!dateString) return "Recently";

    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  };

  // Handle favorite toggling
  const toggleFavorite = async () => {
    // In a real app, you'd call an API endpoint to toggle favorite status
    setVenue({
      ...venue,
      favorite: !venue.favorite,
    });
  };

  // Sample slots for demonstration - in a real app, you'd fetch this
  const sampleSlots = [
    { id: "1", time: "6:00 AM - 7:00 AM", available: true, price: "₹800" },
    { id: "2", time: "7:00 AM - 8:00 AM", available: false, price: "₹800" },
    { id: "3", time: "8:00 AM - 9:00 AM", available: true, price: "₹800" },
    { id: "4", time: "5:00 PM - 6:00 PM", available: true, price: "₹1200" },
    { id: "5", time: "6:00 PM - 7:00 PM", available: false, price: "₹1200" },
    { id: "6", time: "7:00 PM - 8:00 PM", available: true, price: "₹1200" },
    { id: "7", time: "8:00 PM - 9:00 PM", available: true, price: "₹1200" },
    { id: "8", time: "9:00 PM - 10:00 PM", available: true, price: "₹1000" },
  ];

  // Render functions
  const renderImageItem = ({ item }) => (
    <Image
      source={typeof item === "string" ? { uri: item } : item}
      style={styles.venueImage}
      resizeMode="cover"
    />
  );

  const renderAmenityItem = ({ item }) => (
    <View style={styles.amenityItem}>
      <View style={styles.amenityIconWrap}>
        <Ionicons
          name={
            item === "Changing Rooms"
              ? "shirt-outline"
              : item === "Parking"
              ? "car-outline"
              : item === "Refreshments"
              ? "fast-food-outline"
              : item === "Wifi"
              ? "wifi-outline"
              : item === "Floodlights"
              ? "flashlight-outline"
              : item === "Shower"
              ? "water-outline"
              : item === "Restrooms"
              ? "water-outline"
              : item === "CCTV Surveillance"
              ? "videocam-outline"
              : item === "First Aid Kit"
              ? "medkit-outline"
              : item === "Artificial Turf"
              ? "leaf-outline"
              : item === "Drinking Water"
              ? "water-outline"
              : item === "Lounge Area"
              ? "home-outline"
              : "checkmark-circle-outline"
          }
          size={20}
          color={GREEN}
        />
      </View>
      <Text style={styles.amenityText}>{item}</Text>
    </View>
  );

  const renderSlotItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.slotItem, !item.available && styles.slotItemUnavailable]}
      disabled={!item.available}
      activeOpacity={0.85}
      onPress={() =>
        Alert.alert("Booking", "Please sign in to access booking features")
      }
    >
      <Text
        style={[styles.slotTime, !item.available && styles.slotTextUnavailable]}
      >
        {item.time}
      </Text>
      <Text
        style={[
          styles.slotPrice,
          !item.available && styles.slotTextUnavailable,
        ]}
      >
        {item.price}
      </Text>
      <View
        style={[
          styles.slotStatusPill,
          item.available ? styles.slotStatusPillOpen : styles.slotStatusPillBusy,
        ]}
      >
        <Text
          style={[
            styles.slotStatus,
            !item.available && styles.slotStatusBusyText,
          ]}
        >
          {item.available ? "Available" : "Booked"}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderReviewItem = ({ item }) => (
    <View style={styles.reviewItem}>
      <View style={styles.reviewHeader}>
        <View>
          <Text style={styles.reviewUser}>{item.user}</Text>
          <Text style={styles.reviewDate}>{item.date}</Text>
        </View>
        <View style={styles.reviewRating}>
          <Text style={styles.reviewRatingText}>{item.rating}</Text>
          <Ionicons name="star" size={12} color="#fff" />
        </View>
      </View>
      <Text style={styles.reviewComment}>{item.comment}</Text>
    </View>
  );

  // Show loading indicator
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={GREEN} />
        <Text style={styles.loadingText}>Loading venue details...</Text>
      </View>
    );
  }

  // Show error message
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={56} color="#D1D5DB" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={fetchVenueDetails}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Show venue not found message
  if (!venue) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="search-outline" size={56} color="#D1D5DB" />
        <Text style={styles.errorText}>Venue not found</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.retryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Hero image gallery */}
        <View style={styles.imageContainer}>
          {venue.images && venue.images.length > 0 ? (
            <FlatList
              data={venue.images}
              renderItem={renderImageItem}
              keyExtractor={(item, index) => index.toString()}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
            />
          ) : (
            <Image
              source={require("../../../assets/turf.jpg")}
              style={styles.venueImage}
              resizeMode="cover"
            />
          )}

          {/* Gradient overlay for legibility of floating controls */}
          <LinearGradient
            colors={["rgba(0,0,0,0.45)", "transparent", "rgba(0,0,0,0.25)"]}
            locations={[0, 0.4, 1]}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />

          {/* Floating circular back button */}
          <TouchableOpacity
            style={[styles.backButton, { top: insets.top + 8 }]}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="chevron-back" size={22} color={TEXT_DARK} />
          </TouchableOpacity>

          {venue.discount && (
            <View style={[styles.discountBadge, { top: insets.top + 8 }]}>
              <Ionicons name="pricetag" size={14} color="#fff" />
              <Text style={styles.discountText}>{venue.discount}</Text>
            </View>
          )}
        </View>

        {/* Venue Info — content sheet overlapping the hero */}
        <View style={styles.infoContainer}>
          <View style={styles.venueHeader}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={styles.venueName}>{venue.name}</Text>
              <View style={styles.ratingContainer}>
                <Ionicons name="star" size={16} color={AMBER} />
                <Text style={styles.ratingText}>{venue.rating.toFixed(1)}</Text>
                <Text style={styles.ratingCount}>
                  ({venue.ratingCount}{" "}
                  {venue.ratingCount === 1 ? "review" : "reviews"})
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.favoriteButton}
              onPress={toggleFavorite}
              activeOpacity={0.8}
            >
              <Ionicons
                name={venue.favorite ? "heart" : "heart-outline"}
                size={22}
                color={venue.favorite ? GREEN : TEXT_MUTED}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.venueLocationRow}>
            <Ionicons name="location-outline" size={16} color={TEXT_MUTED} />
            <Text style={styles.venueLocation} numberOfLines={2}>
              {venue.location}
            </Text>
          </View>

          <View style={styles.sportsList}>
            {venue.sports.map((sport, index) => (
              <View key={index} style={styles.sportTag}>
                <Text style={styles.sportText}>{sport}</Text>
              </View>
            ))}
          </View>

          {/* Tab Navigation */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === "About" && styles.activeTab]}
              onPress={() => setActiveTab("About")}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === "About" && styles.activeTabText,
                ]}
              >
                About
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === "Slots" && styles.activeTab]}
              onPress={() => setActiveTab("Slots")}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === "Slots" && styles.activeTabText,
                ]}
              >
                Available Slots
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === "Reviews" && styles.activeTab]}
              onPress={() => setActiveTab("Reviews")}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === "Reviews" && styles.activeTabText,
                ]}
              >
                Reviews
              </Text>
            </TouchableOpacity>
          </View>

          {/* Tab Content */}
          {activeTab === "About" && (
            <View style={styles.tabContent}>
              <View style={styles.aboutCard}>
                <View style={styles.infoRow}>
                  <View style={styles.infoItem}>
                    <Ionicons name="call-outline" size={18} color={GREEN} />
                    <Text style={styles.infoText} numberOfLines={1}>
                      {venue.phone}
                    </Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Ionicons name="mail-outline" size={18} color={GREEN} />
                    <Text style={styles.infoText} numberOfLines={1}>
                      {venue.email}
                    </Text>
                  </View>
                </View>

                <View style={[styles.infoRow, { marginBottom: 0 }]}>
                  <View style={styles.infoItem}>
                    <Ionicons name="globe-outline" size={18} color={GREEN} />
                    <Text style={styles.infoText} numberOfLines={1}>
                      {venue.website}
                    </Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Ionicons name="time-outline" size={18} color={GREEN} />
                    <Text style={styles.infoText} numberOfLines={1}>
                      {venue.openingHours}
                    </Text>
                  </View>
                </View>
              </View>

              <Text style={styles.sectionTitle}>Description</Text>
              <Text style={styles.descriptionText}>{venue.description}</Text>

              {venue.amenities.length > 0 && (
                <>
                  <Text style={styles.sectionTitle}>Amenities</Text>
                  <FlatList
                    data={venue.amenities}
                    renderItem={renderAmenityItem}
                    keyExtractor={(item, index) => index.toString()}
                    numColumns={2}
                    scrollEnabled={false}
                  />
                </>
              )}
            </View>
          )}

          {activeTab === "Slots" && (
            <View style={styles.tabContent}>
              <Text style={styles.sectionTitle}>Available Slots for Today</Text>
              <TouchableOpacity style={styles.dateSelectorButton} activeOpacity={0.8}>
                <Ionicons name="calendar-outline" size={18} color={GREEN} />
                <Text style={styles.dateSelectorText}>
                  {new Date().toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </Text>
                <Ionicons name="chevron-down" size={18} color={TEXT_MUTED} />
              </TouchableOpacity>

              <FlatList
                data={
                  venue.availableSlots?.length > 0
                    ? venue.availableSlots
                    : sampleSlots
                }
                renderItem={renderSlotItem}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
              />

              <Text style={styles.slotInfoText}>* Sign in to book a slot</Text>
            </View>
          )}

          {activeTab === "Reviews" && (
            <View style={styles.tabContent}>
              <View style={styles.reviewSummary}>
                <View style={styles.reviewRatingLarge}>
                  <Text style={styles.reviewRatingLargeText}>
                    {venue.rating.toFixed(1)}
                  </Text>
                  <View style={styles.reviewRatingStars}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Ionicons
                        key={star}
                        name={
                          star <= Math.floor(venue.rating)
                            ? "star"
                            : star <= venue.rating
                            ? "star-half"
                            : "star-outline"
                        }
                        size={16}
                        color={AMBER}
                      />
                    ))}
                  </View>
                  <Text style={styles.reviewCountText}>
                    Based on {venue.ratingCount}{" "}
                    {venue.ratingCount === 1 ? "review" : "reviews"}
                  </Text>
                </View>
              </View>

              {venue.reviews.length > 0 ? (
                <FlatList
                  data={venue.reviews}
                  renderItem={renderReviewItem}
                  keyExtractor={(item) => item.id.toString()}
                  scrollEnabled={false}
                />
              ) : (
                <View style={styles.noReviewsContainer}>
                  <Ionicons name="chatbubble-ellipses-outline" size={48} color="#D1D5DB" />
                  <Text style={styles.noReviewsText}>No reviews yet</Text>
                  <Text style={styles.noReviewsSubtext}>
                    Be the first to review this venue
                  </Text>
                </View>
              )}

              <TouchableOpacity
                style={styles.writeReviewButton}
                activeOpacity={0.85}
                onPress={() =>
                  Alert.alert("Review", "Please sign in to write a review")
                }
              >
                <Ionicons name="create-outline" size={18} color={GREEN_DARK} />
                <Text style={styles.writeReviewText}>Write a Review</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Sticky Book Now Button */}
      <View
        style={[styles.bookButtonContainer, { paddingBottom: bottom + 12 }]}
      >
        <TouchableOpacity
          style={styles.bookButton}
          activeOpacity={0.9}
          onPress={() =>
            Alert.alert("Booking", "Please sign in to access booking features")
          }
        >
          <Text style={styles.bookButtonText}>Book Now</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SCREEN_BG,
  },
  scroll: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: SCREEN_BG,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: TEXT_MUTED,
    fontFamily: "Poppins_400Regular",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: SCREEN_BG,
  },
  errorText: {
    fontSize: 16,
    color: TEXT_MUTED,
    textAlign: "center",
    marginTop: 12,
    marginBottom: 20,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "700",
  },
  retryButton: {
    backgroundColor: GREEN,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 14,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
    fontFamily: "Montserrat_700Bold",
  },

  // Hero gallery
  imageContainer: {
    position: "relative",
    height: 290,
  },
  venueImage: {
    width: SCREEN_WIDTH,
    height: 290,
  },
  backButton: {
    position: "absolute",
    left: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  discountBadge: {
    position: "absolute",
    right: 16,
    backgroundColor: GREEN,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    zIndex: 10,
  },
  discountText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
    fontFamily: "Montserrat_600SemiBold",
    marginLeft: 4,
  },

  // Content sheet
  infoContainer: {
    backgroundColor: SCREEN_BG,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: -20,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 110,
  },
  venueHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  venueName: {
    fontSize: 22,
    fontWeight: "800",
    color: TEXT_DARK,
    marginBottom: 6,
    fontFamily: "Montserrat_700Bold",
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  ratingText: {
    fontSize: 15,
    fontWeight: "700",
    color: TEXT_DARK,
    marginLeft: 5,
    fontFamily: "Montserrat_600SemiBold",
  },
  ratingCount: {
    fontSize: 13,
    color: TEXT_MUTED,
    marginLeft: 5,
    fontFamily: "Poppins_400Regular",
  },
  favoriteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: FIELD_BG,
    justifyContent: "center",
    alignItems: "center",
  },
  venueLocationRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 10,
    marginBottom: 16,
    gap: 4,
  },
  venueLocation: {
    flex: 1,
    fontSize: 13,
    color: TEXT_MUTED,
    fontFamily: "Poppins_400Regular",
    lineHeight: 18,
  },
  sportsList: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 20,
    gap: 8,
  },
  sportTag: {
    backgroundColor: GREEN_TINT,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 999,
  },
  sportText: {
    fontSize: 13,
    color: GREEN_DARK,
    fontWeight: "600",
    fontFamily: "Montserrat_600SemiBold",
  },
  tabContainer: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    marginBottom: 20,
  },
  tab: {
    paddingVertical: 12,
    marginRight: 22,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  activeTab: {
    borderBottomColor: GREEN,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: TEXT_MUTED,
    fontFamily: "Montserrat_600SemiBold",
  },
  activeTabText: {
    color: GREEN,
  },
  tabContent: {
    marginBottom: 20,
  },
  aboutCard: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 14,
  },
  infoRow: {
    flexDirection: "row",
    marginBottom: 14,
  },
  infoItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: TEXT_DARK,
    marginLeft: 8,
    fontFamily: "Poppins_400Regular",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: TEXT_DARK,
    marginTop: 20,
    marginBottom: 12,
    fontFamily: "Montserrat_600SemiBold",
  },
  descriptionText: {
    fontSize: 13,
    color: TEXT_MUTED,
    lineHeight: 20,
    fontFamily: "Poppins_400Regular",
  },
  amenityItem: {
    flexDirection: "row",
    alignItems: "center",
    width: "50%",
    paddingVertical: 8,
  },
  amenityIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: GREEN_TINT,
    justifyContent: "center",
    alignItems: "center",
  },
  amenityText: {
    flex: 1,
    fontSize: 13,
    color: TEXT_DARK,
    marginLeft: 10,
    fontFamily: "Poppins_400Regular",
  },
  dateSelectorButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: FIELD_BG,
    padding: 12,
    borderRadius: 14,
    marginBottom: 16,
  },
  dateSelectorText: {
    flex: 1,
    fontSize: 13,
    color: TEXT_DARK,
    marginLeft: 8,
    fontFamily: "Poppins_400Regular",
  },
  slotItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFF",
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: BORDER,
  },
  slotItemUnavailable: {
    backgroundColor: FIELD_BG,
    borderColor: FIELD_BG,
  },
  slotTime: {
    fontSize: 14,
    fontWeight: "600",
    color: TEXT_DARK,
    flex: 1,
    fontFamily: "Montserrat_600SemiBold",
  },
  slotPrice: {
    fontSize: 14,
    color: GREEN_DARK,
    fontWeight: "700",
    marginHorizontal: 10,
    fontFamily: "Montserrat_600SemiBold",
  },
  slotStatusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  slotStatusPillOpen: {
    backgroundColor: GREEN_TINT,
  },
  slotStatusPillBusy: {
    backgroundColor: "#F0F0F0",
  },
  slotStatus: {
    fontSize: 12,
    fontWeight: "600",
    color: GREEN_DARK,
    fontFamily: "Montserrat_600SemiBold",
  },
  slotStatusBusyText: {
    color: TEXT_MUTED,
  },
  slotTextUnavailable: {
    color: TEXT_MUTED,
  },
  slotInfoText: {
    fontSize: 12,
    color: TEXT_MUTED,
    fontStyle: "italic",
    marginTop: 10,
    textAlign: "center",
    fontFamily: "Poppins_400Regular",
  },
  reviewSummary: {
    alignItems: "center",
    marginBottom: 20,
  },
  reviewRatingLarge: {
    alignItems: "center",
  },
  reviewRatingLargeText: {
    fontSize: 36,
    fontWeight: "800",
    color: TEXT_DARK,
    fontFamily: "Montserrat_700Bold",
  },
  reviewRatingStars: {
    flexDirection: "row",
    marginVertical: 8,
  },
  reviewCountText: {
    fontSize: 13,
    color: TEXT_MUTED,
    fontFamily: "Poppins_400Regular",
  },
  reviewItem: {
    backgroundColor: "#FFF",
    padding: 14,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: BORDER,
  },
  reviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  reviewUser: {
    fontSize: 14,
    fontWeight: "700",
    color: TEXT_DARK,
    fontFamily: "Montserrat_600SemiBold",
  },
  reviewDate: {
    fontSize: 12,
    color: TEXT_MUTED,
    fontFamily: "Poppins_400Regular",
  },
  reviewRating: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: GREEN,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  reviewRatingText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#fff",
    marginRight: 3,
    fontFamily: "Montserrat_600SemiBold",
  },
  reviewComment: {
    fontSize: 13,
    color: TEXT_MUTED,
    lineHeight: 20,
    fontFamily: "Poppins_400Regular",
  },
  noReviewsContainer: {
    alignItems: "center",
    padding: 30,
  },
  noReviewsText: {
    fontSize: 16,
    fontWeight: "700",
    color: TEXT_MUTED,
    marginTop: 12,
    fontFamily: "Montserrat_600SemiBold",
  },
  noReviewsSubtext: {
    fontSize: 13,
    color: TEXT_MUTED,
    marginTop: 5,
    fontFamily: "Poppins_400Regular",
  },
  writeReviewButton: {
    flexDirection: "row",
    backgroundColor: GREEN_TINT,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    gap: 6,
  },
  writeReviewText: {
    fontSize: 14,
    fontWeight: "700",
    color: GREEN_DARK,
    fontFamily: "Montserrat_600SemiBold",
  },
  bookButtonContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: SCREEN_BG,
    paddingTop: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  bookButton: {
    backgroundColor: GREEN,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  bookButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
    fontFamily: "Montserrat_600SemiBold",
  },
});

export default VenueDetailsScreen;
