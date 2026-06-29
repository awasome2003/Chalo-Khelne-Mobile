import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

const GREEN = "#15A765";
const ORANGE = "#F59E0B";
const TEXT_DARK = "#1A181B";
const TEXT_MUTED = "#6B7280";
const BORDER = "#EEF1FA";

const SUPPORT_PHONE = "+91 98765 43210";

const STAGE_STATUS = { DONE: "done", ACTIVE: "active", PENDING: "pending" };

const formatStamp = (d) =>
  d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

// Build stages with status derived from days elapsed since the order was placed.
const buildStages = (orderDate) => {
  const now = new Date();
  const elapsedDays = Math.floor(
    (now - orderDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  const stamp = (offsetDays, offsetHours = 0, offsetMins = 0) => {
    const d = new Date(orderDate.getTime());
    d.setDate(d.getDate() + offsetDays);
    d.setHours(d.getHours() + offsetHours);
    d.setMinutes(d.getMinutes() + offsetMins);
    return formatStamp(d);
  };

  const statusFor = (stageIdx) => {
    if (elapsedDays > stageIdx) return STAGE_STATUS.DONE;
    if (elapsedDays === stageIdx) return STAGE_STATUS.ACTIVE;
    return STAGE_STATUS.PENDING;
  };

  return [
    {
      label: "Order Confirmed",
      stamp: stamp(0),
      status: STAGE_STATUS.DONE,
    },
    {
      label: "Packed by IONIX",
      stamp: stamp(1, -1, -10),
      status: statusFor(1),
    },
    {
      label: "Shipped",
      stamp: stamp(2, -2, -30),
      status: statusFor(2),
    },
    {
      label: "Out for Delivery",
      stamp:
        elapsedDays >= 3
          ? stamp(3, -2)
          : "Pending",
      status: statusFor(3),
    },
  ];
};

const TrackOrder = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();

  const { orderDate } = route.params || {};
  const baseDate = orderDate ? new Date(orderDate) : new Date();
  const stages = buildStages(baseDate);

  const callSupport = () => {
    const tel = SUPPORT_PHONE.replace(/[\s-]/g, "");
    Linking.openURL(`tel:${tel}`);
  };
  const openChat = () =>
    navigation.navigate("Chat", { screen: "ChatList" });

  // ─── Render a single timeline row ────────────────────────────────
  const StageRow = ({ stage, isLast }) => {
    const isDone = stage.status === STAGE_STATUS.DONE;
    const isActive = stage.status === STAGE_STATUS.ACTIVE;

    return (
      <View style={styles.row}>
        {/* Indicator + connector column */}
        <View style={styles.indicatorCol}>
          {isDone ? (
            <View style={[styles.bullet, { backgroundColor: GREEN }]}>
              <Ionicons name="checkmark" size={14} color="#FFFFFF" />
            </View>
          ) : isActive ? (
            <View style={[styles.bullet, { backgroundColor: ORANGE }]}>
              <Ionicons name="time-outline" size={14} color="#FFFFFF" />
            </View>
          ) : (
            <View style={styles.bulletPending} />
          )}
          {!isLast && (
            <View
              style={[
                styles.connector,
                {
                  backgroundColor: isDone ? GREEN : "#E5E7EB",
                },
              ]}
            />
          )}
        </View>

        {/* Text */}
        <View style={styles.rowText}>
          <Text
            style={[
              styles.stageLabel,
              !isDone && !isActive && styles.stagePending,
            ]}
          >
            {stage.label}
          </Text>
          <Text style={styles.stageStamp}>{stage.stamp}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.navigate("EquipmentHub")}
          style={styles.backBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={22} color={TEXT_DARK} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order Tracking</Text>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: 40 + insets.bottom,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Timeline card */}
        <View style={styles.card}>
          {stages.map((s, i) => (
            <StageRow key={s.label} stage={s} isLast={i === stages.length - 1} />
          ))}
        </View>

        {/* Need help */}
        <View style={styles.helpCard}>
          <Text style={styles.helpTitle}>Need help?</Text>
          <Text style={styles.helpSub}>
            Your item is safe. Reach out for updates
          </Text>
          <View style={styles.helpRow}>
            <TouchableOpacity
              style={styles.helpBtn}
              onPress={callSupport}
              activeOpacity={0.85}
            >
              <Ionicons name="call-outline" size={18} color={GREEN} />
              <Text style={styles.helpBtnText}>{SUPPORT_PHONE}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.helpBtn}
              onPress={openChat}
              activeOpacity={0.85}
            >
              <Ionicons
                name="chatbubble-ellipses-outline"
                size={18}
                color={GREEN}
              />
              <Text style={styles.helpBtnText}>Chat with us</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const BULLET_SIZE = 22;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  backBtn: { width: 28, height: 28, justifyContent: "center" },
  headerTitle: {
    fontSize: 16,
    fontFamily: "Montserrat_500Medium",
    fontWeight: "600",
    color: TEXT_DARK,
  },

  // Card
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    paddingVertical: 18,
    paddingHorizontal: 16,
    marginTop: 6,
  },

  // Row
  row: { flexDirection: "row", alignItems: "stretch" },
  indicatorCol: {
    alignItems: "center",
    width: BULLET_SIZE,
    marginRight: 14,
  },
  bullet: {
    width: BULLET_SIZE,
    height: BULLET_SIZE,
    borderRadius: BULLET_SIZE / 2,
    justifyContent: "center",
    alignItems: "center",
  },
  bulletPending: {
    width: BULLET_SIZE,
    height: BULLET_SIZE,
    borderRadius: BULLET_SIZE / 2,
    borderWidth: 1.5,
    borderColor: "#D1D5DB",
    backgroundColor: "#FFFFFF",
  },
  connector: {
    flex: 1,
    width: 2,
    marginVertical: 2,
  },
  rowText: { flex: 1, paddingBottom: 18 },
  stageLabel: {
    fontSize: 15,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "700",
    color: TEXT_DARK,
  },
  stagePending: { color: TEXT_DARK },
  stageStamp: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    color: TEXT_MUTED,
    marginTop: 4,
  },

  // Help
  helpCard: {
    marginTop: 16,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: "#FFFFFF",
  },
  helpTitle: {
    fontSize: 15,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "700",
    color: TEXT_DARK,
  },
  helpSub: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    color: TEXT_MUTED,
    marginTop: 2,
    marginBottom: 12,
  },
  helpRow: { flexDirection: "row", gap: 10 },
  helpBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    paddingVertical: 12,
  },
  helpBtnText: {
    fontSize: 12,
    fontFamily: "Montserrat_500Medium",
    fontWeight: "700",
    color: GREEN,
  },
});

export default TrackOrder;
