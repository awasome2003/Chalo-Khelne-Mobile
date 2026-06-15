import React from "react";
import { TouchableOpacity, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";

/**
 * Shared retry banner for failed data loads. Renders nothing unless `visible`.
 * Replaces silent catch blocks that left users staring at a false "empty" list.
 */
export default function ErrorBanner({ visible, onRetry, message = "Couldn't load. Tap to retry." }) {
  if (!visible) return null;
  return (
    <TouchableOpacity
      onPress={onRetry}
      activeOpacity={0.85}
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        backgroundColor: "#FFE2E2",
        paddingVertical: 10,
        marginHorizontal: 16,
        borderRadius: 10,
        marginTop: 8,
      }}
    >
      <Ionicons name="cloud-offline-outline" size={16} color="#D7263D" />
      <Text style={{ color: "#D7263D", fontFamily: "Montserrat_600SemiBold", fontSize: 13 }}>{message}</Text>
    </TouchableOpacity>
  );
}
