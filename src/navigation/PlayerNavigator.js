import React from "react";
import {
  StyleSheet,
  Platform,
  View,
  TouchableOpacity,
  Text,
  BackHandler,
  ToastAndroid,
} from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { createStackNavigator } from "@react-navigation/stack";
import {
  getFocusedRouteNameFromRoute,
  useNavigationState,
  useIsFocused,
} from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import PlayerHomeScreen from "../screens/player/PlayerHomeScreen";
import PlayerProfileScreen from "../screens/player/PlayerProfileScreen";
import PlayerVenueDetails from "../screens/player/PlayerVenueDetails";
import PlayerVenue from "../screens/player/PlayerVenue";
import TournamentDetails from "../screens/player/TournamentDetails";
import RegistrationDetails from "../screens/player/RegistrationDetails";
import Event from "../screens/player/Event";
import GroupStage from "../screens/player/GroupStage";
import TeamKnockouts from "../screens/player/TeamKnockouts";
import BookingScreen from "../screens/player/BookingScreen";
import BookingConfirmation from "../screens/player/BookingConfirmation";
import AllTournamentsScreen from "../screens/player/AllTournamentsScreen";
import SocialScreen from "../screens/player/SocialScreen";
import EditProfileScreen from "../screens/player/EditPlayerProfileScreen";
import FAQScreen from "../screens/player/FAQS";
import HelpSupportScreen from "../screens/player/PrivacyPolicy";
import HelpSupportTermsScreen from "../screens/player/TermsConditions";
import MyBooking from "../screens/player/MyBookings";
import FavoriteVenue from "../screens/player/FavoriteVenue";
import PaymentScreen from "../screens/player/PaymentHistory";
import MyEventScreen from "../screens/player/MyEvents";
import MyEventDetailsScreen from "../screens/player/MyEventDetails";
import ComingSoonScreen from "../screens/player/ComingSoonScreen";
import VenueBookingScreen from "../screens/player/VenueBookingScreen";
import VenueBookingConfirmation from "../screens/player/VenueBookingConfirmation";
import PlayerPaymentScreen from "../screens/player/PlayerPaymentScreen";
import TournamentFeeSummary from "../screens/player/TournamentFeeSummary";
import PaymentStatusScreen from "../screens/player/PaymentStausScreen";
import PlayersManager from "../screens/player/PlayersManager";
import TournamentLeaderboardDetail from '../screens/player/TournamentLeaderboardDetail'
import Profile from "../screens/player/Profile";
import PaymentHistoryScreen from "../screens/player/PaymentHistory";
import TermsCondition from "../screens/player/TermsConditions";
import HelpSupport from "../screens/player/PrivacyPolicy";
import PaymentHistory from "../screens/player/PaymentHistory";
import PrivacyPolicyScreen from "../screens/player/PrivacyPolicy";

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Home stack navigator for Player
const HomeStack = () => {
  return (
    <Stack.Navigator initialRouteName="PlayerHome">
      <Stack.Screen
        name="TurfDetails"
        component={PlayerVenueDetails}
        options={{ headerShown: false, tabBarStyle: { display: 'none' } }}
      />
      <Stack.Screen
        name="PlayerHome"
        component={PlayerHomeScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="PlayerProfile"
        component={PlayerProfileScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="FAQScreen"
        component={FAQScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="FavouriteVenue"
        component={FavoriteVenue}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="MyEventScreen"
        component={MyEventScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="MyEventDetails"
        component={MyEventDetailsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="MyBookings"
        component={MyBooking}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="HelpSupportScreen"
        component={HelpSupportScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="TermsConditionsScreen"
        component={HelpSupportTermsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Tournament Details"
        component={TournamentDetails}
        options={{ headerShown: true, tabBarStyle: { display: 'none' } }}
      />
      <Stack.Screen
        name="PaymentHistoryScreen"
        component={PaymentScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="BookingConfirmation"
        component={BookingConfirmation}
        options={{ headerShown: false, tabBarStyle: { display: 'none' } }}
      />
      <Stack.Screen
        name="TurfConfirmation"
        component={VenueBookingConfirmation}
        options={{ headerShown: false, tabBarStyle: { display: 'none' } }}
      />

      <Stack.Screen
        name="EditProfile"
        component={EditProfileScreen}
        options={{ headerShown: false, tabBarStyle: { display: 'none' } }}
      />

      <Stack.Screen
        name="TournamentLeaderboardDetail"
        component={TournamentLeaderboardDetail}
        options={{ headerShown: false, tabBarStyle: { display: 'none' } }}
      />
      <Stack.Screen
        name="RegistrationDetails"
        component={RegistrationDetails}
        options={{ headerShown: false, tabBarStyle: { display: 'none' } }}
      />
      <Stack.Screen
        name="Booking Screen"
        component={BookingScreen}
        options={{ headerShown: true, tabBarStyle: { display: 'none' } }}
      />
      <Stack.Screen
        name="Payment Method"
        component={TournamentFeeSummary}
        options={{ headerShown: true, tabBarStyle: { display: 'none' } }}
      />
      <Stack.Screen
        name="Cash Payment"
        component={PaymentStatusScreen}
        options={{ headerShown: true, tabBarStyle: { display: 'none' } }}
      />
      <Stack.Screen
        name="Online Payment"
        component={PlayerPaymentScreen}
        options={{ headerShown: true, tabBarStyle: { display: 'none' } }}
      />
    </Stack.Navigator>
  );
};

const TournamentsStack = () => {
  return (
    <Stack.Navigator initialRouteName="AllTournaments">
      <Stack.Screen
        name="AllTournaments"
        component={AllTournamentsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="GroupStage"
        component={GroupStage}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="TeamKnockouts"
        component={TeamKnockouts}
        options={{ headerShown: false }}
      />
      {/* Add other tournament-related screens here */}
    </Stack.Navigator>
  );
};

const EventStack = () => {
  return (
    <Stack.Navigator
      initialRouteName="EventScreen"
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="EventScreen"
        component={Event}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Tournament Details"
        component={TournamentDetails}
        options={({ navigation }) => ({
          headerShown: true,
          // Hide tab bar when navigating to this screen
          tabBarStyle: { display: 'none' },
        })}
      />
      <Stack.Screen
        name="RegistrationDetails"
        component={RegistrationDetails}
        options={{ headerShown: false, tabBarStyle: { display: 'none' } }}
      />
      <Stack.Screen
        name="GroupStage"
        component={PlayersManager}
        options={{ headerShown: false, tabBarStyle: { display: 'none' } }}
      />
      <Stack.Screen
        name="TeamKnockouts"
        component={TeamKnockouts}
        options={{ headerShown: false, tabBarStyle: { display: 'none' } }}
      />
      <Stack.Screen
        name="Booking Screen"
        component={BookingScreen}
        options={{ headerShown: true, tabBarStyle: { display: 'none' } }}
      />
      <Stack.Screen
        name="Payment Method"
        component={TournamentFeeSummary}
        options={{ headerShown: true, tabBarStyle: { display: 'none' } }}
      />
      <Stack.Screen
        name="Cash Payment"
        component={PaymentStatusScreen}
        options={{ headerShown: true, tabBarStyle: { display: 'none' } }}
      />
      <Stack.Screen
        name="Online Payment"
        component={PlayerPaymentScreen}
        options={{ headerShown: true, tabBarStyle: { display: 'none' } }}
      />
      <Stack.Screen
        name="BookingConfirmation"
        component={BookingConfirmation}
        options={{ headerShown: false, tabBarStyle: { display: 'none' } }}
      />
      <Stack.Screen
        name="Tournament Leaderboard"
        component={TournamentLeaderboardDetail}
        options={{ headerShown: true, tabBarStyle: { display: 'none' } }}
      />
    </Stack.Navigator>
  );
};

const PlayStack = () => {
  return (
    <Stack.Navigator initialRouteName="Play">
      <Stack.Screen
        name="Play"
        component={PlayerVenue}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="TurfDetails"
        component={PlayerVenueDetails}
        options={{ headerShown: false, tabBarStyle: { display: 'none' } }}
      />
      <Stack.Screen
        name="TurfBooking"
        component={VenueBookingScreen}
        options={{ headerShown: false, tabBarStyle: { display: 'none' } }}
      />
      <Stack.Screen
        name="TurfConfirmation"
        component={VenueBookingConfirmation}
        options={{ headerShown: false, tabBarStyle: { display: 'none' } }}
      />
      {/* Add other player home-related screens here */}
    </Stack.Navigator>
  );
};

// const TrainerStack = () => {
//   return (
//     <Stack.Navigator initialRouteName="FindTrainers">
//       <Stack.Screen
//         name="FindTrainers"
//         component={FindTrainersScreen}
//         options={{ headerShown: false }}
//       />
//       <Stack.Screen
//         name="TrainerProfile"
//         component={TrainerProfileScreen}
//         options={{ headerShown: false }}
//       />
//       <Stack.Screen
//         name="TrainerSessions"
//         component={TrainerSessionsScreen}
//         options={{ headerShown: false }}
//       />
//       <Stack.Screen
//         name="BookTraining"
//         component={BookTrainingScreen}
//         options={{ headerShown: false }}
//       />
//       <Stack.Screen
//         name="SessionDetails"
//         component={SessionDetailsScreen}
//         options={{ headerShown: false }}
//       />
//     </Stack.Navigator>
//   );
// };

// Social stack navigator
const SocialStack = () => {
  return (
    <Stack.Navigator initialRouteName="Social">
      <Stack.Screen
        name="Social"
        component={SocialScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ComingSoon"
        component={ComingSoonScreen}
        options={{ headerShown: false, tabBarStyle: { display: 'none' } }}
      />
      {/* Add other social-related screens here if needed */}
    </Stack.Navigator>
  );
};

// Profile stack navigator for Player
const ProfileStack = () => {
  return (
    <Stack.Navigator initialRouteName="Player Profile">
      <Stack.Screen
        name="Player Profile"
        component={Profile}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="My Profile"
        component={PlayerProfileScreen}
        options={{ headerShown: true, tabBarStyle: { display: 'none' } }}
      />
      <Stack.Screen
        name="FAQ'S"
        component={FAQScreen}
        options={{ headerShown: true }}
      />
      <Stack.Screen
        name="Privacy & Policy"
        component={PrivacyPolicyScreen}
        options={{ headerShown: true }}
      />
      <Stack.Screen
        name="Terms and Conditions"
        component={TermsCondition}
        options={{ headerShown: true }}
      />
      <Stack.Screen
        name="Payment History"
        component={PaymentHistory}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="EditProfile"
        component={EditProfileScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="EventScreen"
        component={Event}
        options={{ headerShown: true }}
      />
      {/* Add other player profile-related screens here */}
    </Stack.Navigator>
  );
};

const PaymentStack = () => {
  return (
    <Stack.Navigator initialRouteName="PlayerProfile">
      <Stack.Screen
        name="Payment History"
        component={PaymentHistoryScreen}
        options={{ headerShown: true }}
      />
      {/* Add other player profile-related screens here */}
    </Stack.Navigator>
  );
};

// Custom Tab Bar component
const CustomTabBar = ({ state, navigation, insets }) => {
  const route = state.routes[state.index];
  const focusedRoute = getFocusedRouteNameFromRoute(route);

  // Define screens where tab bar SHOULD be visible (all others will hide it)
  const showOnScreens = [
    "PlayerHome",
    "EventScreen",
    "Social",
    "Player Profile",
    undefined // When it's the initial route of the stack
  ];

  if (focusedRoute && !showOnScreens.includes(focusedRoute)) {
    return null;
  }

  const [backPressed, setBackPressed] = React.useState(0);

  React.useEffect(() => {
    const backAction = () => {
      // If we are not on the first tab, go back to the first tab (default behavior)
      if (state.index !== 0) {
        navigation.navigate(state.routes[0].name);
        return true;
      }

      // If we are on the first tab, handle double press to exit
      if (backPressed > 0 && (new Date().getTime() - backPressed < 2000)) {
        BackHandler.exitApp();
        return true;
      }

      setBackPressed(new Date().getTime());
      if (Platform.OS === 'android') {
        ToastAndroid.show("Press back again to exit", ToastAndroid.SHORT);
      }
      return true;
    };

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction
    );

    return () => backHandler.remove();
  }, [backPressed, state.index]);

  return (
    <View
      style={[
        styles.tabBar,
        {
          paddingBottom: insets?.bottom || 0,           // ⭐ SAFE AREA FIX
          height: 60 + (insets?.bottom || 0),           // ⭐ PREVENT OVERLAP
          marginBottom: insets?.bottom > 0 ? 0 : 10,     // ⭐ CLEAN LOOK
        },
      ]}
    >
      {state.routes.map((route, index) => {
        const isFocused = state.index === index;
        // console.log("route", route.key);

        let iconName;
        if (route.name === "Home") {
          iconName = isFocused ? "home" : "home-outline";
        } else if (route.name === "Play") {
          iconName = isFocused ? "football" : "football-outline";
        } else if (route.name === "Events") {
          iconName = isFocused ? "trophy" : "trophy-outline";
        } else if (route.name === "Social") {
          iconName = isFocused ? "people" : "people-outline";
        } else if (route.name === "Tournaments") {
          iconName = isFocused ? "medal" : "medal-outline";
        } else if (route.name === "Trainer") {
          iconName = isFocused ? "fitness" : "fitness-outline"; // New icon for Trainer tab
        } else if (route.name === "Profile") {
          iconName = isFocused ? "person" : "person-outline"; // Profile icon
        } else if (route.name === "Payment History") {
          iconName = isFocused ? "cash" : "cash-outline"; // Payment History icon
        }

        const onPress = () => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });

          // Prevent multiple rapid taps
          if (event.defaultPrevented) return;

          // Always navigate to the initial screen of the tab's stack
          switch (route.name) {
            case "Home":
              navigation.navigate("Home", { screen: "PlayerHome" });
              break;
            case "Events":
              navigation.navigate("Events", { screen: "EventScreen" });
              break;
            case "Social":
              navigation.navigate("Social", { screen: "Social" });
              break;
            case "Profile":
              navigation.navigate("Profile", { screen: "Player Profile" });
              break;
            default:
              navigation.navigate(route.name);
              break;
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: "tabLongPress",
            target: route.key,
          });
        };

        return (
          <TouchableOpacity
            key={route.key}
            onPress={onPress}
            onLongPress={onLongPress}
            style={styles.tabItem}
          >
            <View style={styles.iconContainer}>
              {isFocused && <View style={styles.activeBackground} />}
              <Ionicons
                name={iconName}
                size={28}
                color={isFocused ? "#E3FF3B" : "#555"}
                style={isFocused ? styles.activeIcon : null}
              />
            </View>
            <Text
              style={[
                styles.label,
                isFocused ? styles.activeLabelWithMargin : null,
              ]}
            >
              {route.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

// Main tab navigator for Player
const PlayerNavigator = () => {
  const insets = useSafeAreaInsets(); // ✅ get device safe area insets

  return (
    <Tab.Navigator
      screenOptions={({ route, navigation }) => ({
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          elevation: 0,
          backgroundColor: '#fff',
          borderTopWidth: 0,
          paddingBottom: insets?.bottom || 0,
          height: 60 + (insets?.bottom || 0),
        },
      })}
      tabBar={(props) => <CustomTabBar {...props} insets={insets} />}
    >
      <Tab.Screen name="Home" component={HomeStack} />
      <Tab.Screen name="Events" component={EventStack} />
      <Tab.Screen name="Social" component={SocialStack} />
      <Tab.Screen name="Profile" component={ProfileStack} screenOptions={{ headerShown: true }} />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    // marginHorizontal: 8,
    paddingVertical: 10,
    paddingBottom: Platform.OS === "ios" ? 25 : 15,
    borderRadius: 16,
    marginBottom: 10,
    backgroundColor: "#fff",
    // height: 60 + insets.bottom, // add inset to prevent overlap
    // Shadow for Android
  },
  tabItem: {
    alignItems: "center",
    justifyContent: "center",
  },
  iconContainer: {
    // width: 40,
    // height: 40,
    justifyContent: "center",
    alignItems: "center",
    display: "flex",
    gap: 20,
  },
  activeBackground: {
    position: "absolute",
    bottom: 5,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#0079EE", // Orange color as in original design
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    zIndex: -1,
    alignContent: "center",
  },
  label: {
    fontSize: 14,
    color: "#333",
    textAlign: "center",
  },
  activeLabelWithMargin: {
    color: "#333",
    fontSize: 14,
    marginTop: 10,
  },
  activeIcon: {
    color: "#E3FF3B",
    bottom: 20,
  },
});

export default PlayerNavigator;
