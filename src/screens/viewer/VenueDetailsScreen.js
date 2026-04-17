import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  FlatList,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import API from "../../api/api";
import useBottomInset from "../../hooks/useBottomInset";

const VenueDetailsScreen = ({ route, navigation }) => {
  const bottom = useBottomInset();
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
      const response = await fetch(API.ENDPOINTS.TURFS.BY_ID(venueId));
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
          images: data.images?.map((img) => `${API.UPLOADS_URL}/${img}`) || [],
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
        color="#555"
      />
      <Text style={styles.amenityText}>{item}</Text>
    </View>
  );

  const renderSlotItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.slotItem, !item.available && styles.slotItemUnavailable]}
      disabled={!item.available}
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
      <Text
        style={[
          styles.slotStatus,
          !item.available && styles.slotTextUnavailable,
        ]}
      >
        {item.available ? "Available" : "Booked"}
      </Text>
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
        <ActivityIndicator size="large" color="#ff5722" />
        <Text style={styles.loadingText}>Loading venue details...</Text>
      </View>
    );
  }

  // Show error message
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={60} color="#f44336" />
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
        <Ionicons name="search-outline" size={60} color="#666" />
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
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Venue Images */}
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
          {venue.discount && (
            <View style={styles.discountBadge}>
              <Ionicons name="pricetag" size={14} color="#fff" />
              <Text style={styles.discountText}>{venue.discount}</Text>
            </View>
          )}
        </View>

        {/* Venue Info */}
        <View style={styles.infoContainer}>
          <View style={styles.venueHeader}>
            <View>
              <Text style={styles.venueName}>{venue.name}</Text>
              <View style={styles.ratingContainer}>
                <Ionicons name="star" size={18} color="#FFC107" />
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
            >
              <Ionicons
                name={venue.favorite ? "heart" : "heart-outline"}
                size={24}
                color={venue.favorite ? "#f44336" : "#666"}
              />
            </TouchableOpacity>
          </View>

          <Text style={styles.venueLocation}>
            <Ionicons name="location-outline" size={16} color="#666" />{" "}
            {venue.location}
          </Text>

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
              <View style={styles.infoRow}>
                <View style={styles.infoItem}>
                  <Ionicons name="call-outline" size={18} color="#666" />
                  <Text style={styles.infoText}>{venue.phone}</Text>
                </View>
                <View style={styles.infoItem}>
                  <Ionicons name="mail-outline" size={18} color="#666" />
                  <Text style={styles.infoText}>{venue.email}</Text>
                </View>
              </View>

              <View style={styles.infoRow}>
                <View style={styles.infoItem}>
                  <Ionicons name="globe-outline" size={18} color="#666" />
                  <Text style={styles.infoText}>{venue.website}</Text>
                </View>
                <View style={styles.infoItem}>
                  <Ionicons name="time-outline" size={18} color="#666" />
                  <Text style={styles.infoText}>{venue.openingHours}</Text>
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
              <TouchableOpacity style={styles.dateSelectorButton}>
                <Ionicons name="calendar-outline" size={18} color="#666" />
                <Text style={styles.dateSelectorText}>
                  {new Date().toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </Text>
                <Ionicons name="chevron-down" size={18} color="#666" />
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
                        color="#FFC107"
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
                  <Text style={styles.noReviewsText}>No reviews yet</Text>
                  <Text style={styles.noReviewsSubtext}>
                    Be the first to review this venue
                  </Text>
                </View>
              )}

              <TouchableOpacity
                style={styles.writeReviewButton}
                onPress={() =>
                  Alert.alert("Review", "Please sign in to write a review")
                }
              >
                <Text style={styles.writeReviewText}>Write a Review</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Book Now Button */}
      <View style={[styles.bookButtonContainer, { paddingBottom: 15 + bottom }]}>
        <TouchableOpacity
          style={styles.bookButton}
          onPress={() =>
            Alert.alert("Booking", "Please sign in to access booking features")
          }
        >
          <Text style={styles.bookButtonText}>Book Now</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#f5f5f5",
  },
  errorText: {
    fontSize: 18,
    color: "#666",
    textAlign: "center",
    marginTop: 10,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: "#ff5722",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  shareButton: {
    padding: 5,
  },
  imageContainer: {
    position: "relative",
    height: 220,
  },
  venueImage: {
    width: 435, // Adjust based on your screen width
    height: 220,
  },
  discountBadge: {
    position: "absolute",
    top: 15,
    right: 15,
    backgroundColor: "#ff5722",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  discountText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
    marginLeft: 3,
  },
  infoContainer: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: -20,
    padding: 20,
    paddingBottom: 100,
  },
  venueHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  venueName: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 5,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  ratingText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginLeft: 5,
  },
  ratingCount: {
    fontSize: 14,
    color: "#777",
    marginLeft: 5,
  },
  favoriteButton: {
    padding: 5,
  },
  venueLocation: {
    fontSize: 14,
    color: "#666",
    marginTop: 10,
    marginBottom: 15,
  },
  sportsList: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 20,
  },
  sportTag: {
    backgroundColor: "#f0f0f0",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 15,
    marginRight: 10,
    marginBottom: 10,
  },
  sportText: {
    fontSize: 13,
    color: "#555",
  },
  tabContainer: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    marginBottom: 20,
  },
  tab: {
    paddingVertical: 12,
    marginRight: 20,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  activeTab: {
    borderBottomColor: "#ff5722",
  },
  tabText: {
    fontSize: 15,
    fontWeight: "500",
    color: "#999",
  },
  activeTabText: {
    color: "#ff5722",
  },
  tabContent: {
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: "row",
    marginBottom: 15,
  },
  infoItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  infoText: {
    fontSize: 14,
    color: "#666",
    marginLeft: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginTop: 20,
    marginBottom: 10,
  },
  descriptionText: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
  amenityItem: {
    flexDirection: "row",
    alignItems: "center",
    width: "50%",
    paddingVertical: 8,
  },
  amenityText: {
    fontSize: 14,
    color: "#666",
    marginLeft: 8,
  },
  dateSelectorButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    padding: 10,
    borderRadius: 8,
    marginBottom: 15,
  },
  dateSelectorText: {
    flex: 1,
    fontSize: 14,
    color: "#666",
    marginLeft: 8,
  },
  slotItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#f9f9f9",
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  slotItemUnavailable: {
    backgroundColor: "#f0f0f0",
    borderColor: "#e0e0e0",
  },
  slotTime: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
    flex: 1,
  },
  slotPrice: {
    fontSize: 14,
    color: "#ff5722",
    fontWeight: "bold",
    marginHorizontal: 10,
  },
  slotStatus: {
    fontSize: 13,
    color: "#4CAF50",
  },
  slotTextUnavailable: {
    color: "#999",
  },
  slotInfoText: {
    fontSize: 13,
    color: "#666",
    fontStyle: "italic",
    marginTop: 10,
    textAlign: "center",
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
    fontWeight: "bold",
    color: "#333",
  },
  reviewRatingStars: {
    flexDirection: "row",
    marginVertical: 8,
  },
  reviewCountText: {
    fontSize: 14,
    color: "#666",
  },
  reviewItem: {
    backgroundColor: "#f9f9f9",
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  reviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  reviewUser: {
    fontSize: 15,
    fontWeight: "500",
    color: "#333",
  },
  reviewDate: {
    fontSize: 13,
    color: "#999",
  },
  reviewRating: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#4CAF50",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  reviewRatingText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#fff",
    marginRight: 3,
  },
  reviewComment: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
  noReviewsContainer: {
    alignItems: "center",
    padding: 30,
  },
  noReviewsText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#666",
  },
  noReviewsSubtext: {
    fontSize: 14,
    color: "#999",
    marginTop: 5,
  },
  writeReviewButton: {
    backgroundColor: "#f0f0f0",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  writeReviewText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#666",
  },
  bookButtonContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  bookButton: {
    backgroundColor: "#ff5722",
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  bookButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
  },
});

export default VenueDetailsScreen;
