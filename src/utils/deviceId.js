import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Application from "expo-application";
import { Platform } from "react-native";

const DEVICE_ID_KEY = "app_device_id";

/**
 * Generates or retrieves a persistent device ID for anonymous user tracking
 * Uses a combination of device-specific identifiers and stored UUID
 */
export const getDeviceId = async () => {
  try {
    // Try to get stored device ID first
    let deviceId = await AsyncStorage.getItem(DEVICE_ID_KEY);

    if (deviceId) {
      return deviceId;
    }

    // Generate new device ID using device-specific identifiers
    let uniqueId = "";

    if (Platform.OS === "android") {
      // Android ID is unique per app installation
      uniqueId = Application.androidId || "";
    } else if (Platform.OS === "ios") {
      // iOS uses identifierForVendor (unique per vendor/developer)
      uniqueId = await Application.getIosIdForVendorAsync() || "";
    }

    // If no device-specific ID available, generate random UUID
    if (!uniqueId) {
      uniqueId = generateUUID();
    }

    // Create final device ID with platform prefix for analytics
    deviceId = `${Platform.OS}_${uniqueId}_${Date.now()}`;

    // Store for future use
    await AsyncStorage.setItem(DEVICE_ID_KEY, deviceId);

    return deviceId;
  } catch (error) {
    console.error("Error getting/generating device ID:", error);
    // Fallback to timestamp-based ID
    return `${Platform.OS}_fallback_${Date.now()}`;
  }
};

/**
 * Clears the stored device ID (useful for testing or user logout)
 */
export const clearDeviceId = async () => {
  try {
    await AsyncStorage.removeItem(DEVICE_ID_KEY);
  } catch (error) {
    console.error("Error clearing device ID:", error);
  }
};

/**
 * Simple UUID generator (v4-like)
 */
const generateUUID = () => {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

/**
 * Get device information for analytics
 */
export const getDeviceInfo = () => {
  return {
    platform: Platform.OS,
    version: Platform.Version,
    appVersion: Application.nativeApplicationVersion || "1.0.0",
    buildNumber: Application.nativeBuildVersion || "1",
  };
};
