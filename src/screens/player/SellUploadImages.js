import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";

const GREEN = "#15A765";
const TEXT_DARK = "#1A181B";
const TEXT_MUTED = "#6B7280";
const FIELD_BG = "#F4F4F5";
const BORDER = "#EEF1FA";

const MAX_IMAGES = 5;

const SellUploadImages = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();

  const product = route.params?.product || {};

  const [images, setImages] = useState([]); // array of { uri, name, type }
  const [previewIdx, setPreviewIdx] = useState(null);

  const pickImage = async () => {
    if (images.length >= MAX_IMAGES) {
      Alert.alert("Limit reached", `You can add up to ${MAX_IMAGES} photos.`);
      return;
    }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        "Permission needed",
        "Allow photo library access to add product photos."
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
      allowsEditing: false,
    });
    if (result.canceled) return;
    const asset = result.assets?.[0];
    if (!asset) return;
    const name = asset.fileName || asset.uri.split("/").pop() || `photo-${Date.now()}.jpg`;
    const ext = name.split(".").pop()?.toLowerCase() || "jpg";
    setImages((prev) => [
      ...prev,
      {
        uri: asset.uri,
        name,
        type: asset.mimeType || `image/${ext === "jpg" ? "jpeg" : ext}`,
      },
    ]);
  };

  const replaceImage = async (idx) => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });
    if (result.canceled) return;
    const asset = result.assets?.[0];
    if (!asset) return;
    const name = asset.fileName || asset.uri.split("/").pop() || `photo-${Date.now()}.jpg`;
    const ext = name.split(".").pop()?.toLowerCase() || "jpg";
    setImages((prev) =>
      prev.map((img, i) =>
        i === idx
          ? {
              uri: asset.uri,
              name,
              type:
                asset.mimeType ||
                `image/${ext === "jpg" ? "jpeg" : ext}`,
            }
          : img
      )
    );
  };

  const removeImage = (idx) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
    setPreviewIdx(null);
  };

  // ─── Continue → Seller Details (final step) ────────────────────────
  const handleNext = () => {
    if (images.length === 0) {
      Alert.alert("Add a photo", "Add at least one product photo to continue.");
      return;
    }
    navigation.navigate("SellSellerDetails", { product, images });
  };

  // ─── Render ────────────────────────────────────────────────────────
  const slots = [];
  for (let i = 0; i < Math.min(images.length + 1, MAX_IMAGES); i++) {
    slots.push(i);
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={22} color={TEXT_DARK} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Upload Images</Text>
      </View>

      {/* Progress bar — step 2 of 2 */}
      <View style={styles.progressTrack}>
        <View style={styles.progressFill} />
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: 110 + insets.bottom,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionTitle}>Add product photos</Text>

        <View style={styles.grid}>
          {slots.map((i) => {
            const isFilled = i < images.length;
            return (
              <TouchableOpacity
                key={`slot-${i}`}
                style={[styles.slot, !isFilled && styles.slotEmpty]}
                onPress={() => (isFilled ? setPreviewIdx(i) : pickImage())}
                activeOpacity={0.85}
              >
                {isFilled ? (
                  <Image
                    source={{ uri: images[i].uri }}
                    style={styles.slotImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.addBubble}>
                    <Ionicons name="add" size={22} color={TEXT_MUTED} />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.helperText}>
          {images.length}/{MAX_IMAGES} photos · Tap a photo to preview
        </Text>
      </ScrollView>

      {/* Bottom CTA */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity
          style={styles.nextBtn}
          onPress={handleNext}
          activeOpacity={0.9}
        >
          <Text style={styles.nextBtnText}>Next</Text>
        </TouchableOpacity>
      </View>

      {/* Fullscreen preview with inline Replace / Remove */}
      <Modal
        transparent
        visible={previewIdx !== null}
        animationType="fade"
        onRequestClose={() => setPreviewIdx(null)}
        statusBarTranslucent
      >
        <View style={styles.previewRoot}>
          {/* Top bar */}
          <View
            style={[
              styles.previewTopBar,
              { paddingTop: insets.top + 8 },
            ]}
          >
            <TouchableOpacity
              onPress={() => setPreviewIdx(null)}
              style={styles.previewIconBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={22} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.previewCounter}>
              {previewIdx !== null
                ? `${previewIdx + 1} / ${images.length}`
                : ""}
            </Text>
            <View style={styles.previewIconBtn} />
          </View>

          {/* Image */}
          <View style={styles.previewImageWrap}>
            {previewIdx !== null && images[previewIdx] ? (
              <Image
                source={{ uri: images[previewIdx].uri }}
                style={styles.previewImage}
                resizeMode="contain"
              />
            ) : null}
          </View>

          {/* Action bar */}
          <View
            style={[
              styles.previewActions,
              { paddingBottom: insets.bottom + 14 },
            ]}
          >
            <TouchableOpacity
              style={styles.previewReplaceBtn}
              onPress={() => {
                const idx = previewIdx;
                setPreviewIdx(null);
                replaceImage(idx);
              }}
              activeOpacity={0.85}
            >
              <Ionicons name="image-outline" size={18} color="#FFFFFF" />
              <Text style={styles.previewActionText}>Replace</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.previewRemoveBtn}
              onPress={() => removeImage(previewIdx)}
              activeOpacity={0.85}
            >
              <Ionicons name="trash-outline" size={18} color="#FFFFFF" />
              <Text style={styles.previewActionText}>Remove</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

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

  progressTrack: {
    marginHorizontal: 16,
    height: 3,
    backgroundColor: "#EAEAEA",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: { width: "50%", height: "100%", backgroundColor: GREEN },

  sectionTitle: {
    fontSize: 16,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "700",
    color: TEXT_DARK,
    marginBottom: 14,
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  slot: {
    width: "48%",
    height: 180,
    borderRadius: 14,
    backgroundColor: FIELD_BG,
    marginBottom: 12,
  },
  slotImage: {
    width: "100%",
    height: "100%",
    borderRadius: 14,
  },
  slotEmpty: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#D1D5DB",
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  addBubble: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#F0F0F2",
    alignItems: "center",
    justifyContent: "center",
  },

  helperText: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    color: TEXT_MUTED,
    marginTop: 14,
  },

  // CTA
  bottomBar: {
    paddingHorizontal: 16,
    paddingTop: 10,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  nextBtn: {
    backgroundColor: GREEN,
    borderRadius: 28,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  nextBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontFamily: "Montserrat_500Medium",
    fontWeight: "700",
  },

  // Preview
  previewRoot: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
  },
  previewTopBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  previewIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  previewCounter: {
    color: "#FFFFFF",
    fontSize: 13,
    fontFamily: "Montserrat_500Medium",
    fontWeight: "600",
  },
  previewImageWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  previewActions: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  previewReplaceBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: GREEN,
    height: 48,
    borderRadius: 14,
  },
  previewRemoveBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#DC2626",
    height: 48,
    borderRadius: 14,
  },
  previewActionText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontFamily: "Montserrat_500Medium",
    fontWeight: "700",
  },
});

export default SellUploadImages;
