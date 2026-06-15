import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import TrainerStaffHome from "../screens/trainerStaff/TrainerStaffHome";
import TrainerSchedule from "../screens/trainerStaff/TrainerSchedule";
import TrainerAttendance from "../screens/trainerStaff/TrainerAttendance";
import TrainerProfile from "../screens/trainerStaff/TrainerProfile";
import { colors } from "../theme";

const Tab = createBottomTabNavigator();

// Bottom-tab navigator for club-staff trainers / coaches (Manager accounts).
// Home = their sports; Schedule = the admin-set timetable; Attendance = mark
// self + students; Profile = edit + change password + attendance history.
export default function TrainerStaffNavigator() {
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
            : route.name === "Attendance" ? "checkmark-done-circle"
            : route.name === "Profile" ? "person"
            : "home";
          return <Ionicons name={name} size={size - 2} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={TrainerStaffHome} />
      <Tab.Screen name="Schedule" component={TrainerSchedule} />
      <Tab.Screen name="Attendance" component={TrainerAttendance} />
      <Tab.Screen name="Profile" component={TrainerProfile} />
    </Tab.Navigator>
  );
}
