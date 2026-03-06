import React, { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useOnboarding } from "../../context/OnboardingContext";
import { useAuth } from "../../context/AuthContext";

const { width } = Dimensions.get("window");

const CompletionScreen = ({ navigation }) => {
  const { completeOnboarding, startScreenTimer, endScreenTimer, trackScreen } =
    useOnboarding();
  const { user } = useAuth();

  useEffect(() => {
    startScreenTimer("Completion");

    return () => {
      endScreenTimer("Completion");
      // Track for both authenticated users and viewers (null userId)
      const userId = user?.id || user?._id || null;
      trackScreen(userId, "Completion");
    };
  }, []);

  const handleGetStarted = async () => {
    try {
      const userId = user?.id || user?._id || null;
      await completeOnboarding(userId);
      // The app will automatically re-render and navigate to main app
    } catch (error) {
      console.error("Error completing onboarding:", error);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Success Icon */}
        <View style={styles.iconContainer}>
          <View style={styles.successCircle}>
            <MaterialIcons name="check" size={80} color="#FFF" />
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title}>You're All Set!</Text>

        {/* Description */}
        <Text style={styles.description}>
          Your profile is ready. Let's find your next tournament and start
          playing!
        </Text>

        {/* Features Summary */}
        <View style={styles.featuresList}>
          <View style={styles.featureItem}>
            <MaterialIcons name="check-circle" size={24} color="#34C759" />
            <Text style={styles.featureText}>Profile created</Text>
          </View>
          <View style={styles.featureItem}>
            <MaterialIcons name="check-circle" size={24} color="#34C759" />
            <Text style={styles.featureText}>Preferences saved</Text>
          </View>
          <View style={styles.featureItem}>
            <MaterialIcons name="check-circle" size={24} color="#34C759" />
            <Text style={styles.featureText}>Ready to compete</Text>
          </View>
        </View>
      </View>

      {/* Get Started Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.startButton}
          onPress={handleGetStarted}
          activeOpacity={0.8}
        >
          <Text style={styles.startButtonText}>Start Exploring</Text>
          <MaterialIcons name="arrow-forward" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF",
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
  },
  iconContainer: {
    marginBottom: 40,
  },
  successCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "#34C759",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#34C759",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#1C1C1E",
    marginBottom: 15,
    textAlign: "center",
  },
  description: {
    fontSize: 17,
    color: "#8E8E93",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 40,
  },
  featuresList: {
    width: "100%",
    backgroundColor: "#F2F2F7",
    borderRadius: 16,
    padding: 20,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 8,
  },
  featureText: {
    fontSize: 16,
    color: "#1C1C1E",
    marginLeft: 12,
    fontWeight: "500",
  },
  footer: {
    paddingHorizontal: 30,
    paddingBottom: 50,
  },
  startButton: {
    backgroundColor: "#007AFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    borderRadius: 14,
    shadowColor: "#007AFF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  startButtonText: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "600",
    marginRight: 8,
  },
});

export default CompletionScreen;
