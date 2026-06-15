import React from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from "react-native";

export default function SportTabStrip({ sports, activeSportId, onChange }) {
  if (!Array.isArray(sports) || sports.length <= 1) return null;

  return (
    <View style={styles.wrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {sports.map((s) => {
          const id = String(s.sportId || s._id || s.id || "");
          const label = s.sportName || s.name || "Sport";
          const active = id === String(activeSportId || "");
          return (
            <TouchableOpacity
              key={id || label}
              onPress={() => onChange?.(id)}
              activeOpacity={0.8}
              style={[styles.pill, active && styles.pillActive]}
            >
              <Text style={[styles.pillText, active && styles.pillTextActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingVertical: 8,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  row: {
    paddingHorizontal: 12,
    gap: 8,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "transparent",
    marginRight: 8,
  },
  pillActive: {
    backgroundColor: "#ECFDF5",
    borderColor: "#10B981",
  },
  pillText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
  },
  pillTextActive: {
    color: "#047857",
  },
});
