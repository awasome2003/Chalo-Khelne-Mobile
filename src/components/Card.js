import React from "react";
import { View, StyleSheet } from "react-native";

/**
 * Reusable Card wrapper with consistent styling.
 *
 * Props:
 * - children: React nodes
 * - style: custom style override
 * - padding: number (default 16)
 */
export default function Card({ children, style, padding = 16 }) {
  return (
    <View style={[styles.card, { padding }, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
});
