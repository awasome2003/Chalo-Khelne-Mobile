import React from "react";
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

/**
 * Reusable Button component.
 *
 * Props:
 * - title: string
 * - onPress: function
 * - variant: "primary" | "secondary" | "outline" | "ghost" | "danger" (default "primary")
 * - size: "sm" | "md" | "lg" (default "md")
 * - icon: string (Ionicons name, optional)
 * - loading: boolean
 * - disabled: boolean
 * - fullWidth: boolean
 * - style: custom style override
 */
export default function AppButton({
  title,
  onPress,
  variant = "primary",
  size = "md",
  icon,
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
}) {
  const variantStyle = VARIANTS[variant] || VARIANTS.primary;
  const sizeStyle = SIZES[size] || SIZES.md;

  return (
    <TouchableOpacity
      style={[
        styles.base,
        variantStyle.container,
        sizeStyle.container,
        fullWidth && { width: "100%" },
        disabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator size="small" color={variantStyle.textColor} />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={sizeStyle.iconSize} color={variantStyle.textColor} style={{ marginRight: 6 }} />}
          <Text style={[styles.text, { color: variantStyle.textColor, fontSize: sizeStyle.fontSize }]}>
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const VARIANTS = {
  primary: {
    container: { backgroundColor: "#4F46E5" },
    textColor: "#FFF",
  },
  secondary: {
    container: { backgroundColor: "#F3F4F6" },
    textColor: "#374151",
  },
  outline: {
    container: { backgroundColor: "transparent", borderWidth: 1.5, borderColor: "#4F46E5" },
    textColor: "#4F46E5",
  },
  ghost: {
    container: { backgroundColor: "transparent" },
    textColor: "#4F46E5",
  },
  danger: {
    container: { backgroundColor: "#EF4444" },
    textColor: "#FFF",
  },
};

const SIZES = {
  sm: { container: { paddingHorizontal: 12, paddingVertical: 6 }, fontSize: 12, iconSize: 14 },
  md: { container: { paddingHorizontal: 16, paddingVertical: 10 }, fontSize: 14, iconSize: 16 },
  lg: { container: { paddingHorizontal: 24, paddingVertical: 14 }, fontSize: 16, iconSize: 20 },
};

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    gap: 4,
  },
  text: { fontWeight: "700" },
  disabled: { opacity: 0.5 },
});
