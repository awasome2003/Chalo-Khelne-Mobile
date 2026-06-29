import React from "react";
import {
  StyleSheet,
  Platform,
  View,
  TouchableOpacity,
  Text,
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
import TournamentBookingWizard from "../screens/player/TournamentBookingWizard";
import BookingScreen from "../screens/player/BookingScreen";
import BookingConfirmation from "../screens/player/BookingConfirmation";
import AllTournamentsScreen from "../screens/player/AllTournamentsScreen";
import SocialScreen from "../screens/player/SocialScreen";
import EditProfileScreen from "../screens/player/EditPlayerProfileScreen";
import FAQScreen from "../screens/player/FAQS";
import PrivacyPolicyScreen from "../screens/player/PrivacyPolicy";
import TermsCondition from "../screens/player/TermsConditions";
import MyBooking from "../screens/player/MyBookings";
import FavoriteVenue from "../screens/player/FavoriteVenue";
import PaymentHistory from "../screens/player/PaymentHistory";
import MyEventScreen from "../screens/player/MyEvents";
import MyEventDetailsScreen from "../screens/player/MyEventDetails";
import ComingSoonScreen from "../screens/player/ComingSoonScreen";
import VenueBookingScreen from "../screens/player/VenueBookingScreen";
import VenueBookingConfirmation from "../screens/player/VenueBookingConfirmation";
import PlayerPaymentScreen from "../screens/player/PlayerPaymentScreen";
import TournamentFeeSummary from "../screens/player/TournamentFeeSummary";
import PaymentStatusScreen from "../screens/player/PaymentStausScreen";
import PlayersManager from "../screens/player/PlayersManager";
import TournamentLeaderboardDetail from "../screens/player/TournamentLeaderboardDetail";
import DonationListScreen from "../screens/player/DonationListScreen";
import DonationDetailScreen from "../screens/player/DonationDetailScreen";
import CreateListingScreen from "../screens/player/CreateListingScreen";
import EquipmentHubScreen from "../screens/player/EquipmentHubScreen";
import MyListingsScreen from "../screens/player/MyListingsScreen";
import MyClaimsScreen from "../screens/player/MyClaimsScreen";
import ChatListScreen from "../screens/player/ChatListScreen";
import ChatConversationScreen from "../screens/player/ChatConversationScreen";
import ChatSearchScreen from "../screens/player/ChatSearchScreen";
import GroupChatListScreen from "../screens/player/GroupChatListScreen";
import InvitePlayerScreen from "../screens/player/InvitePlayerScreen";
import InvitationsScreen from "../screens/player/InvitationsScreen";
import NotificationsScreen from "../screens/player/NotificationsScreen";
import RoleHub from "../screens/player/RoleHub";
import ServiceProfileSetup from "../screens/player/ServiceProfileSetup";
import BrowseTournamentJobs from "../screens/player/BrowseTournamentJobs";
import BrowseJobs from "../screens/player/BrowseJobs";
import JobDetails from "../screens/player/JobDetails";
import HireProfessional from "../screens/player/HireProfessional";
import CreateProfessionalProfileScreen from "../screens/player/CreateProfessionalProfileScreen";
import TrainerDashboard from "../screens/player/TrainerDashboard";
import TrainerCreateSession from "../screens/player/TrainerCreateSession";
import TrainerMySessions from "../screens/player/TrainerMySessions";
import TrainerFindClubs from "../screens/player/TrainerFindClubs";
import TrainerRequests from "../screens/player/TrainerRequests";
import TrainerBatches from "../screens/player/TrainerBatches";
import TrainerEarnings from "../screens/player/TrainerEarnings";
import TrainerCreateBatch from "../screens/player/TrainerCreateBatch";
import RefereeAssignmentsScreen from "../screens/referee/RefereeAssignmentsScreen";
import RefereeMatchScorer from "../screens/referee/RefereeMatchScorer";
import TournamentHistory from "../screens/player/TournamentHistory";
import Planner from "../screens/player/Planner";
import AddNote from "../screens/player/AddNote";
import DaySchedule from "../screens/player/DaySchedule";
import SocialProfile from "../screens/player/SocialProfile";
import PlayerPublicProfile from "../screens/player/PlayerPublicProfile";
import TurfBookingPreview from "../screens/player/TurfBookingPreview";
import TurfPaymentMethod from "../screens/player/TurfPaymentMethod";
import CartScreen from "../screens/player/CartScreen";
import EquipmentPaymentMethod from "../screens/player/EquipmentPaymentMethod";
import EquipmentOrderConfirmation from "../screens/player/EquipmentOrderConfirmation";
import TrackOrder from "../screens/player/TrackOrder";
import SellGearIntro from "../screens/player/SellGearIntro";
import SellAddProduct from "../screens/player/SellAddProduct";
import SellUploadImages from "../screens/player/SellUploadImages";
import SellSellerDetails from "../screens/player/SellSellerDetails";
import SellReview from "../screens/player/SellReview";
import SellListingSuccess from "../screens/player/SellListingSuccess";
import SellProductStatus from "../screens/player/SellProductStatus";
import NewsListScreen from "../screens/player/NewsListScreen";
import NewsDetailScreen from "../screens/player/NewsDetailScreen";
import SportsLibrary from "../screens/player/SportsLibrary";
import SportDetails from "../screens/player/SportDetails";

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
        name="Notifications"
        component={NotificationsScreen}
        options={{ headerShown: false, tabBarStyle: { display: 'none' } }}
      />
      <Stack.Screen
        name="InvitePlayer"
        component={InvitePlayerScreen}
        options={{ headerShown: false, tabBarStyle: { display: 'none' } }}
      />
      <Stack.Screen
        name="PlayerProfile"
        component={PlayerProfileScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="PlayerPublicProfile"
        component={PlayerPublicProfile}
        options={{ headerShown: false, tabBarStyle: { display: 'none' } }}
      />
      <Stack.Screen
        name="Planner"
        component={Planner}
        options={{ headerShown: false, tabBarStyle: { display: 'none' } }}
      />
      <Stack.Screen
        name="DaySchedule"
        component={DaySchedule}
        options={{ headerShown: false, tabBarStyle: { display: 'none' } }}
      />
      <Stack.Screen
        name="AddNote"
        component={AddNote}
        options={{ headerShown: false, tabBarStyle: { display: 'none' } }}
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
        name="SportsLibrary"
        component={SportsLibrary}
        options={{ headerShown: false, tabBarStyle: { display: 'none' } }}
      />
      <Stack.Screen
        name="SportDetails"
        component={SportDetails}
        options={{ headerShown: false, tabBarStyle: { display: 'none' } }}
      />
      <Stack.Screen
        name="HelpSupportScreen"
        component={PrivacyPolicyScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="TermsConditionsScreen"
        component={TermsCondition}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Tournament Details"
        component={TournamentDetails}
        options={{ headerShown: true, tabBarStyle: { display: 'none' } }}
      />
      <Stack.Screen
        name="PaymentHistoryScreen"
        component={PaymentHistory}
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
        name="TurfList"
        component={PlayerVenue}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="TurfBooking"
        component={VenueBookingScreen}
        options={{ headerShown: false, tabBarStyle: { display: 'none' } }}
      />
      <Stack.Screen
        name="TurfBookingPreview"
        component={TurfBookingPreview}
        options={{ headerShown: false, tabBarStyle: { display: 'none' } }}
      />
      <Stack.Screen
        name="TurfPaymentMethod"
        component={TurfPaymentMethod}
        options={{ headerShown: false, tabBarStyle: { display: 'none' } }}
      />

      {/* Service Role screens (reachable from TournamentDetails → Apply as Staff) */}
      <Stack.Screen name="BrowseTournamentJobsHome" component={BrowseTournamentJobs} options={{ headerShown: false }} />
      <Stack.Screen name="RoleHubHome" component={RoleHub} options={{ headerShown: false }} />
      {/* Alias so PlayerProfileScreen's "+" (navigate "RoleHub") resolves when the
          profile is reached via Home search, not just the Profile tab. */}
      <Stack.Screen name="RoleHub" component={RoleHub} options={{ headerShown: false }} />
      <Stack.Screen name="ServiceProfileSetupHome" component={ServiceProfileSetup} options={{ headerShown: false }} />

      {/* Sports Jobs & Opportunities (Browse Jobs module) */}
      <Stack.Screen name="BrowseJobs" component={BrowseJobs} options={{ headerShown: false, tabBarStyle: { display: "none" } }} />
      <Stack.Screen name="JobDetails" component={JobDetails} options={{ headerShown: false, tabBarStyle: { display: "none" } }} />
      <Stack.Screen name="HireProfessional" component={HireProfessional} options={{ headerShown: false, tabBarStyle: { display: "none" } }} />
      <Stack.Screen name="CreateProfessionalProfile" component={CreateProfessionalProfileScreen} options={{ headerShown: false, tabBarStyle: { display: "none" } }} />

      {/* Trainer Console */}
      <Stack.Screen name="TrainerDashboard" component={TrainerDashboard} options={{ headerShown: false, tabBarStyle: { display: "none" } }} />
      <Stack.Screen name="TrainerCreateSession" component={TrainerCreateSession} options={{ headerShown: false, tabBarStyle: { display: "none" } }} />
      <Stack.Screen name="TrainerMySessions" component={TrainerMySessions} options={{ headerShown: false, tabBarStyle: { display: "none" } }} />
      <Stack.Screen name="TrainerFindClubs" component={TrainerFindClubs} options={{ headerShown: false, tabBarStyle: { display: "none" } }} />
      <Stack.Screen name="TrainerRequests" component={TrainerRequests} options={{ headerShown: false, tabBarStyle: { display: "none" } }} />
      <Stack.Screen name="TrainerBatches" component={TrainerBatches} options={{ headerShown: false, tabBarStyle: { display: "none" } }} />
      <Stack.Screen name="TrainerEarnings" component={TrainerEarnings} options={{ headerShown: false, tabBarStyle: { display: "none" } }} />
      <Stack.Screen name="TrainerCreateBatch" component={TrainerCreateBatch} options={{ headerShown: false, tabBarStyle: { display: "none" } }} />

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
        name="RefereeMatchScorer"
        component={RefereeMatchScorer}
        options={{ headerShown: false, tabBarStyle: { display: 'none' } }}
      />
      <Stack.Screen
        name="RegistrationDetails"
        component={RegistrationDetails}
        options={{ headerShown: false, tabBarStyle: { display: 'none' } }}
      />
      <Stack.Screen
        name="TournamentBookingWizard"
        component={TournamentBookingWizard}
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
      <Stack.Screen name="BrowseTournamentJobsHome" component={BrowseTournamentJobs} options={{ headerShown: false }} />
      <Stack.Screen name="ServiceProfileSetupHome" component={ServiceProfileSetup} options={{ headerShown: false }} />
      <Stack.Screen name="RoleHubHome" component={RoleHub} options={{ headerShown: false }} />
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
        name="InvitePlayer"
        component={InvitePlayerScreen}
        options={{ headerShown: false, tabBarStyle: { display: 'none' } }}
      />
      <Stack.Screen
        name="Invitations"
        component={InvitationsScreen}
        options={{ headerShown: false, tabBarStyle: { display: 'none' } }}
      />
      <Stack.Screen
        name="TournamentBookingWizard"
        component={TournamentBookingWizard}
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
      <Stack.Screen
        name="RefereeMatchScorer"
        component={RefereeMatchScorer}
        options={{ headerShown: false, tabBarStyle: { display: 'none' } }}
      />
      <Stack.Screen name="BrowseTournamentJobsHome" component={BrowseTournamentJobs} options={{ headerShown: false }} />
      <Stack.Screen name="ServiceProfileSetupHome" component={ServiceProfileSetup} options={{ headerShown: false }} />
      <Stack.Screen name="RoleHubHome" component={RoleHub} options={{ headerShown: false }} />
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
      <Stack.Screen
        name="TurfBookingPreview"
        component={TurfBookingPreview}
        options={{ headerShown: false, tabBarStyle: { display: 'none' } }}
      />
      <Stack.Screen
        name="TurfPaymentMethod"
        component={TurfPaymentMethod}
        options={{ headerShown: false, tabBarStyle: { display: 'none' } }}
      />
      <Stack.Screen
        name="FavouriteVenue"
        component={FavoriteVenue}
        options={{ headerShown: false }}
      />
      {/* Cross-stack targets the turf flow navigates to (Book Turf now opens the
          Turf tab, so these must resolve inside PlayStack too). */}
      <Stack.Screen
        name="MyBookings"
        component={MyBooking}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="EditProfile"
        component={EditProfileScreen}
        options={{ headerShown: false, tabBarStyle: { display: 'none' } }}
      />
      <Stack.Screen
        name="TermsConditionsScreen"
        component={TermsCondition}
        options={{ headerShown: false }}
      />
      {/* Add other player home-related screens here */}
    </Stack.Navigator>
  );
};

// Social stack navigator
const SocialStack = () => {
  return (
    <Stack.Navigator initialRouteName="SocialHome">
      <Stack.Screen
        name="SocialHome"
        component={SocialScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ComingSoon"
        component={ComingSoonScreen}
        options={{ headerShown: false, tabBarStyle: { display: 'none' } }}
      />
      <Stack.Screen
        name="SocialProfile"
        component={SocialProfile}
        options={{ headerShown: false, tabBarStyle: { display: 'none' } }}
      />
      <Stack.Screen
        name="NewsList"
        component={NewsListScreen}
        options={{ headerShown: false, tabBarStyle: { display: 'none' } }}
      />
      <Stack.Screen
        name="NewsDetail"
        component={NewsDetailScreen}
        options={{ headerShown: false, tabBarStyle: { display: 'none' } }}
      />
    </Stack.Navigator>
  );
};

// Chat stack navigator
const ChatStack = () => {
  return (
    <Stack.Navigator initialRouteName="ChatList">
      <Stack.Screen
        name="ChatList"
        component={ChatListScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ChatConversation"
        component={ChatConversationScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ChatSearch"
        component={ChatSearchScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="GroupChatList"
        component={GroupChatListScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="GroupChatConversation"
        component={ChatConversationScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
};

// Profile stack navigator for Player
const ProfileStack = () => {
  return (
    <Stack.Navigator initialRouteName="Player Profile">
      <Stack.Screen
        name="Player Profile"
        component={PlayerProfileScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="My Profile"
        component={PlayerProfileScreen}
        options={{ headerShown: false, tabBarStyle: { display: 'none' } }}
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
      {/* Equipment Exchange / Donation screens */}
      <Stack.Screen
        name="EquipmentHub"
        component={EquipmentHubScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="DonationList"
        component={DonationListScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="DonationDetail"
        component={DonationDetailScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CreateListing"
        component={CreateListingScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="MyListings"
        component={MyListingsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="MyClaims"
        component={MyClaimsScreen}
        options={{ headerShown: false }}
      />
      {/* Career Stats */}
      <Stack.Screen
        name="TournamentHistory"
        component={TournamentHistory}
        options={{ headerShown: false }}
      />
      {/* Service Role screens */}
      <Stack.Screen
        name="RoleHub"
        component={RoleHub}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ServiceProfileSetup"
        component={ServiceProfileSetup}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="BrowseTournamentJobs"
        component={BrowseTournamentJobs}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="RefereeAssignments"
        component={RefereeAssignmentsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="RefereeMatchScorer"
        component={RefereeMatchScorer}
        options={{ headerShown: false }}
      />
      {/* Invitation screens */}
      <Stack.Screen
        name="Invitations"
        component={InvitationsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="InvitePlayer"
        component={InvitePlayerScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
};

const PaymentStack = () => {
  return (
    <Stack.Navigator initialRouteName="PlayerProfile">
      <Stack.Screen
        name="Payment History"
        component={PaymentHistory}
        options={{ headerShown: true }}
      />
      {/* Add other player profile-related screens here */}
    </Stack.Navigator>
  );
};

// Store stack navigator (Equipment Hub + donation/listing flow)
const StoreStack = () => {
  return (
    <Stack.Navigator initialRouteName="EquipmentHub">
      <Stack.Screen
        name="EquipmentHub"
        component={EquipmentHubScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="DonationList"
        component={DonationListScreen}
        options={{ headerShown: false, tabBarStyle: { display: "none" } }}
      />
      <Stack.Screen
        name="DonationDetail"
        component={DonationDetailScreen}
        options={{
          headerShown: false,
          tabBarStyle: { display: "none" },
          presentation: "transparentModal",
          cardOverlayEnabled: true,
          cardStyle: { backgroundColor: "transparent" },
        }}
      />
      <Stack.Screen
        name="CreateListing"
        component={CreateListingScreen}
        options={{ headerShown: false, tabBarStyle: { display: "none" } }}
      />
      <Stack.Screen
        name="MyListings"
        component={MyListingsScreen}
        options={{ headerShown: false, tabBarStyle: { display: "none" } }}
      />
      <Stack.Screen
        name="MyClaims"
        component={MyClaimsScreen}
        options={{ headerShown: false, tabBarStyle: { display: "none" } }}
      />
      <Stack.Screen
        name="Cart"
        component={CartScreen}
        options={{ headerShown: false, tabBarStyle: { display: "none" } }}
      />
      <Stack.Screen
        name="EquipmentPaymentMethod"
        component={EquipmentPaymentMethod}
        options={{ headerShown: false, tabBarStyle: { display: "none" } }}
      />
      <Stack.Screen
        name="EquipmentOrderConfirmation"
        component={EquipmentOrderConfirmation}
        options={{ headerShown: false, tabBarStyle: { display: "none" } }}
      />
      <Stack.Screen
        name="TrackOrder"
        component={TrackOrder}
        options={{ headerShown: false, tabBarStyle: { display: "none" } }}
      />
      <Stack.Screen
        name="SellGearIntro"
        component={SellGearIntro}
        options={{ headerShown: false, tabBarStyle: { display: "none" } }}
      />
      <Stack.Screen
        name="SellAddProduct"
        component={SellAddProduct}
        options={{ headerShown: false, tabBarStyle: { display: "none" } }}
      />
      <Stack.Screen
        name="SellUploadImages"
        component={SellUploadImages}
        options={{ headerShown: false, tabBarStyle: { display: "none" } }}
      />
      <Stack.Screen
        name="SellSellerDetails"
        component={SellSellerDetails}
        options={{ headerShown: false, tabBarStyle: { display: "none" } }}
      />
      <Stack.Screen
        name="SellReview"
        component={SellReview}
        options={{ headerShown: false, tabBarStyle: { display: "none" } }}
      />
      <Stack.Screen
        name="SellListingSuccess"
        component={SellListingSuccess}
        options={{ headerShown: false, tabBarStyle: { display: "none" } }}
      />
      <Stack.Screen
        name="SellProductStatus"
        component={SellProductStatus}
        options={{ headerShown: false, tabBarStyle: { display: "none" } }}
      />
    </Stack.Navigator>
  );
};

// Custom Tab Bar component (friend's redesign — green pill style with descriptor-based hide)
const CustomTabBar = ({ state, descriptors, navigation, insets }) => {
  const route = state.routes[state.index];
  const focusedRoute = getFocusedRouteNameFromRoute(route);
  const focusedOptions = descriptors[route.key].options;

  // Hide tab bar when the focused screen explicitly opts out via tabBarStyle.display === "none"
  if (focusedOptions?.tabBarStyle?.display === "none") {
    return null;
  }

  // Backup whitelist of root screens where the tab bar is allowed.
  const showOnScreens = [
    "PlayerHome",
    "EventScreen",
    "SocialHome",
    "Play",
    "EquipmentHub",
    "Player Profile",
    undefined, // initial route of a stack
  ];

  if (focusedRoute && !showOnScreens.includes(focusedRoute)) {
    return null;
  }

  // Chat and Profile stay registered (so navigation.navigate("Chat" | "Profile", { screen: ... })
  // keeps working from other screens) but they don't render as visible pills.
  const visibleRoutes = state.routes.filter(
    (r) => r.name !== "Chat" && r.name !== "Profile"
  );

  return (
    <View
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: "#fff",
        paddingBottom: insets?.bottom || 0,
        paddingTop: 8,
      }}
    >
      <View style={styles.tabBar}>
        {visibleRoutes.map((route) => {
          const realIndex = state.routes.findIndex((r) => r.key === route.key);
          const isFocused = state.index === realIndex;

          let iconName;
          if (route.name === "Home") {
            iconName = isFocused ? "home" : "home-outline";
          } else if (route.name === "Events") {
            iconName = isFocused ? "calendar" : "calendar-outline";
          } else if (route.name === "Social") {
            iconName = isFocused ? "people" : "people-outline";
          } else if (route.name === "Turf") {
            iconName = isFocused ? "football" : "football-outline";
          } else if (route.name === "Store") {
            iconName = isFocused ? "storefront" : "storefront-outline";
          }

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });

            if (event.defaultPrevented) return;

            switch (route.name) {
              case "Home":
                navigation.navigate("Home", { screen: "PlayerHome" });
                break;
              case "Events":
                navigation.navigate("Events", { screen: "EventScreen" });
                break;
              case "Social":
                navigation.navigate("Social", { screen: "SocialHome" });
                break;
              case "Turf":
                navigation.navigate("Turf", { screen: "Play" });
                break;
              case "Store":
                navigation.navigate("Store", { screen: "EquipmentHub" });
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
              <View
                style={[styles.tabContent, isFocused && styles.activeTabPill]}
              >
                <Ionicons
                  name={iconName}
                  size={24}
                  color={isFocused ? "#15A765" : "#5D5D5D"}
                />
                <Text
                  style={[styles.label, isFocused ? styles.activeLabel : null]}
                >
                  {route.name}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

// Main tab navigator for Player
const PlayerNavigator = () => {
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
      }}
      tabBar={(props) => <CustomTabBar {...props} insets={insets} />}
    >
      <Tab.Screen name="Home" component={HomeStack} />
      <Tab.Screen name="Events" component={EventStack} />
      <Tab.Screen name="Social" component={SocialStack} />
      <Tab.Screen name="Turf" component={PlayStack} />
      <Tab.Screen name="Store" component={StoreStack} />
      {/* Chat and Profile stay registered (hidden from the bar) so existing
          navigation.navigate("Chat" | "Profile", { screen: ... }) calls keep
          working from other screens (header avatars, social icons, etc.). */}
      <Tab.Screen
        name="Chat"
        component={ChatStack}
        options={{ tabBarButton: () => null }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileStack}
        options={{ tabBarButton: () => null }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 24,
    borderColor: "#ECF4EB",
    borderWidth: 1,
    boxShadow: "0px 0px 18.4px 0px #BDBDDB4D",
    elevation: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    bottom: 5,
    marginHorizontal: 16,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  tabContent: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 24,
  },
  activeTabPill: {
    backgroundColor: "#E8F7F0",
  },
  label: {
    fontSize: 10,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "600",
    color: "#5D5D5D",
  },
  activeLabel: {
    color: "#15A765",
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "700",
  },
});

export default PlayerNavigator;
