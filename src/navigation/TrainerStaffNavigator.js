import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createStackNavigator } from "@react-navigation/stack";
import { Ionicons } from "@expo/vector-icons";
import TrainerStaffHome from "../screens/trainerStaff/TrainerStaffHome";
import TrainerSchedule from "../screens/trainerStaff/TrainerSchedule";
import TrainerSyllabus from "../screens/trainerStaff/TrainerSyllabus";
import TrainerProgress from "../screens/trainerStaff/TrainerProgress";
import TrainerAttendance from "../screens/trainerStaff/TrainerAttendance";
import TrainerProfile from "../screens/trainerStaff/TrainerProfile";
import TrainerLeave from "../screens/trainerStaff/TrainerLeave";
import TrainerSessionChange from "../screens/trainerStaff/TrainerSessionChange";
import { colors } from "../theme";

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Bottom-tab navigator for club-staff trainers / coaches (Manager accounts).
// Home = their sports; Schedule = the admin-set timetable; Attendance = mark
// self + students; Profile = edit + change password + attendance history.
function TrainerTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: "#15A765",
        tabBarInactiveTintColor: colors.textSub || "#666",
        tabBarLabelStyle: { fontSize: 11, fontFamily: "Montserrat_500Medium" },
        tabBarIcon: ({ color, size }) => {
          const name =
            route.name === "Schedule" ? "calendar"
            : route.name === "Syllabus" ? "book"
            : route.name === "Progress" ? "trending-up"
            : route.name === "Attendance" ? "checkmark-done-circle"
            : route.name === "Profile" ? "person"
            : "home";
          return <Ionicons name={name} size={size - 2} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={TrainerStaffHome} />
      <Tab.Screen name="Schedule" component={TrainerSchedule} />
      <Tab.Screen name="Syllabus" component={TrainerSyllabus} />
      <Tab.Screen name="Progress" component={TrainerProgress} />
      <Tab.Screen name="Attendance" component={TrainerAttendance} />
      <Tab.Screen name="Profile" component={TrainerProfile} />
    </Tab.Navigator>
  );
}

// Stack wrapper so coach request flows (Apply for Leave, Request Session Change)
// can be pushed over the tabs from Home without crowding the tab bar.
export default function TrainerStaffNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="TrainerTabs" component={TrainerTabs} />
      <Stack.Screen name="TrainerLeave" component={TrainerLeave} />
      <Stack.Screen name="TrainerSessionChange" component={TrainerSessionChange} />
    </Stack.Navigator>
  );
}
