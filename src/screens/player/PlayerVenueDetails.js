import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { MaterialIcons } from "@expo/vector-icons";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useAuth } from "../../context/AuthContext";
import { useFocusEffect } from "@react-navigation/native";
import API from "../../api/api";

const { width } = Dimensions.get("window");

export default function PlayerVenueDetails({ route, navigation }) {
  const { turfId } = route.params;
  const [turfDetails, setTurfDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [certifiedTrainers, setCertifiedTrainers] = useState([]);
  const [loadingTrainers, setLoadingTrainers] = useState(false);
  const [error, setError] = useState(null);
  const { user } = useAuth();


  // Add this function to check if turf is in favorites when component mounts
  useFocusEffect(
    React.useCallback(() => {
      const refreshData = async () => {
        // Check favorite status
        if (user && user.id) {
          try {
            const response = await fetch(
              `${API.ENDPOINTS.USER.CHECK_FAVORITE}?userId=${user.id}&turfId=${turfId}`
            );

            if (response.ok) {
              const data = await response.json();
              setIsFavorite(data.isFavorite);
            } else {
              console.error(
                "Failed to check favorite status:",
                await response.text()
              );
            }
          } catch (error) {
            console.error("Error checking favorite status:", error);
          }
        }

        fetchCertifiedTrainers();

        // Fetch turf details if not already loaded
        if (!turfDetails) {
          fetchTurfDetails();
        }
      };

      refreshData();
    }, [turfId, user])
  );

  const fetchCertifiedTrainers = async () => {
    try {
      setLoadingTrainers(true);
      const response = await fetch(
        `${API.ENDPOINTS.TURFS.CERTIFIED_TRAINERS(turfId)}`
      );
      if (response.ok) {
        const data = await response.json();
        setCertifiedTrainers(data);
      }
    } catch (error) {
      console.error("Error fetching certified trainers:", error);
    } finally {
      setLoadingTrainers(false);
    }
  };

  const fetchTurfDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(API.ENDPOINTS.TURFS.BY_ID(turfId));

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      setTurfDetails(data);
      setError(null);
    } catch (error) {
      console.error("Error fetching turf details:", error);
      setError(error.message);
      Alert.alert(
        "Error",
        "Failed to load venue details. Please try again later."
      );
    } finally {
      setLoading(false);
    }
  };

  // function to toggle favorite status
  const toggleFavorite = async () => {
    try {
      if (!user || !user.id) {
        Alert.alert("Login Required", "Please login to save favorites", [
          { text: "Cancel", style: "cancel" },
          { text: "Login", onPress: () => navigation.navigate("Login") },
        ]);
        return;
      }

      // Optimistically update UI
      const newFavoriteState = !isFavorite;
      setIsFavorite(newFavoriteState);

      const response = await fetch(API.ENDPOINTS.USER.TOGGLE_FAVORITE, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.id,
          turfId,
          action: newFavoriteState ? "add" : "remove",
        }),
      });

      if (!response.ok) {
        // Revert on failure
        setIsFavorite(!newFavoriteState);
        throw new Error("Failed to update favorite status");
      }

      // Show alert dialog based on action
      if (newFavoriteState) {
        Alert.alert(
          "Added to Favorites",
          "This venue has been added to your favorites.",
          [{ text: "OK", style: "default" }],
          { cancelable: true }
        );
      } else {
        Alert.alert(
          "Removed from Favorites",
          "This venue has been removed from your favorites.",
          [{ text: "OK", style: "default" }],
          { cancelable: true }
        );
      }
    } catch (error) {
      console.error("Error toggling favorite:", error);
      Alert.alert("Error", "Could not update favorites. Please try again.");
    }
  };

  const getSportIcon = (sportName) => {
    if (!sportName) return require("../../../assets/ping-pong.png");

    const sport = (sportName || "").toLowerCase().trim();
    const iconMap = {
      cricket: require("../../../assets/sports_cricket.png"),
      football: require("../../../assets/sports_soccer.png"),
      soccer: require("../../../assets/sports_soccer.png"),
      badminton: require("../../../assets/shuttlecock.png"),
      "table tennis": require("../../../assets/ping-pong.png"),
      tennis: require("../../../assets/ping-pong.png"),
    };
    return iconMap[sport] || require("../../../assets/ping-pong.png");
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B00" />
        <Text style={styles.loadingText}>Loading venue details...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Error: {error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchTurfDetails}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!turfDetails) {
    return (
      <View style={styles.errorContainer}>
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

  const images =
    turfDetails.images && turfDetails.images.length > 0
      ? turfDetails.images
          .map((img) => ({
            uri: img ? `${API.UPLOADS_URL}/${img}` : null,
          }))
          .filter((img) => img.uri)
      : [{ uri: null }];

  const ImageCarousel = () => {
    const handlePrevImage = () => {
      setActiveImageIndex((prevIndex) =>
        prevIndex > 0 ? prevIndex - 1 : images.length - 1
      );
    };

    const handleNextImage = () => {
      setActiveImageIndex((prevIndex) =>
        prevIndex < images.length - 1 ? prevIndex + 1 : 0
      );
    };

    return (
      <View style={styles.carouselWrapper}>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={(event) => {
            const slideIndex = Math.round(
              event.nativeEvent.contentOffset.x / width
            );
            setActiveImageIndex(slideIndex);
          }}
          scrollEventThrottle={16}
          contentContainerStyle={styles.scrollViewCarousel}
        >
          {images.map((image, index) => (
            <View key={index} style={styles.imageWrapper}>
              <Image
                source={
                  image.uri
                    ? { uri: image.uri }
                    : require("../../../assets/turf.jpg")
                }
                style={styles.image}
                resizeMode="cover"
              />
            </View>
          ))}
        </ScrollView>

        {/* Navigation Arrows */}
        {images.length > 1 && (
          <>
            <TouchableOpacity
              style={styles.leftArrow}
              onPress={handlePrevImage}
            >
              <Ionicons name="chevron-back" size={15} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.rightArrow}
              onPress={handleNextImage}
            >
              <Ionicons name="chevron-forward" size={15} color="#fff" />
            </TouchableOpacity>
          </>
        )}

        {/* Indicator */}
        <View style={styles.indicatorContainer}>
          {images.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                activeImageIndex === index && styles.activeDot,
              ]}
            />
          ))}
        </View>
      </View>
    );
  };

  const CertifiedTrainersSection = ({ trainers, loading }) => {
    if (loading) {
      return (
        <View style={styles.trainersContainer}>
          <Text style={styles.sectionTitle}>Our Certified Trainers</Text>
          <ActivityIndicator size="small" color="#FF6B00" />
        </View>
      );
    }

    if (!trainers || trainers.length === 0) {
      return null;
    }

    return (
      <View style={styles.trainersContainer}>
        <Text style={styles.sectionTitle}>Our Certified Trainers</Text>
        <View style={styles.trainersListContainer}>
          {trainers.map((trainer, index) => {
            let imageUrl = trainer.profileImage;
            if (imageUrl && imageUrl.startsWith("/")) {
              imageUrl = `${API.BASE_URL}${imageUrl}`;
            }

            return (
              <View key={index} style={styles.trainerListCard}>
                <Image
                  source={
                    imageUrl
                      ? { uri: imageUrl }
                      : require("../../../assets/trainer.jpg")
                  }
                  style={styles.trainerListImage}
                />

                <View style={styles.trainerListInfo}>
                  <View style={styles.trainerHeader}>
                    <Text style={styles.trainerListName}>
                      {trainer.firstName} {trainer.lastName}
                    </Text>
                    <View style={styles.ratingSection}>
                      <Ionicons name="star" size={16} color="#FFD700" />
                      <Text style={styles.ratingValue}>
                        {trainer.rating ? trainer.rating.toFixed(1) : "0"}/5
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.verifiedText}>
                    {trainer.verifiedClubsCount
                      ? `Verified by ${trainer.verifiedClubsCount} club${
                          trainer.verifiedClubsCount > 1 ? "s" : ""
                        }`
                      : "Not verified yet"}
                  </Text>

                  <View style={styles.sportsAndDetails}>
                    <View style={styles.sportsList}>
                      {trainer.sports?.slice(0, 2).map((sport, sportIndex) => (
                        <View key={sportIndex} style={styles.sportBadge}>
                          <Text style={styles.sportBadgeText}>{sport}</Text>
                        </View>
                      ))}
                      {trainer.sports?.length > 2 && (
                        <View style={styles.sportBadge}>
                          <Text style={styles.sportBadgeText}>
                            +{trainer.sports.length - 2}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Image Carousel */}
        <ImageCarousel />

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.favoriteButton}
            onPress={toggleFavorite}
          >
            <Ionicons
              name={isFavorite ? "heart" : "heart-outline"}
              size={28}
              color={isFavorite ? "#FF6A00" : "#666"}
            />
          </TouchableOpacity>
        </View>

        {/* Venue Info Card */}
        <View style={styles.venueCard}>
          <Text style={styles.cardTitle}>{turfDetails.name || "NA"}</Text>

          <View style={styles.rowBetween}>
            <View style={styles.addressContainer}>
              <Text style={styles.label}>Address :</Text>
              <Text style={styles.address}>
                {turfDetails.address
                  ? [
                      turfDetails.address.streetAddress,
                      turfDetails.address.area,
                      turfDetails.address.city,
                      turfDetails.address.pincode
                        ? `- ${turfDetails.address.pincode}`
                        : "",
                    ]
                      .filter(Boolean)
                      .join(", ") || "NA"
                  : "NA"}
              </Text>
            </View>

            <View style={styles.direction}>
              <MaterialIcons name="directions" size={24} color="#007BFF" />
              <Text style={styles.distance}>
                {turfDetails.distance || "NA"}
              </Text>
            </View>
          </View>

          {turfDetails.clubName && (
            <View style={styles.clubContainer}>
              <Text style={styles.label}>Club :</Text>
              <Text style={styles.clubName}>{turfDetails.clubName}</Text>
            </View>
          )}

          <Text style={styles.price}>
            ₹{" "}
            <Text style={styles.priceValue}>
              {turfDetails.pricePerHour || "NA"}
            </Text>{" "}
            onward
          </Text>

          <View style={styles.additionalInfoContainer}>
            <Text style={styles.time}>
              <Text style={styles.label}>Time :</Text>{" "}
              {turfDetails.operatingHours || "NA"}
            </Text>
            <View style={styles.ratingBlock}>
              {Array.from({ length: 5 }).map((_, i) => (
                <Ionicons
                  key={i}
                  name={
                    i < Math.floor(turfDetails.ratings?.average || 0)
                      ? "star"
                      : "star-outline"
                  }
                  size={18}
                  color="#FFD700"
                />
              ))}
              <Text style={styles.ratingText}>
                {turfDetails.ratings?.average
                  ? turfDetails.ratings.average.toFixed(1)
                  : "NA"}
                /5 ({turfDetails.ratings?.count || "NA"})
              </Text>
            </View>
          </View>
        </View>

        {/* Available Sports Section */}
        <AvailableSports
          sports={turfDetails.sports || []}
          getSportIcon={getSportIcon}
        />

        {/* About Turf Section */}
        <AboutTurf
          description={turfDetails.description || "No description available"}
        />

        {/* Amenities Section */}
        <AmenitiesSection amenities={turfDetails.amenities || []} />

        {/* Turf Rules Section */}
        <TurfRulesSection rules={turfDetails.rules || []} />

        {/* Certified Trainers Section */}
        <CertifiedTrainersSection
          trainers={certifiedTrainers}
          loading={loadingTrainers}
        />

        {/* Book Now Button */}
        <BookNowButton turfId={turfId} navigation={navigation} />
      </ScrollView>
    </View>
  );
}

const AvailableSports = ({ sports = [], getSportIcon }) => {
  if (!sports || sports.length === 0) {
    return (
      <View style={styles.sportsContainer}>
        <Text style={styles.sectionTitle}>Available Sports</Text>
        <Text style={styles.noDataText}>No sports information available</Text>
      </View>
    );
  }

  return (
    <View style={styles.sportsContainer}>
      <Text style={styles.sectionTitle}>Available Sports</Text>
      <View style={styles.sportsRow}>
        {sports.map((sport, index) => {
          const sportName = sport
            ? typeof sport === "string"
              ? sport
              : sport.name || "Unknown"
            : "Unknown";

          return (
            <View key={index} style={styles.sportItem}>
              <View style={styles.sportIconWrap}>
                <Image
                  source={getSportIcon(sportName)}
                  style={styles.sportIcon}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.sportLabel}>{sportName}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const AboutTurf = ({ description }) => {
  const [showMore, setShowMore] = useState(false);

  if (!description) {
    return (
      <View style={styles.aboutContainer}>
        <Text style={styles.sectionTitle}>About Turf</Text>
        <Text style={styles.noDataText}>No description available</Text>
      </View>
    );
  }

  return (
    <View style={styles.aboutContainer}>
      <Text style={styles.sectionTitle}>About Turf</Text>
      <Text style={styles.aboutText}>
        {showMore
          ? description
          : description.length > 200
          ? description.slice(0, 200) + "..."
          : description}
      </Text>

      {description.length > 200 && (
        <TouchableOpacity
          onPress={() => setShowMore(!showMore)}
          style={styles.readMoreContainer}
        >
          <View style={styles.readMoreView}>
            <Text style={styles.readMoreText}>
              {showMore ? "Read Less" : "Read More"}
            </Text>
            <Ionicons
              name={showMore ? "chevron-up" : "chevron-down"}
              size={14}
              color="#007bff"
              style={styles.readMoreIcon}
            />
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
};

const AmenitiesSection = ({ amenities }) => {
  if (!amenities || amenities.length === 0) {
    return (
      <View style={styles.amenitiesContainer}>
        <Text style={styles.sectionTitle}>Amenities</Text>
        <Text style={styles.noDataText}>
          No amenities information available
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.amenitiesContainer}>
      <Text style={styles.sectionTitle}>Amenities</Text>
      <View style={styles.amenitiesWrap}>
        {amenities.map((item, idx) => (
          <View key={idx} style={styles.amenityItem}>
            <MaterialCommunityIcons
              name={getAmenityIcon(item)}
              size={18}
              color="#666666"
            />
            <Text style={styles.amenityLabel}>{item}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const getAmenityIcon = (amenity) => {
  const iconMap = {
    "Artificial Turf": "sprout-outline",
    "Drinking Water": "cup-water",
    "Seating Lounge": "sofa",
    Restroom: "toilet",
    Parking: "parking",
    "Changing Room": "wardrobe",
    // Add more mappings as needed
  };
  return iconMap[amenity] || "check-circle-outline";
};

const TurfRulesSection = ({ rules }) => {
  if (!rules || rules.length === 0) {
    return (
      <View style={styles.rulesContainer}>
        <Text style={styles.sectionTitle}>Turf Rules</Text>
        <Text style={styles.noDataText}>No rules information available</Text>
      </View>
    );
  }

  return (
    <View style={styles.rulesContainer}>
      <Text style={styles.sectionTitle}>Turf Rules</Text>
      <Text style={styles.rulesHeader}>Rules & Regulations</Text>
      <View style={styles.bulletList}>
        {rules.map((rule, index) => (
          <Text key={index} style={styles.bulletPoint}>
            {"\u2022"} {rule}
          </Text>
        ))}
      </View>
    </View>
  );
};

const BookNowButton = ({ turfId, navigation }) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleBookNow = () => {
    setIsLoading(true);

    // Simulate API call with timeout
    setTimeout(() => {
      setIsLoading(false);
      navigation.navigate("TurfBooking", { turfId: turfId });
    }, 800);
  };

  return (
    <View style={styles.bookButtonContainer}>
      <TouchableOpacity
        style={styles.bookButton}
        onPress={handleBookNow}
        disabled={isLoading}
        activeOpacity={0.8}
      >
        {isLoading ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <>
            <Text style={styles.bookButtonText}>Book Now</Text>
            <View style={styles.arrowContainer}>
              <Text style={styles.arrowIcon}>›</Text>
            </View>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
};

// const BookNowButton = ({ turfId, navigation }) => {
//   const [isOrange, setIsOrange] = useState(true);

//   const handleBookNow = () => {
//     console.log(`Booking turf with ID: ${turfId}`);
//     // Navigate to booking screen based on the turf ID
//     navigation.navigate("BookingScreen", { turfId: turfId });
//   };

//   const handleButtonToggle = () => {
//     setIsOrange(!isOrange);
//   };

//   const renderButtonContent = () => {
//     if (isOrange) {
//       return (
//         <TouchableOpacity
//           style={[styles.button, styles.orangeButton]}
//           onPress={() => {
//             handleBookNow();
//             handleButtonToggle();
//           }}
//         >
//           <View style={styles.iconCircle}>
//             <Text style={[styles.iconText, { color: "#FF6A00" }]}>{"»"}</Text>
//           </View>
//           <Text style={styles.buttonText}>Book Now</Text>
//         </TouchableOpacity>
//       );
//     }

//     return (
//       <TouchableOpacity
//         style={[styles.button, styles.blueButton]}
//         onPress={() => {
//           handleBookNow();
//           handleButtonToggle();
//         }}
//       >
//         <Text style={[styles.iconText, styles.blueArrowText]}>{"»»»»"}</Text>
//         <View style={styles.iconCircleRight}>
//           <Text style={[styles.iconText1, { color: "#1D6B88" }]}>{"›"}</Text>
//         </View>
//       </TouchableOpacity>
//     );
//   };

//   return <View style={styles.bcontainer}>{renderButtonContent()}</View>;
// };

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f2f4f7",
  },
  headerActions: {
    position: "absolute",
    top: 20,
    right: 16,
    flexDirection: "row",
    zIndex: 10,
  },
  trainersListContainer: {
    marginTop: 8,
  },
  trainerListCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  trainerListImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    marginRight: 12,
  },
  trainerListInfo: {
    flex: 1,
    justifyContent: "space-between",
  },
  trainerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  trainerListName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    flex: 1,
  },
  ratingSection: {
    flexDirection: "row",
    alignItems: "center",
  },
  ratingValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginLeft: 2,
  },
  ratingCount: {
    fontSize: 14,
    color: "#666",
    marginLeft: 2,
  },
  verifiedText: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  sportsAndDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sportsList: {
    flexDirection: "row",
    flex: 1,
  },
  sportBadge: {
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  sportBadgeText: {
    fontSize: 12,
    color: "#333",
    fontWeight: "500",
  },
  viewDetailsButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  viewDetailsText: {
    fontSize: 14,
    color: "#007AFF",
    marginRight: 4,
  },
  clubContainer: {
    marginTop: 8,
  },
  clubName: {
    fontSize: 14,
    color: "#555",
    marginTop: 2,
    fontWeight: "500",
  },
  favoriteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
    marginTop: 30,
  },
  scrollViewContent: {
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    color: "#FF6B00",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    color: "red",
    fontSize: 18,
    marginBottom: 20,
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: "#FF6B00",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  carouselWrapper: {
    marginTop: 40,
    alignItems: "center",
  },
  imageWrapper: {
    width: width,
    height: 250,
    borderRadius: 16,
    overflow: "hidden",
    elevation: 4,
    backgroundColor: "#fff",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  leftArrow: {
    position: "absolute",
    left: 10,
    top: "45%",
    zIndex: 2,
    backgroundColor: "rgba(0,0,0,0.4)",
    padding: 5,
    borderRadius: 20,
  },
  rightArrow: {
    position: "absolute",
    right: 10,
    top: "45%",
    zIndex: 2,
    backgroundColor: "rgba(0,0,0,0.4)",
    padding: 5,
    borderRadius: 20,
  },
  indicatorContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 2,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#ccc",
    marginHorizontal: 4,
  },
  activeDot: {
    width: 20,
    backgroundColor: "#FF7A00",
    borderRadius: 5,
  },
  venueCard: {
    marginHorizontal: 16,
    marginTop: 20,
    padding: 16,
    backgroundColor: "#fff",
    borderRadius: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 6,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  addressContainer: {
    flex: 1,
    paddingRight: 8,
  },
  label: {
    fontSize: 15,
    fontWeight: "600",
    color: "#222",
  },
  address: {
    fontSize: 14,
    lineHeight: 22,
    color: "#555",
    marginTop: 2,
    fontFamily: "Roboto",
    fontWeight: "400",
    letterSpacing: -0.41,
    textAlignVertical: "center",
  },
  direction: {
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  distance: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  price: {
    marginTop: 8,
    fontSize: 15,
    color: "#222",
  },
  priceValue: {
    fontWeight: "600",
  },
  additionalInfoContainer: {
    marginTop: 6,
  },
  time: {
    fontSize: 14,
    color: "#222",
  },
  ratingBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginTop: 6,
  },
  ratingText: {
    fontSize: 13,
    color: "#444",
    marginLeft: 6,
  },
  trainersContainer: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 8,
  },
  trainersRow: {
    flexDirection: "row",
    gap: 12,
  },
  trainerCard: {
    width: 120,
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  trainerImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: 8,
  },
  trainerName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
    marginBottom: 4,
  },
  trainerSports: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
    marginBottom: 2,
  },
  trainerExperience: {
    fontSize: 11,
    color: "#999",
    textAlign: "center",
  },
  noDataText: {
    fontSize: 14,
    color: "#888",
    fontStyle: "italic",
    marginVertical: 8,
  },
  sportsContainer: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
    color: "#333",
  },
  sportsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
  },
  sportItem: {
    alignItems: "center",
    width: 70,
  },
  sportIconWrap: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: "#1D6A8B",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#E6F0FA",
  },
  sportIcon: {
    width: 24,
    height: 24,
  },
  sportLabel: {
    fontSize: 12,
    textAlign: "center",
    color: "#333",
    marginTop: 4,
  },
  aboutContainer: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 8,
  },
  aboutText: {
    fontSize: 14,
    fontWeight: "400",
    color: "#666666",
    lineHeight: 22,
    marginBottom: 8,
  },
  readMoreContainer: {
    alignSelf: "flex-end",
  },
  readMoreView: {
    flexDirection: "row",
    alignItems: "center",
  },
  readMoreText: {
    fontSize: 14,
    color: "#007bff",
    fontWeight: "500",
    marginRight: 4,
  },
  readMoreIcon: {
    marginTop: 2,
  },
  amenitiesContainer: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 8,
  },
  amenitiesWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 10,
  },
  amenityItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: "#f1f4f9",
    borderRadius: 20,
  },
  amenityLabel: {
    fontSize: 13,
    color: "#444",
    marginLeft: 6,
  },
  rulesContainer: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
  },
  rulesHeader: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
    marginBottom: 6,
  },
  bulletList: {
    marginBottom: 12,
  },
  bulletPoint: {
    fontSize: 14,
    color: "#555",
    marginBottom: 4,
  },
  bcontainer: {
    alignItems: "center",
    height: 60,
    width: "100%",
    paddingHorizontal: 16,
    marginTop: 16,
  },
  bookButtonContainer: {
    width: "100%",
    paddingHorizontal: 16,
    marginTop: 24,
    marginBottom: 16,
    alignItems: "center",
  },
  bookButton: {
    width: "100%",
    height: 56,
    backgroundColor: "#FF6B00",
    borderRadius: 28,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    // Add shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  bookButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.5,
    marginRight: 8,
  },
  arrowContainer: {
    marginLeft: 4,
  },
  arrowIcon: {
    color: "white",
    fontSize: 24,
    fontWeight: "bold",
  },
  orangeButton: {
    backgroundColor: "#FF6A00",
    justifyContent: "flex-start",
  },
  blueButton: {
    backgroundColor: "#1D6B88",
    justifyContent: "space-between",
  },
  iconText: {
    fontSize: 45,
    fontWeight: "bold",
    alignItems: "center",
    marginTop: -11,
    marginLeft: 25,
  },
  blueArrowText: {
    color: "#FFFFFF",
    fontSize: 45,
    fontWeight: "bold",
    marginTop: -25,
    right: -55,
  },
  iconCircle: {
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    marginLeft: -10,
    height: 40,
    width: 66,
    justifyContent: "center",
    alignItems: "center",
  },
  iconCircleRight: {
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    height: 40,
    width: 66,
    marginRight: -12,
    justifyContent: "center",
    alignItems: "center",
  },
  iconText1: {
    fontSize: 45,
    fontWeight: "bold",
    marginTop: -11,
    marginLeft: 30,
  },
});

// Export the component for use in other files
export { PlayerVenueDetails };
