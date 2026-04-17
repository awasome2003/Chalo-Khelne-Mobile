import React from "react";
import { View, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

/**
 * Reusable Search Bar component.
 *
 * Props:
 * - value: string
 * - onChangeText: function
 * - placeholder: string
 * - onClear: function (optional)
 * - autoFocus: boolean
 */
export default function SearchBar({
  value,
  onChangeText,
  placeholder = "Search...",
  onClear,
  autoFocus = false,
}) {
  return (
    <View style={styles.container}>
      <Ionicons name="search" size={18} color="#9CA3AF" />
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        autoFocus={autoFocus}
        returnKeyType="search"
      />
      {value?.length > 0 && (
        <TouchableOpacity onPress={onClear || (() => onChangeText(""))}>
          <Ionicons name="close-circle" size={20} color="#9CA3AF" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
  },
  input: { flex: 1, fontSize: 14, color: "#1F2937" },
});
