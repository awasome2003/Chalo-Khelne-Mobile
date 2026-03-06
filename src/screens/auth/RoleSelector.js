import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";

const RoleSelector = ({ selectedRole, onSelectRole }) => {
  const roles = [
    {
      id: "Player",
      title: "Player",
      icon: "running",
      description: "Join tournaments and track your performance",
      color: "#3B4DFD", // Primary Blue
    },
    // Keep others commented out as per original
    /*
    {
      id: "Trainer",
      title: "Trainer",
      icon: "whistle",
      description: "Coach players and manage training sessions",
      color: "#FF6A00",
    },
    */
  ];

  return (
    <View style={styles.container}>
      {roles.map((role) => (
        <TouchableOpacity
          key={role.id}
          style={[
            styles.roleCard,
            selectedRole === role.id && styles.activeRoleCard,
          ]}
          onPress={() => onSelectRole(role.id)}
          activeOpacity={0.7}
        >
          <View style={[styles.iconContainer, { backgroundColor: role.color + '15' }]}>
            <FontAwesome5 name={role.icon} size={20} color={role.color} />
          </View>
          <View style={styles.roleInfo}>
            <Text style={[styles.roleTitle, selectedRole === role.id && { color: role.color }]}>
              {role.title}
            </Text>
            <Text style={styles.roleDescription} numberOfLines={2}>
              {role.description}
            </Text>
          </View>
          <View style={styles.radioContainer}>
            <View
              style={[
                styles.radioOuter,
                selectedRole === role.id && { borderColor: role.color },
              ]}
            >
              {selectedRole === role.id && (
                <View
                  style={[styles.radioInner, { backgroundColor: role.color }]}
                />
              )}
            </View>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  roleCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: "#F0F0F0",
    borderRadius: 18,
    backgroundColor: "#fff",
  },
  activeRoleCard: {
    borderColor: "#3B4DFD",
    backgroundColor: "#F8F9FF",
    elevation: 4,
    shadowColor: "#3B4DFD",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  roleInfo: {
    flex: 1,
  },
  roleTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#222",
    marginBottom: 2,
  },
  roleDescription: {
    fontSize: 13,
    color: "#777",
    lineHeight: 18,
  },
  radioContainer: {
    paddingLeft: 10,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#E0E0E0",
    justifyContent: "center",
    alignItems: "center",
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
});

export default RoleSelector;
