import * as Notifications from "expo-notifications";
import Constants, { ExecutionEnvironment } from "expo-constants";
import * as Device from "expo-device";
import { Platform } from "react-native";
import axios from "axios";
import TOURNAMENTS from "../api/tournaments";

class NotificationService {
  constructor() {
    this.expoPushToken = null;
    this.onNotificationReceived = null;
    this.navigationRef = null;
    this.setupNotifications();
  }

  setNavigationRef(ref) {
    this.navigationRef = ref;
  }

  cleanup = () => {
    if (this.notificationReceivedListener) {
      Notifications.removeNotificationSubscription(
        this.notificationReceivedListener
      );
    }
    if (this.notificationResponseListener) {
      Notifications.removeNotificationSubscription(
        this.notificationResponseListener
      );
    }
  };

  setupNotifications = async () => {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "Default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#FF6A00",
      });

      await Notifications.setNotificationChannelAsync("tournaments", {
        name: "Tournaments",
        description: "New tournament alerts",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#FF6A00",
      });
    }

    this.notificationReceivedListener = Notifications.addNotificationReceivedListener(
      this.handleNotificationReceived
    );

    this.notificationResponseListener = Notifications.addNotificationResponseReceivedListener(
      this.handleNotificationResponse
    );
  };

  registerPushTokenForNewUser = async (userId) => {
    if (!userId) return null;

    if (!Device.isDevice) {
      console.log("Push notifications only work on physical devices");
      return null;
    }

    // Push notifications are removed from Expo Go on Android since SDK 53
    const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
    if (Platform.OS === "android" && isExpoGo) {
      console.warn("Push notifications are not supported in Expo Go on Android. Use a development build.");
      return null;
    }

    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== "granted") {
        console.log("Notification permission not granted");
        return null;
      }

      const projectId = Constants?.expoConfig?.extra?.eas?.projectId || Constants?.easConfig?.projectId;

      const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
      this.expoPushToken = token;

      await axios.put(
        TOURNAMENTS.ENDPOINTS.NOTIFICATIONS.UPDATE_TOKEN(userId),
        { expoPushToken: token }
      );

      return token;
    } catch (error) {
      console.error("Error registering push token:", error);
      return null;
    }
  };

  handleNotificationReceived = (notification) => {
    const data = notification.request.content.data;
    if (this.onNotificationReceived) {
      this.onNotificationReceived(data);
    }
  };

  handleNotificationResponse = (response) => {
    const data = response.notification.request.content.data;
    console.log("Notification tapped with data:", data);

    if (this.navigationRef && data.type === "event" && data.relatedId) {
      this.navigationRef.navigate("Tournament Details", { tournamentId: data.relatedId });
    } else if (this.navigationRef && data.type === "session" && data.relatedId) {
      // Logic for navigation to sessions if needed
    }
  };

  fetchUserNotifications = async (userId) => {
    try {
      const response = await axios.get(TOURNAMENTS.ENDPOINTS.NOTIFICATIONS.USER(userId));
      return response.data.notifications || [];
    } catch (error) {
      return [];
    }
  };

  getUnreadCount = async (userId) => {
    try {
      const response = await axios.get(TOURNAMENTS.ENDPOINTS.NOTIFICATIONS.COUNT(userId));
      return response.data.count || 0;
    } catch (error) {
      return 0;
    }
  };

  markAsRead = async (notificationId) => {
    try {
      await axios.put(TOURNAMENTS.ENDPOINTS.NOTIFICATIONS.MARK_READ(notificationId));
    } catch (error) { }
  };

  markAllAsRead = async (userId) => {
    try {
      await axios.put(TOURNAMENTS.ENDPOINTS.NOTIFICATIONS.MARK_ALL_READ(userId));
    } catch (error) { }
  };
}

export default new NotificationService();
