import React from "react";
import { View, Text, StyleSheet } from "react-native";

const VARIANTS = {
  success: { bg: "#D1FAE5", text: "#059669" },
  warning: { bg: "#FEF3C7", text: "#D97706" },
  error: { bg: "#FEE2E2", text: "#DC2626" },
  info: { bg: "#DBEAFE", text: "#2563EB" },
  purple: { bg: "#EDE9FE", text: "#7C3AED" },
  gray: { bg: "#F3F4F6", text: "#6B7280" },
};

/**
 * Reusable Badge/Chip component.
 *
 * Props:
 * - label: string
 * - variant: "success" | "warning" | "error" | "info" | "purple" | "gray"
 * - size: "sm" | "md" (default "sm")
 */
export default function Badge({ label, variant = "gray", size = "sm" }) {
  const v = VARIANTS[variant] || VARIANTS.gray;
  const isSmall = size === "sm";

  return (
    <View style={[styles.badge, { backgroundColor: v.bg }, isSmall ? styles.sm : styles.md]}>
      <Text style={[styles.text, { color: v.text }, isSmall && { fontSize: 10 }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { borderRadius: 8, alignSelf: "flex-start" },
  sm: { paddingHorizontal: 6, paddingVertical: 2 },
  md: { paddingHorizontal: 10, paddingVertical: 4 },
  text: { fontSize: 12, fontWeight: "700" },
});
