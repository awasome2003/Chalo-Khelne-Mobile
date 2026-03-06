import React, { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  StatusBar,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useOnboarding } from "../../context/OnboardingContext";
import { useAuth } from "../../context/AuthContext";

const WelcomeScreen = ({ navigation }) => {
  const { startScreenTimer, endScreenTimer, trackScreen, skipOnboarding } = useOnboarding();
  const { user } = useAuth();

  useEffect(() => {
    startScreenTimer("Welcome");

    return () => {
      endScreenTimer("Welcome");
      // Track for both authenticated users and viewers (null userId)
      const userId = user?.id || user?._id || null;
      trackScreen(userId, "Welcome");
    };
  }, []);

  const handleGetStarted = () => {
    navigation.navigate("Features");
  };

  const handleSkip = async () => {
    const userId = user?.id || user?._id || null;
    await skipOnboarding(userId);
    // Onboarding completion will trigger navigation automatically
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Skip Button */}
      <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      {/* Logo/Icon */}
      <View style={styles.logoContainer}>
        <View style={styles.logoCircle}>
          <MaterialIcons name="sports-tennis" size={80} color="#FFF" />
        </View>
      </View>

      {/* Title */}
      <View style={styles.contentContainer}>
        <Text style={styles.title}>Welcome to{"\n"}Chalo Khelne!</Text>
        <Text style={styles.subtitle}>
          Your ultimate sports companion for tournaments, matches, and more
        </Text>
      </View>

      {/* Get Started Button */}
      <TouchableOpacity style={styles.button} onPress={handleGetStarted}>
        <Text style={styles.buttonText}>Get Started</Text>
        <MaterialIcons name="arrow-forward" size={24} color="#FFF" />
      </TouchableOpacity>

      {/* Decorative Elements */}
      <View style={styles.decorativeCircle1} />
      <View style={styles.decorativeCircle2} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#007AFF",
    padding: 20,
    justifyContent: "space-between",
  },
  skipButton: {
    alignSelf: "flex-end",
    paddingTop: 50,
    padding: 10,
  },
  skipText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
  },
  logoContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  logoCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  contentContainer: {
    marginBottom: 40,
  },
  title: {
    fontSize: 42,
    fontWeight: "800",
    color: "#FFF",
    textAlign: "center",
    marginBottom: 16,
    lineHeight: 50,
  },
  subtitle: {
    fontSize: 18,
    color: "rgba(255, 255, 255, 0.9)",
    textAlign: "center",
    lineHeight: 26,
    paddingHorizontal: 20,
  },
  button: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    paddingVertical: 18,
    paddingHorizontal: 40,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginBottom: 40,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonText: {
    color: "#007AFF",
    fontSize: 18,
    fontWeight: "700",
  },
  // Decorative elements
  decorativeCircle1: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    top: -50,
    left: -50,
  },
  decorativeCircle2: {
    position: "absolute",
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    bottom: 100,
    right: -30,
  },
});

export default WelcomeScreen;
