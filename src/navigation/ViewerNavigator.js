import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createStackNavigator } from "@react-navigation/stack";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import HomeScreen from "../screens/viewer/HomeScreen";
import EventsScreen from "../screens/viewer/EventsScreen";
import VenuesScreen from "../screens/viewer/VenueScreen";
import VenueDetailsScreen from "../screens/viewer/VenueDetailsScreen";
import LoginScreen from "../screens/auth/LoginScreen";
import RegisterScreen from "../screens/auth/RegisterScreen";
import ForgotPasswordScreen from "../screens/auth/ForgotPasswordScreen";
import EventDetails from "../screens/viewer/EventDetails";
import TrainerScreen from "../screens/viewer/TrainerScreen";
import SocialScreen from "../screens/viewer/SocialScreen";

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Home stack navigator for unauthenticated viewers
const HomeStack = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="ViewerHome"
        component={HomeScreen}
        options={{
          headerShown: false,
        }}
      />
      {/* Add other general home-related screens here */}
    </Stack.Navigator>
  );
};

// Play/Venues stack navigator
const PlayStack = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Venues"
        component={VenuesScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="VenueDetails"
        component={VenueDetailsScreen}
        options={{
          headerShown: false,
        }}
      />
    </Stack.Navigator>
  );
};

// Events stack navigator for unauthenticated viewers
const EventsStack = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="ViewerEvents"
        component={EventsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="EventDetails"
        component={EventDetails}
        options={{
          headerShown: false,
          unmountOnBlur: true,
        }}
      />
      {/* Add other event-related screens here */}
    </Stack.Navigator>
  );
};

const TrainerStack = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="TrainerHome"
        component={TrainerScreen}
        options={{
          headerShown: false,
        }}
      />
    </Stack.Navigator>
  );
};

const SocialStack = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="SocialHome"
        component={SocialScreen}
        options={{
          headerShown: false,
        }}
      />
    </Stack.Navigator>
  );
};

// Auth stack navigator
const AuthStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: "#f4511e",
        },
        headerTintColor: "#fff",
        headerTitleStyle: {
          fontWeight: "bold",
        },
      }}
    >
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="Register"
        component={RegisterScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="ForgotPassword"
        component={ForgotPasswordScreen}
        options={{
          headerShown: false,
        }}
      />
    </Stack.Navigator>
  );
};

// Main tab navigator for unauthenticated viewers
const ViewerNavigator = () => {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === "Home") {
            iconName = focused ? "home" : "home-outline";
          } else if (route.name === "Play") {
            iconName = focused ? "basketball" : "basketball-outline";
          } else if (route.name === "Event") {
            iconName = focused ? "calendar" : "calendar-outline";
          } else if (route.name === "Trainer") {
            iconName = focused ? "fitness" : "fitness-outline";
          } else if (route.name === "Social") {
            iconName = focused ? "people" : "people-outline";
          } else if (route.name === "Account") {
            iconName = focused ? "person" : "person-outline";
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: "#3B4DFD",
        tabBarInactiveTintColor: "gray",
        tabBarStyle: [
          {
            paddingBottom: insets?.bottom || 0,
            height: 60 + (insets?.bottom || 0),
            marginBottom: insets?.bottom > 0 ? 0 : 0,
          },
        ],
        tabBarLabelStyle: {
          fontSize: 12,
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeStack}
        options={{ headerShown: false }}
      />
      {/* <Tab.Screen
        name="Play"
        component={PlayStack}
        options={{
          headerShown: false,
        }}
      /> */}
      <Tab.Screen
        name="Event"
        component={EventsStack}
        options={{ headerShown: false }}
      />
      {/* <Tab.Screen
        name="Trainer"
        component={TrainerStack}
        options={{
          headerShown: false,
        }}
      /> */}
      <Tab.Screen
        name="Social"
        component={SocialStack}
        options={{
          headerShown: false,
        }}
      />
      <Tab.Screen
        name="Account"
        component={AuthStack}
        options={{
          headerShown: false,
          title: "Sign In",
        }}
      />
    </Tab.Navigator>
  );
};

export default ViewerNavigator;
