import React, { useEffect, useRef } from "react";
import * as WebBrowser from "expo-web-browser";
import * as ScreenOrientation from "expo-screen-orientation";
import { NavigationContainer, useNavigationContainerRef } from "@react-navigation/native";

WebBrowser.maybeCompleteAuthSession();
import { StatusBar, BackHandler, Platform, ToastAndroid } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import AppNavigator from "./src/navigation/AppNavigator";
import { AuthProvider } from "./src/context/AuthContext";
import { OnboardingProvider } from "./src/context/OnboardingContext";
import { ChatProvider } from "./src/context/ChatContext";
import { NotificationProvider } from "./src/context/NotificationContext";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./src/config/queryClient";
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
  const lastBackPressRef = useRef(0);

  useEffect(() => {
    // Keep the whole app in portrait by default. Individual screens that need
    // landscape (e.g., the umpire scorer) self-lock and relock portrait on blur.
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});

    // Register navigation ref for notifications
    NotificationService.setNavigationRef(navigationRef);

    const handleBackButton = () => {
      // 1. If a stack has history, pop it
      if (navigationRef.current?.canGoBack()) {
        navigationRef.current.goBack();
        return true;
      }

      // 2. We're at the root of the active navigator (a tab root or onboarding root)
      // Try to switch to the first tab if we're on a non-first tab
      const rootState = navigationRef.current?.getRootState();
      const activeRoute = rootState?.routes?.[rootState.index];
      const tabState = activeRoute?.state;

      if (tabState?.type === "tab" && tabState.index !== 0) {
        const firstTabName = tabState.routeNames?.[0];
        if (firstTabName) {
          navigationRef.current.navigate(firstTabName);
          return true;
        }
      }

      // 3. We're at the home tab root — double-press-to-exit
      const now = Date.now();
      if (now - lastBackPressRef.current < 2000) {
        BackHandler.exitApp();
        return true;
      }

      lastBackPressRef.current = now;
      if (Platform.OS === "android") {
        ToastAndroid.show("Press back again to exit", ToastAndroid.SHORT);
      }
      return true;
    };

    const backHandler = BackHandler.addEventListener("hardwareBackPress", handleBackButton);
    return () => backHandler.remove();
  }, []);

  return (
    <SafeAreaProvider>
      <FlashMessage position="top" />
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <NotificationProvider>
            <ChatProvider>
              <OnboardingProvider>
                <NavigationContainer linking={linking} ref={navigationRef}>
                  <StatusBar style="auto" />
                  <AppNavigator />
                </NavigationContainer>
              </OnboardingProvider>
            </ChatProvider>
          </NotificationProvider>
        </AuthProvider>
      </QueryClientProvider>
      <Toast />
    </SafeAreaProvider>
  );
}
