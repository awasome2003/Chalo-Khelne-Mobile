import React from "react";
import { View, Image, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import API from "../api/api";

/**
 * Reusable Avatar component with fallback.
 *
 * Props:
 * - uri: string (full URL or relative path from uploads/)
 * - size: number (default 44)
 * - fallbackIcon: string (default "person")
 */
export default function Avatar({ uri, size = 44, fallbackIcon = "person" }) {
  const resolvedUri = uri
    ? uri.startsWith("http")
      ? uri
      : `${API.SERVER_URL}/uploads/${uri.replace(/^uploads[\\/]/, "")}`
    : null;

  if (resolvedUri) {
    return (
      <Image
        source={{ uri: resolvedUri }}
        style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]}
      />
    );
  }

  return (
    <View style={[styles.placeholder, { width: size, height: size, borderRadius: size / 2 }]}>
      <Ionicons name={fallbackIcon} size={size * 0.5} color="#9CA3AF" />
    </View>
  );
}

const styles = StyleSheet.create({
  image: { backgroundColor: "#F3F4F6" },
  placeholder: { backgroundColor: "#F3F4F6", justifyContent: "center", alignItems: "center" },
});
