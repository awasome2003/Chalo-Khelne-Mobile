import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Platform, StatusBar } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

/**
 * Reusable Screen Header with back button and safe area padding.
 * Solves the "header behind system bar" issue across all screens.
 *
 * Props:
 * - title: string
 * - subtitle: string (optional)
 * - showBack: boolean (default true)
 * - onBack: function (optional, defaults to navigation.goBack)
 * - rightAction: { icon, onPress } (optional)
 * - bgColor: string (default "#FFF")
 * - titleColor: string (default "#1F2937")
 */
export default function ScreenHeader({
  title,
  subtitle,
  showBack = true,
  onBack,
  rightAction,
  bgColor = "#FFF",
  titleColor = "#1F2937",
}) {
  const navigation = useNavigation();

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <View style={styles.inner}>
        {showBack && (
          <TouchableOpacity
            style={styles.backBtn}
            onPress={onBack || (() => navigation.goBack())}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={24} color={titleColor} />
          </TouchableOpacity>
        )}

        <View style={styles.titleBox}>
          <Text style={[styles.title, { color: titleColor }]} numberOfLines={1}>
            {title}
          </Text>
          {subtitle && <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>}
        </View>

        {rightAction ? (
          <TouchableOpacity
            style={styles.rightBtn}
            onPress={rightAction.onPress}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name={rightAction.icon} size={22} color={titleColor} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 36 }} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: Platform.OS === "android" ? (StatusBar.currentHeight || 0) + 8 : 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 14,
    gap: 12,
  },
  backBtn: { padding: 4 },
  titleBox: { flex: 1 },
  title: { fontSize: 18, fontWeight: "700" },
  subtitle: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  rightBtn: { padding: 4 },
});
