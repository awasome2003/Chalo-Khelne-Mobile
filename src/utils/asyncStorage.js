import AsyncStorage from "@react-native-async-storage/async-storage";

// Keys
const AUTH_TOKEN = "@auth_token";
const USER_DATA = "@user_data";

// Store authentication token
export const storeToken = async (token) => {
  try {
    // Check if token is null or undefined
    if (!token) {
      console.warn("Attempted to store null/undefined token");
      return false;
    }

    await AsyncStorage.setItem(AUTH_TOKEN, token);
    return true;
  } catch (error) {
    console.error("Error storing token:", error);
    return false;
  }
};

// Get authentication token
export const getToken = async () => {
  try {
    const token = await AsyncStorage.getItem(AUTH_TOKEN);
    return token; // This will be null if no token exists
  } catch (error) {
    console.error("Error getting token:", error);
    return null;
  }
};

// Remove authentication token (logout)
export const removeToken = async () => {
  try {
    await AsyncStorage.removeItem(AUTH_TOKEN);
    await AsyncStorage.removeItem(USER_DATA);
    return true;
  } catch (error) {
    console.error("Error removing token:", error);
    return false;
  }
};

// Store user data
export const storeUserData = async (userData) => {
  try {
    // Check if userData is null or undefined
    if (!userData) {
      console.warn("Attempted to store null/undefined user data");
      return false;
    }

    const jsonValue = JSON.stringify(userData);
    await AsyncStorage.setItem(USER_DATA, jsonValue);
    return true;
  } catch (error) {
    console.error("Error storing user data:", error);
    return false;
  }
};

// Get user data
export const getUserData = async () => {
  try {
    const jsonValue = await AsyncStorage.getItem(USER_DATA);
    return jsonValue != null ? JSON.parse(jsonValue) : null;
  } catch (error) {
    console.error("Error getting user data:", error);
    return null;
  }
};
