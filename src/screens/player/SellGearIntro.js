import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ImageBackground,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

const { width } = Dimensions.get("window");

const GREEN = "#15A765";
const TEXT_DARK = "#1A181B";

const SellGearIntro = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.navigate("Home", { screen: "PlayerHome" })}
          style={styles.backBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={22} color={TEXT_DARK} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sell Gear</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate("MyListings")}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="storefront-outline" size={22} color={TEXT_DARK} />
        </TouchableOpacity>
      </View>

      {/* Hero card */}
      <View style={styles.heroWrap}>
        <ImageBackground
          source={require("../../../assets/hero-sell.jpg")}
          style={styles.hero}
          imageStyle={styles.heroImage}
          resizeMode="cover"
        >
          <View style={styles.heroOverlay} />
          <View style={styles.heroBody}>
            <Text style={styles.heroTitle}>
              Turn your unused sports{"\n"}equipment into earnings
            </Text>
            <Text style={styles.heroSub}>It's quick, easy &amp; secure</Text>

            <TouchableOpacity
              style={styles.cta}
              onPress={() => navigation.navigate("SellAddProduct")}
              activeOpacity={0.9}
            >
              <Text style={styles.ctaText}>Start Selling</Text>
            </TouchableOpacity>
          </View>
        </ImageBackground>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backBtn: { width: 28, height: 28, justifyContent: "center" },
  headerTitle: {
    fontSize: 16,
    fontFamily: "Montserrat_500Medium",
    fontWeight: "600",
    color: TEXT_DARK,
    flex: 1,
    marginLeft: 4,
  },

  // Hero
  heroWrap: {
    marginHorizontal: 16,
    marginTop: 6,
  },
  hero: {
    width: width - 32,
    height: (width - 32) * 1.4,
    justifyContent: "center",
    alignItems: "center",
  },
  heroImage: {
    borderRadius: 18,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.18)",
    borderRadius: 18,
  },
  heroBody: {
    alignItems: "center",
    paddingHorizontal: 24,
  },
  heroTitle: {
    fontSize: 20,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "800",
    color: "#FFFFFF",
    textAlign: "center",
    lineHeight: 28,
  },
  heroSub: {
    fontSize: 13,
    fontFamily: "Poppins_400Regular",
    color: "rgba(255,255,255,0.92)",
    textAlign: "center",
    marginTop: 6,
    marginBottom: 18,
  },
  cta: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 14,
    minWidth: 220,
    alignItems: "center",
  },
  ctaText: {
    color: GREEN,
    fontSize: 15,
    fontFamily: "Montserrat_500Medium",
    fontWeight: "700",
  },
});

export default SellGearIntro;
