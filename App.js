import React, { useEffect } from "react";
import * as WebBrowser from "expo-web-browser";
import { NavigationContainer, useNavigationContainerRef } from "@react-navigation/native";

WebBrowser.maybeCompleteAuthSession();
import { StatusBar, BackHandler, Alert } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import AppNavigator from "./src/navigation/AppNavigator";
import { AuthProvider } from "./src/context/AuthContext";
import { OnboardingProvider } from "./src/context/OnboardingContext";
import FlashMessage from "react-native-flash-message";
import Toast from 'react-native-toast-message';
import NotificationService from "./src/services/NotificationService";

const linking = {
  prefixes: ["chalokhelne://"],
  config: {
    screens: {
      // PlayerNavigator (Authenticated)
      Home: {
        initialRouteName: "PlayerHome",
        screens: {
          "Tournament Details": "tournament/details/:tournamentId",
        },
      },
      Events: {
        initialRouteName: "EventScreen",
        screens: {
          "Tournament Details": "tournament/details/:tournamentId",
        },
      },
      // ViewerNavigator (Unauthenticated)
      Event: {
        initialRouteName: "ViewerEvents",
        screens: {
          EventDetails: "tournament/details/:tournamentId",
        },
      },
    },
  },
};

export default function App() {
  const navigationRef = useNavigationContainerRef();

  useEffect(() => {
    // Register navigation ref for notifications
    NotificationService.setNavigationRef(navigationRef);

    const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBackButton);
    return () => backHandler.remove();
  }, []);

  // Function to handle app exit confirmation
  const handleBackButton = () => {
    Alert.alert(
      "Exit App",
      "Do you actually want to exit the application?",
      [
        {
          text: "Cancel",
          style: "cancel",
          onPress: () => { }, // Do nothing, just close the alert
        },
        {
          text: "Exit",
          style: "destructive",
          onPress: () => BackHandler.exitApp() // For Android
        }
      ]
    );
    return true; // Prevent default back behavior
  };

  return (
    <SafeAreaProvider>
      <FlashMessage position="top" />
      <AuthProvider>
        <OnboardingProvider>
          <NavigationContainer linking={linking} ref={navigationRef}>
            <StatusBar style="auto" />
            <AppNavigator />
          </NavigationContainer>
        </OnboardingProvider>
      </AuthProvider>
      <Toast />
    </SafeAreaProvider>
  );
}
