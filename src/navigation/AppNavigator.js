import React, { useState, useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { useAuth } from "../context/AuthContext";
import { useOnboarding } from "../context/OnboardingContext";
import PlayerNavigator from "./PlayerNavigator";
import ViewerNavigator from "./ViewerNavigator";
import OnboardingNavigator from "./OnboardingNavigator";
import axios from "axios";
import config from "../api/api";
import { getDeviceId } from "../utils/deviceId";

const AppNavigator = () => {
  const { isAuthenticated, isInitializing, user } = useAuth();
  const { onboardingCompleted } = useOnboarding();
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(null);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      try {
        const deviceId = await getDeviceId(); // ALWAYS use deviceId
        const userId = (isAuthenticated && user && (user.id || user._id)) || null;

        // Build URL with deviceId (required) and userId (optional)
        const url = `${config.BASE_URL}/onboarding/status?deviceId=${deviceId}${userId ? `&userId=${userId}` : ''}`;

        const response = await axios.get(url);
        setHasCompletedOnboarding(response.data.hasCompleted);
      } catch (error) {
        console.error("Error checking onboarding status:", error);
        // If error, assume onboarding not completed to be safe
        setHasCompletedOnboarding(false);
      } finally {
        setCheckingOnboarding(false);
      }
    };

    checkOnboardingStatus();
  }, [isAuthenticated, user]);

  // Listen for onboarding completion
  useEffect(() => {
    if (onboardingCompleted) {
      setHasCompletedOnboarding(true);
    }
  }, [onboardingCompleted]);

  if (isInitializing || checkingOnboarding) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#3B4DFD" />
      </View>
    );
  }

  // Check onboarding status for both authenticated and unauthenticated users
  if (hasCompletedOnboarding === false) {
    return <OnboardingNavigator />;
  }

  // If user is authenticated, route to appropriate navigator based on role
  if (isAuthenticated && user) {
    switch (user.role) {
      case "Player":
        return <PlayerNavigator />;
      default:
        // Fallback to player navigator if role is unknown but user is authenticated
        return <PlayerNavigator />;
    }
  }

  // If not authenticated (viewer), show the ViewerNavigator
  return <ViewerNavigator />;
};

export default AppNavigator;
