import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Dimensions,
  StatusBar,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useOnboarding } from "../../context/OnboardingContext";
import { useAuth } from "../../context/AuthContext";

const { width } = Dimensions.get("window");

const FEATURES = [
  {
    id: 1,
    icon: "emoji-events",
    title: "Find & Join Tournaments",
    description: "Discover exciting tournaments near you and register instantly",
    color: "#FF3B30",
  },
  {
    id: 2,
    icon: "timeline",
    title: "Track Your Performance",
    description: "Monitor your stats, rankings, and progress over time",
    color: "#34C759",
  },
  {
    id: 3,
    icon: "people",
    title: "Connect with Players",
    description: "Build your network and find teammates for tournaments",
    color: "#007AFF",
  },
  {
    id: 4,
    icon: "notifications-active",
    title: "Live Match Updates",
    description: "Get real-time scores and notifications for your matches",
    color: "#FF9500",
  },
];

const FeaturesCarousel = ({ navigation }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef(null);
  const { startScreenTimer, endScreenTimer, trackScreen, updateStep } =
    useOnboarding();
  const { user } = useAuth();

  useEffect(() => {
    startScreenTimer("Features");

    return () => {
      endScreenTimer("Features");
      // Track for both authenticated users and viewers (null userId)
      const userId = user?.id || user?._id || null;
      trackScreen(userId, "Features");
    };
  }, []);

  const handleNext = async () => {
    if (currentIndex < FEATURES.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      flatListRef.current?.scrollToIndex({
        index: nextIndex,
        animated: true,
      });
    } else {
      // Completed viewing all features
      const userId = user?.id || user?._id || null;
      await updateStep(userId, "features_viewed");
      navigation.navigate("Completion");
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      const prevIndex = currentIndex - 1;
      setCurrentIndex(prevIndex);
      flatListRef.current?.scrollToIndex({
        index: prevIndex,
        animated: true,
      });
    }
  };

  const handleSkip = () => {
    navigation.navigate("Completion");
  };

  const renderFeature = ({ item }) => (
    <View style={[styles.featureContainer, { width }]}>
      <View style={[styles.iconContainer, { backgroundColor: item.color }]}>
        <MaterialIcons name={item.icon} size={80} color="#FFF" />
      </View>
      <Text style={styles.featureTitle}>{item.title}</Text>
      <Text style={styles.featureDescription}>{item.description}</Text>
    </View>
  );

  const renderDot = (index) => (
    <View
      key={index}
      style={[
        styles.dot,
        index === currentIndex ? styles.dotActive : styles.dotInactive,
      ]}
    />
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Skip Button */}
      <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      {/* Features Carousel */}
      <FlatList
        ref={flatListRef}
        data={FEATURES}
        renderItem={renderFeature}
        keyExtractor={(item) => item.id.toString()}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        onMomentumScrollEnd={(event) => {
          const index = Math.round(
            event.nativeEvent.contentOffset.x / width
          );
          setCurrentIndex(index);
        }}
      />

      {/* Pagination Dots */}
      <View style={styles.paginationContainer}>
        {FEATURES.map((_, index) => renderDot(index))}
      </View>

      {/* Navigation Buttons */}
      <View style={styles.navigationContainer}>
        {currentIndex > 0 && (
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handlePrevious}
          >
            <MaterialIcons name="arrow-back" size={24} color="#007AFF" />
            <Text style={styles.secondaryButtonText}>Back</Text>
          </TouchableOpacity>
        )}

        <View style={{ flex: 1 }} />

        <TouchableOpacity style={styles.primaryButton} onPress={handleNext}>
          <Text style={styles.primaryButtonText}>
            {currentIndex === FEATURES.length - 1 ? "Continue" : "Next"}
          </Text>
          <MaterialIcons name="arrow-forward" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F7",
  },
  skipButton: {
    alignSelf: "flex-end",
    paddingTop: 50,
    padding: 20,
  },
  skipText: {
    color: "#007AFF",
    fontSize: 16,
    fontWeight: "600",
  },
  featureContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  iconContainer: {
    width: 160,
    height: 160,
    borderRadius: 80,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 40,
  },
  featureTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#000",
    textAlign: "center",
    marginBottom: 16,
  },
  featureDescription: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    lineHeight: 24,
  },
  paginationContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 20,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    backgroundColor: "#007AFF",
    width: 24,
  },
  dotInactive: {
    backgroundColor: "#C7C7CC",
  },
  navigationContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 12,
    marginBottom : 20,
  },
  primaryButton: {
    flexDirection: "row",
    backgroundColor: "#007AFF",
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 25,
    alignItems: "center",
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryButton: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 25,
    alignItems: "center",
    gap: 8,
    borderWidth: 2,
    borderColor: "#007AFF",
  },
  secondaryButtonText: {
    color: "#007AFF",
    fontSize: 16,
    fontWeight: "700",
  },
});

export default FeaturesCarousel;
