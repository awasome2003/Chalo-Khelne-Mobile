import React, { useState, useRef, useEffect, useCallback } from "react";
import { useRoute, useFocusEffect } from "@react-navigation/native";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  Animated,
  Share,
  Dimensions,
  ActivityIndicator,
  Linking,
  Alert,
  Platform,
  RefreshControl,
  FlatList,
  Modal,
  KeyboardAvoidingView,
  StatusBar,
  TouchableWithoutFeedback,
} from "react-native";
import {
  Feather,
  MaterialIcons,
  Ionicons,
  MaterialCommunityIcons,
  FontAwesome5,
} from "@expo/vector-icons";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Add from "./AddPopUp";
import POSTS from "../../api/posts";
import STORIES from "../../api/stories";
import API from "../../api/api";
import CHAT from "../../api/chat";
import { authFetch } from "../../api/authFetch";
import { assetUrl } from "../../utils/assetUrl";
import * as ImagePicker from "expo-image-picker";
import Svg, { Path, G, Defs, ClipPath, Rect } from "react-native-svg";

const { width } = Dimensions.get("window");

const SafeImage = ({ uri, style, fallback, ...rest }) => {
  const [failed, setFailed] = useState(false);
  return (
    <Image
      source={uri && !failed ? { uri } : fallback}
      style={style}
      onError={() => setFailed(true)}
      {...rest}
    />
  );
};

// ─── UTILS ───────────────────────────────────────────────────────────────
const formatTimeAgo = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  const month = months[date.getMonth()];
  const day = date.getDate();
  return `${month} ${day}`;
};

// ─── ICONS ───────────────────────────────────────────────────────────────
const ChatIcon = ({ width = 24, height = 24, color = "#222" }) => (
  <Svg width={width} height={height} viewBox="0 0 24 24" fill="none">
    <G clipPath="url(#clip0_625_2675)">
      <Path d="M14.25 4.5H5.25C4.836 4.5 4.5 4.836 4.5 5.25C4.5 5.664 4.836 6 5.25 6H14.25C14.664 6 15 5.664 15 5.25C15 4.836 14.664 4.5 14.25 4.5Z" fill={color} />
      <Path d="M11.25 7.5H5.25C4.836 7.5 4.5 7.836 4.5 8.25C4.5 8.664 4.836 9 5.25 9H11.25C11.664 9 12 8.664 12 8.25C12 7.836 11.664 7.5 11.25 7.5Z" fill={color} />
      <Path d="M16.5 0H3C1.3455 0 0 1.3455 0 3V18C0 18.291 0.168 18.5565 0.432 18.6795C0.5325 18.726 0.642 18.75 0.75 18.75C0.9225 18.75 1.0935 18.69 1.23 18.576L5.5215 15H16.5C18.1545 15 19.5 13.6545 19.5 12V3C19.5 1.3455 18.1545 0 16.5 0ZM18 12C18 12.8265 17.328 13.5 16.5 13.5H5.25C5.0745 13.5 4.905 13.5615 4.77 13.674L1.5 16.3995V3C1.5 2.1735 2.172 1.5 3 1.5H16.5C17.328 1.5 18 2.1735 18 3V12Z" fill={color} />
      <Path d="M21 6C20.586 6 20.25 6.336 20.25 6.75C20.25 7.164 20.586 7.5 21 7.5C21.828 7.5 22.5 8.1735 22.5 9V21.6885L19.968 19.6635C19.836 19.5585 19.6695 19.5 19.5 19.5H9C8.172 19.5 7.5 18.8265 7.5 18V17.25C7.5 16.836 7.164 16.5 6.75 16.5C6.336 16.5 6 16.836 6 17.25V18C6 19.6545 7.3455 21 9 21H19.236L22.7805 23.8365C22.917 23.9445 23.0835 24 23.25 24C23.3595 24 23.4705 23.976 23.5755 23.9265C23.835 23.8005 24 23.538 24 23.25V9C24 7.3455 22.6545 6 21 6Z" fill={color} />
    </G>
    <Defs>
      <ClipPath id="clip0_625_2675">
        <Rect width="24" height="24" fill="white" />
      </ClipPath>
    </Defs>
  </Svg>
);

const PeopleIcon = ({ width = 24, height = 24, color = "#222" }) => (
  <Svg width={width} height={height} viewBox="0 0 24 24" fill="none">
    <Path d="M18 22.75H6C4.74071 22.7484 3.53345 22.2475 2.643 21.357C1.75254 20.4666 1.25159 19.2593 1.25 18V6C1.25159 4.74071 1.75254 3.53345 2.643 2.643C3.53345 1.75254 4.74071 1.25159 6 1.25H18C19.2593 1.25159 20.4666 1.75254 21.357 2.643C22.2475 3.53345 22.7484 4.74071 22.75 6V18C22.7484 19.2593 22.2475 20.4666 21.357 21.357C20.4666 22.2475 19.2593 22.7484 18 22.75ZM6 2.75C5.13837 2.75106 4.31234 3.09381 3.70307 3.70307C3.09381 4.31234 2.75106 5.13837 2.75 6V18C2.75106 18.8616 3.09381 19.6877 3.70307 20.2969C4.31234 20.9062 5.13837 21.2489 6 21.25H18C18.8616 21.2489 19.6877 20.9062 20.2969 20.2969C20.9062 19.6877 21.2489 18.8616 21.25 18V6C21.2489 5.13837 20.9062 4.31234 20.2969 3.70307C19.6877 3.09381 18.8616 2.75106 18 2.75H6Z" fill={color} />
    <Path d="M12 12.75C11.2583 12.75 10.5333 12.5301 9.91661 12.118C9.29993 11.706 8.81928 11.1203 8.53545 10.4351C8.25163 9.74984 8.17736 8.99584 8.32206 8.26841C8.46675 7.54098 8.8239 6.8728 9.34835 6.34835C9.8728 5.8239 10.541 5.46675 11.2684 5.32206C11.9958 5.17736 12.7498 5.25162 13.4351 5.53545C14.1203 5.81928 14.706 6.29993 15.118 6.91661C15.5301 7.5333 15.75 8.25832 15.75 9C15.7489 9.99424 15.3535 10.9475 14.6505 11.6505C13.9475 12.3535 12.9942 12.7489 12 12.75ZM12 6.75C11.555 6.75 11.12 6.88196 10.75 7.12919C10.38 7.37643 10.0916 7.72783 9.92127 8.13896C9.75098 8.5501 9.70642 9.0025 9.79323 9.43895C9.88005 9.87541 10.0943 10.2763 10.409 10.591C10.7237 10.9057 11.1246 11.12 11.561 11.2068C11.9975 11.2936 12.4499 11.249 12.861 11.0787C13.2722 10.9084 13.6236 10.62 13.8708 10.25C14.118 9.88002 14.25 9.44501 14.25 9C14.2495 8.40343 14.0122 7.83144 13.5904 7.4096C13.1686 6.98775 12.5966 6.75053 12 6.75Z" fill={color} />
    <Path d="M6.98108 17.825C6.95032 17.825 6.91959 17.823 6.88908 17.819C6.79131 17.807 6.69686 17.7759 6.61112 17.7273C6.52539 17.6788 6.45005 17.6139 6.38941 17.5363C6.32877 17.4586 6.28402 17.3698 6.25771 17.2749C6.2314 17.18 6.22405 17.0808 6.23608 16.983C6.36356 15.9535 6.86266 15.006 7.63957 14.3186C8.41648 13.6312 9.41771 13.2512 10.4551 13.25H13.5451C14.5825 13.2509 15.5839 13.6309 16.3608 14.3183C17.1378 15.0058 17.6368 15.9534 17.7641 16.983C17.7883 17.1805 17.7332 17.3795 17.6107 17.5362C17.4883 17.693 17.3085 17.7947 17.1111 17.819C16.9136 17.8433 16.7146 17.7881 16.5578 17.6656C16.4011 17.5432 16.2993 17.3635 16.2751 17.166C16.1927 16.4998 15.8698 15.8865 15.3671 15.4416C14.8643 14.9967 14.2164 14.7508 13.5451 14.75H10.4551C9.78376 14.7508 9.13584 14.9967 8.63311 15.4416C8.13038 15.8865 7.80747 16.4998 7.72508 17.166C7.70266 17.3476 7.61469 17.5148 7.47769 17.6362C7.34069 17.7575 7.1641 17.8247 6.98108 17.825Z" fill={color} />
  </Svg>
);

// ─── EMOJI PICKER (curated, encoded-safe via codePoints) ────────────────
// Categories of emojis. Each list uses String.fromCodePoint so the file
// content stays ASCII and is immune to Latin-1/UTF-8 mojibake.
const cp = (...nums) => String.fromCodePoint(...nums);
const EMOJI_CATEGORIES = {
  smileys: [
    cp(0x1f600), cp(0x1f603), cp(0x1f604), cp(0x1f601), cp(0x1f606), cp(0x1f605),
    cp(0x1f923), cp(0x1f602), cp(0x1f642), cp(0x1f643), cp(0x1f609), cp(0x1f60a),
    cp(0x1f607), cp(0x1f60d), cp(0x1f970), cp(0x1f618), cp(0x1f617), cp(0x1f61a),
    cp(0x1f619), cp(0x1f60b), cp(0x1f61b), cp(0x1f61c), cp(0x1f92a), cp(0x1f928),
    cp(0x1f9d0), cp(0x1f913), cp(0x1f60e), cp(0x1f929), cp(0x1f973), cp(0x1f60f),
    cp(0x1f612), cp(0x1f614), cp(0x1f61f), cp(0x1f641), cp(0x1f623), cp(0x1f625),
    cp(0x1f622), cp(0x1f62d), cp(0x1f624), cp(0x1f620), cp(0x1f621), cp(0x1f92c),
    cp(0x1f92f), cp(0x1f633), cp(0x1f975), cp(0x1f976), cp(0x1f631), cp(0x1f628),
    cp(0x1f630), cp(0x1f625), cp(0x1f44d), cp(0x1f44e), cp(0x1f44f), cp(0x1f64c),
    cp(0x1f64f), cp(0x1f91d), cp(0x1f4aa), cp(0x2764, 0xfe0f), cp(0x1f499),
    cp(0x1f49a), cp(0x1f49b), cp(0x1f9e1), cp(0x1f49c), cp(0x1f5a4),
  ],
  sports: [
    cp(0x26bd), cp(0x1f3c0), cp(0x1f3c8), cp(0x26be), cp(0x1f3be), cp(0x1f3d0),
    cp(0x1f3d1), cp(0x1f3cf), cp(0x1f3f8), cp(0x1f3a3), cp(0x1f94a), cp(0x1f94b),
    cp(0x26f3), cp(0x1f3af), cp(0x1f3c6), cp(0x1f3c5), cp(0x1f947), cp(0x1f948),
    cp(0x1f949), cp(0x1f3aa), cp(0x1f3af), cp(0x1f3bd), cp(0x1f3bf), cp(0x26f7),
  ],
  food: [
    cp(0x1f354), cp(0x1f355), cp(0x1f35f), cp(0x1f32d), cp(0x1f37f), cp(0x1f366),
    cp(0x1f367), cp(0x1f369), cp(0x1f36a), cp(0x1f36b), cp(0x1f370), cp(0x1f382),
    cp(0x1f375), cp(0x2615), cp(0x1f964), cp(0x1f37a), cp(0x1f377), cp(0x1f34e),
    cp(0x1f34a), cp(0x1f34c), cp(0x1f349), cp(0x1f347), cp(0x1f353),
  ],
  travel: [
    cp(0x1f697), cp(0x1f695), cp(0x1f699), cp(0x1f68c), cp(0x1f6b2), cp(0x2708, 0xfe0f),
    cp(0x1f680), cp(0x26f5), cp(0x1f3d6, 0xfe0f), cp(0x1f3d4, 0xfe0f),
    cp(0x1f5fc), cp(0x1f5fd), cp(0x1f3df, 0xfe0f),
  ],
  objects: [
    cp(0x1f4a1), cp(0x1f4a5), cp(0x1f389), cp(0x1f38a), cp(0x1f381), cp(0x1f3b5),
    cp(0x1f3b6), cp(0x1f3a7), cp(0x1f4f7), cp(0x1f4f1), cp(0x1f4bb), cp(0x231a),
    cp(0x23f0), cp(0x1f526), cp(0x1f50b),
  ],
  symbols: [
    cp(0x2705), cp(0x274c), cp(0x2b50), cp(0x1f31f), cp(0x2728), cp(0x1f525),
    cp(0x1f4af), cp(0x1f44c), cp(0x270c, 0xfe0f), cp(0x1f91e), cp(0x1f91f),
    cp(0x1f44b), cp(0x270b),
  ],
};
const EMOJI_CATEGORY_KEYS = Object.keys(EMOJI_CATEGORIES);
const EMOJI_CATEGORY_ICONS = {
  smileys: { lib: MaterialIcons, name: "sentiment-satisfied" },
  sports: { lib: MaterialIcons, name: "sports-soccer" },
  food: { lib: MaterialIcons, name: "fastfood" },
  travel: { lib: MaterialIcons, name: "directions-car" },
  objects: { lib: MaterialIcons, name: "lightbulb" },
  symbols: { lib: MaterialIcons, name: "flag" },
};

const EmojiPicker = ({ onSelect }) => {
  const [activeCat, setActiveCat] = useState("smileys");
  const list = EMOJI_CATEGORIES[activeCat] || [];

  return (
    <View style={styles.emojiPickerContainer}>
      <View style={styles.emojiHeader}>
        <View style={styles.emojiHeaderLeft}>
          {EMOJI_CATEGORY_KEYS.map((k) => {
            const meta = EMOJI_CATEGORY_ICONS[k];
            const Icon = meta.lib;
            const active = activeCat === k;
            return (
              <TouchableOpacity
                key={k}
                style={[styles.emojiCategoryBtn, active && styles.activeCategory]}
                onPress={() => setActiveCat(k)}
              >
                <Icon name={meta.name} size={22} color={active ? "#fff" : "#999"} />
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.emojiGrid}
      >
        {list.map((emoji, index) => (
          <TouchableOpacity
            key={`${activeCat}-${index}`}
            style={styles.emojiItem}
            onPress={() => onSelect(emoji)}
          >
            <Text style={styles.emojiText}>{emoji}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

// ─── COMMENT MODAL ───────────────────────────────────────────────────────
const CommentModal = ({
  visible,
  onClose,
  post,
  onAddComment,
  onDeleteComment,
  currentUserId,
}) => {
  const [commentText, setCommentText] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  const handleSubmit = async () => {
    if (!commentText.trim()) return;
    setLoading(true);
    await onAddComment(post._id, commentText);
    setCommentText("");
    setLoading(false);
  };

  const handleDelete = (commentId) => {
    Alert.alert("Delete Comment", "Are you sure you want to delete this comment?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => onDeleteComment(post._id, commentId),
      },
    ]);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <TouchableOpacity style={{ flex: 1 }} onPress={onClose} />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.modalContent}
        >
          <View style={styles.modalHeader}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Comments</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Feather name="x" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <FlatList
            data={post?.comments || []}
            keyExtractor={(item, index) => item._id || index.toString()}
            renderItem={({ item }) => {
              const authorId =
                typeof item.user === "object" ? item.user?._id : item.user;
              const isOwn = String(authorId || "") === String(currentUserId || "");
              return (
                <View style={styles.commentItem}>
                  <Image
                    source={
                      item.user?.profileImage
                        ? { uri: assetUrl(item.user.profileImage) }
                        : require("../../../assets/profile.jpg")
                    }
                    style={styles.commentAvatar}
                  />
                  <View style={styles.commentBody}>
                    <View style={styles.commentHeader}>
                      <Text style={styles.commentUser}>{item.user?.name || "User"}</Text>
                      <Text style={styles.commentTime}>{formatTimeAgo(item.createdAt)}</Text>
                    </View>
                    <Text style={styles.commentText}>{item.text}</Text>
                  </View>
                  {isOwn && (
                    <TouchableOpacity
                      onPress={() => handleDelete(item._id)}
                      style={styles.commentDeleteBtn}
                    >
                      <Feather name="trash-2" size={16} color="#999" />
                    </TouchableOpacity>
                  )}
                </View>
              );
            }}
            contentContainerStyle={styles.commentList}
            ListEmptyComponent={
              <View style={styles.emptyComments}>
                <Text style={styles.emptyText}>No comments yet. Be the first!</Text>
              </View>
            }
          />

          <View style={styles.commentInputContainer}>
            <TextInput
              ref={inputRef}
              style={styles.commentInput}
              placeholder="Add a comment..."
              value={commentText}
              onChangeText={setCommentText}
              placeholderTextColor="#999"
            />
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={!commentText.trim() || loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#15A765" />
              ) : (
                <Text
                  style={[
                    styles.postBtnText,
                    !commentText.trim() && styles.disabledText,
                  ]}
                >
                  Post
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

// ─── TEXT STORY MODAL ────────────────────────────────────────────────────
const TextStoryModal = ({ visible, onClose, onPost, submitting }) => {
  const [text, setText] = useState("");
  const [bgColor, setBgColor] = useState("#2D3E4E");
  const [fontFamily, setFontFamily] = useState("System");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const bgColors = ["#2D3E4E", "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEEAD", "#D4A5A5", "#9B59B6"];
  const fonts = ["System", "Montserrat", "monospace", "serif"];

  const cycleColor = () => {
    const currentIndex = bgColors.indexOf(bgColor);
    setBgColor(bgColors[(currentIndex + 1) % bgColors.length]);
  };
  const cycleFont = () => {
    const currentIndex = fonts.indexOf(fontFamily);
    setFontFamily(fonts[(currentIndex + 1) % fonts.length]);
  };
  const handleEmojiSelect = (emoji) => setText((prev) => prev + emoji);

  const resetAndClose = () => {
    setText("");
    setShowEmojiPicker(false);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="fade" transparent={false}>
      <TouchableWithoutFeedback onPress={() => setShowEmojiPicker(false)}>
        <View style={[styles.textStoryContainer, { backgroundColor: bgColor }]}>
          <StatusBar hidden />
          <View style={styles.textStoryHeader}>
            <TouchableOpacity onPress={resetAndClose} style={styles.textStoryClose}>
              <Feather name="x" size={28} color="#fff" />
            </TouchableOpacity>
            <View style={styles.textStoryTools}>
              <TouchableOpacity
                onPress={() => setShowEmojiPicker(!showEmojiPicker)}
                style={styles.textStoryToolBtn}
              >
                <MaterialIcons name="sentiment-satisfied" size={24} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity onPress={cycleFont} style={styles.textStoryToolBtn}>
                <Text
                  style={{
                    color: "#fff",
                    fontWeight: "bold",
                    fontSize: 18,
                    fontFamily: fontFamily === "System" ? undefined : fontFamily,
                  }}
                >
                  Aa
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={cycleColor} style={styles.textStoryToolBtn}>
                <MaterialIcons name="palette" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.textStoryInputWrapper}>
            <TextInput
              style={[
                styles.textStoryInput,
                { fontFamily: fontFamily === "System" ? undefined : fontFamily },
              ]}
              placeholder="Type a status"
              placeholderTextColor="rgba(255,255,255,0.5)"
              multiline
              maxLength={200}
              value={text}
              onChangeText={setText}
              autoFocus={!showEmojiPicker}
              textAlign="center"
              showSoftInputOnFocus={!showEmojiPicker}
            />
          </View>

          {showEmojiPicker && (
            <View style={styles.emojiPickerWrapper}>
              <EmojiPicker onSelect={handleEmojiSelect} />
            </View>
          )}

          {!showEmojiPicker && (
            <TouchableOpacity
              style={[
                styles.textStorySendBtn,
                (!text.trim() || submitting) && { opacity: 0.5 },
              ]}
              onPress={() => {
                if (!text.trim() || submitting) return;
                onPost(text, bgColor, fontFamily, () => {
                  setText("");
                  resetAndClose();
                });
              }}
              disabled={!text.trim() || submitting}
            >
              <View style={styles.sendIconCircle}>
                {submitting ? (
                  <ActivityIndicator color={bgColor} />
                ) : (
                  <MaterialIcons name="send" size={24} color={bgColor} />
                )}
              </View>
            </TouchableOpacity>
          )}
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

// ─── FULL-SCREEN STORY VIEW ──────────────────────────────────────────────
const StoryViewModal = ({
  visible,
  onClose,
  stories,
  initialIndex = 0,
  onDelete,
  onReply,
  canDelete,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const progress = useRef(new Animated.Value(0)).current;
  const STORY_DURATION = 5000;

  useEffect(() => {
    if (visible) setCurrentIndex(initialIndex);
    else {
      progress.stopAnimation();
      progress.setValue(0);
    }
  }, [visible, initialIndex]);

  useEffect(() => {
    if (visible && stories && stories.length > 0) startAnimation();
    return () => progress.stopAnimation();
  }, [currentIndex, visible]);

  const startAnimation = () => {
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration: STORY_DURATION,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) handleNext();
    });
  };

  const handleNext = () => {
    progress.stopAnimation();
    if (currentIndex < stories.length - 1) setCurrentIndex(currentIndex + 1);
    else onClose();
  };
  const handlePrev = () => {
    progress.stopAnimation();
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
    else startAnimation();
  };

  if (!stories || stories.length === 0) return null;
  const currentStory = stories[currentIndex];

  return (
    <Modal visible={visible} animationType="fade" transparent={false}>
      <View
        style={[
          styles.storyFullContainer,
          currentStory.image
            ? { backgroundColor: "#000" }
            : { backgroundColor: currentStory.bgColor },
        ]}
      >
        <StatusBar hidden />

        <View style={styles.storyProgressContainer}>
          {stories.map((_, i) => (
            <View key={i} style={styles.storyProgressBarWrapper}>
              <Animated.View
                style={[
                  styles.storyProgressBar,
                  {
                    backgroundColor: "#fff",
                    width:
                      i < currentIndex
                        ? "100%"
                        : i === currentIndex
                        ? progress.interpolate({
                            inputRange: [0, 1],
                            outputRange: ["0%", "100%"],
                          })
                        : "0%",
                  },
                ]}
              />
            </View>
          ))}
        </View>

        <View style={styles.storyFullHeader}>
          <View style={styles.storyUserInfo}>
            <Image
              source={
                currentStory.user?.profileImage
                  ? {
                      uri: assetUrl(currentStory.user.profileImage),
                    }
                  : require("../../../assets/default-pfp.jpg")
              }
              style={styles.storyUserAvatar}
            />
            <View>
              <Text style={styles.storyUserName}>
                {currentStory.user?.name || "User"}
              </Text>
              <Text style={styles.storyTime}>
                {formatTimeAgo(currentStory.createdAt) || "Just now"}
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            {canDelete && onDelete && (
              <TouchableOpacity
                onPress={() => onDelete(currentStory.id)}
                style={{ marginRight: 15 }}
              >
                <Feather name="trash-2" size={24} color="#fff" />
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={onClose} style={styles.storyFullClose}>
              <Feather name="x" size={28} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.storyFullContent}>
          <View style={styles.storyNavContainer}>
            <TouchableOpacity style={styles.storyNavBtn} onPress={handlePrev} />
            <TouchableOpacity style={styles.storyNavBtn} onPress={handleNext} />
          </View>

          {currentStory.image ? (
            <SafeImage
              uri={assetUrl(currentStory.image)}
              style={styles.storyFullImage}
              resizeMode="contain"
              fallback={require("../../../assets/turf.jpg")}
            />
          ) : (
            <Text
              style={[
                styles.storyFullText,
                {
                  fontFamily:
                    currentStory.fontFamily === "System"
                      ? undefined
                      : currentStory.fontFamily,
                },
              ]}
            >
              {currentStory.text}
            </Text>
          )}
        </View>

        {!canDelete && onReply && currentStory.user?._id && (
          <View style={styles.storyReplyContainer}>
            <TouchableOpacity
              style={styles.storyReplyBtnLeft}
              onPress={() => onReply(currentStory)}
              activeOpacity={0.8}
            >
              <Text style={styles.storyReplyText}>Send message</Text>
              <Ionicons name="paper-plane-outline" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
};

// ─── STORY OPTIONS MODAL ─────────────────────────────────────────────────
const StoryOptionsModal = ({ visible, onClose, onOptionPress, hasStory }) => (
  <Modal visible={visible} transparent animationType="fade">
    <TouchableWithoutFeedback onPress={onClose}>
      <View style={styles.optionsModalOverlay}>
        <TouchableWithoutFeedback>
          <View style={styles.optionsModalContent}>
            <Text style={styles.optionsModalTitle}>Story Options</Text>
            <Text style={styles.optionsModalSub}>Choose an option</Text>
            <View style={styles.optionsBtnContainer}>
              <TouchableOpacity
                style={styles.optionsBtn}
                onPress={() => onOptionPress("gallery")}
              >
                <Text style={styles.optionsBtnText}>
                  {hasStory ? "ADD NEW (GALLERY)" : "ADD GALLERY"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.optionsBtn}
                onPress={() => onOptionPress("text")}
              >
                <Text style={styles.optionsBtnText}>
                  {hasStory ? "ADD NEW (TEXT)" : "ADD TEXT"}
                </Text>
              </TouchableOpacity>
              {hasStory && (
                <TouchableOpacity
                  style={styles.optionsBtn}
                  onPress={() => onOptionPress("view")}
                >
                  <Text style={styles.optionsBtnText}>VIEW STORY</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </TouchableWithoutFeedback>
      </View>
    </TouchableWithoutFeedback>
  </Modal>
);

// ─── POST ITEM ───────────────────────────────────────────────────────────
const PostItem = React.memo(
  ({
    item,
    currentUserId,
    onLike,
    onSave,
    onComment,
    onShare,
    onDoubleTap,
    onImageClick,
    onMoreOptions,
  }) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const heartScale = useRef(new Animated.Value(0)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;

    const handleLikePress = () => {
      onLike(item._id);
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.2,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
    };

    const triggerHeartAnimation = () => {
      heartScale.setValue(0);
      opacityAnim.setValue(1);
      Animated.parallel([
        Animated.spring(heartScale, { toValue: 1, friction: 4, useNativeDriver: true }),
        Animated.sequence([
          Animated.delay(500),
          Animated.timing(opacityAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    };

    const handleDoubleTapAction = () => {
      onDoubleTap(item._id);
      triggerHeartAnimation();
    };

    const lastTapRef = useRef(null);
    const handleTouch = () => {
      const now = Date.now();
      if (lastTapRef.current && now - lastTapRef.current < 300) {
        handleDoubleTapAction();
      } else {
        lastTapRef.current = now;
        onImageClick(item);
      }
    };

    return (
      <View style={styles.postCard}>
        <View style={styles.postHeader}>
          <View style={styles.headerLeft}>
            <Image
              source={
                item.user?.profileImage
                  ? { uri: assetUrl(item.user.profileImage) }
                  : require("../../../assets/default-pfp.jpg")
              }
              style={styles.postAvatar}
            />
            <View>
              <Text style={styles.postUser}>{item.user?.name || "Unknown"}</Text>
              <Text style={styles.postLocation}>
                {item.tournamentName || "Tournament"}
                {item.location ? ` · ${item.location}` : ""}
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => onMoreOptions(item)}>
            <Feather name="more-horizontal" size={20} color="#333" />
          </TouchableOpacity>
        </View>

        <TouchableWithoutFeedback onPress={handleTouch}>
          <View style={styles.mediaContainer}>
            <Image
              source={
                item.linkPreview?.image
                  ? { uri: item.linkPreview.image }
                  : require("../../../assets/fallback.jpg")
              }
              style={styles.postImage}
              resizeMode="cover"
            />
            <View style={styles.playButtonOverlay}>
              <Ionicons name="play" size={24} color="#333" style={{ marginLeft: 3 }} />
            </View>
            <Animated.View
              style={[
                styles.heartOverlay,
                { transform: [{ scale: heartScale }], opacity: opacityAnim },
              ]}
            >
              <MaterialIcons name="favorite" size={80} color="white" />
            </Animated.View>
          </View>
        </TouchableWithoutFeedback>

        <View style={styles.actionRow}>
          <View style={styles.actionLeft}>
            <TouchableOpacity onPress={handleLikePress}>
              <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                <MaterialIcons
                  name={item.isLiked ? "favorite" : "favorite-border"}
                  size={24}
                  color={item.isLiked ? "#FF3040" : "#333"}
                />
              </Animated.View>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => onComment(item)}
              style={styles.actionBtn}
            >
              <Ionicons name="chatbubble-outline" size={24} color="#333" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onShare(item)} style={styles.actionBtn}>
              <Ionicons name="paper-plane-outline" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={() => onSave(item._id)}>
            <FontAwesome5
              name="bookmark"
              solid={item.isSaved}
              size={22}
              color={item.isSaved ? "#15A765" : "#ccc"}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.postFooter}>
          <View style={styles.likedByContainer}>
            <Text style={styles.likesText}>
              {item.likesCount || 0} like{(item.likesCount || 0) === 1 ? "" : "s"}
            </Text>
          </View>

          <View style={styles.captionContainer}>
            <Text style={styles.captionText}>
              <Text style={styles.captionUser}>{item.user?.name || "User"} </Text>
              {item.caption}
            </Text>
            {item.tags && item.tags.length > 0 && (
              <Text style={styles.tagsText}>
                {item.tags.map((t) => `#${t}`).join(" ")}
              </Text>
            )}
          </View>

          {item.comments && item.comments.length > 0 && (
            <TouchableOpacity onPress={() => onComment(item)}>
              <Text style={styles.viewCommentsText}>
                View all {item.comments.length} comments
              </Text>
            </TouchableOpacity>
          )}

          <Text style={styles.timeAgoText}>{formatTimeAgo(item.createdAt)}</Text>
        </View>
      </View>
    );
  },
  (prev, next) =>
    prev.item._id === next.item._id &&
    prev.item.isLiked === next.item.isLiked &&
    prev.item.isSaved === next.item.isSaved &&
    prev.item.likesCount === next.item.likesCount &&
    prev.item.comments?.length === next.item.comments?.length
);

// ─── MAIN ───────────────────────────────────────────────────────────────
const Social = ({ navigation }) => {
  const { token, isAuthenticated, user } = useAuth();
  const currentUserId = user?._id || user?.id;
  const route = useRoute();
  const insets = useSafeAreaInsets();

  const [posts, setPosts] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [textStoryModalVisible, setTextStoryModalVisible] = useState(false);
  const [textStorySubmitting, setTextStorySubmitting] = useState(false);
  const [viewStoryVisible, setViewStoryVisible] = useState(false);
  const [storyOptionsVisible, setStoryOptionsVisible] = useState(false);
  const [activeStories, setActiveStories] = useState([]);
  const [viewingOwnStory, setViewingOwnStory] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [myStories, setMyStories] = useState([]);
  const [otherStoryGroups, setOtherStoryGroups] = useState([]);
  const flatListRef = useRef(null);

  // ── Data fetching ────────────────────────────────────────────────────
  const fetchPosts = async (isRefreshing = false) => {
    if (isRefreshing) setRefreshing(true);
    else setLoading(true);
    try {
      const response = await axios.get(POSTS.ENDPOINTS.GET_ALL, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = response.data || [];
      const processed = data.map((post) => ({
        ...post,
        likesCount: post.likes?.length || 0,
        isLiked: post.likes?.some(
          (like) => like._id === currentUserId || like.toString() === currentUserId
        ),
        isSaved:
          post.saves?.some(
            (save) => (save._id || save).toString() === currentUserId
          ) ||
          (user?.savedPosts &&
            user.savedPosts.some(
              (sp) => (sp._id || sp).toString() === post._id?.toString()
            )),
      }));
      setPosts(processed);
    } catch (err) {
      console.error("Fetch posts error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchStories = async () => {
    if (!token) return;
    try {
      const [mineRes, feedRes] = await Promise.all([
        axios.get(STORIES.ENDPOINTS.MINE, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(STORIES.ENDPOINTS.FEED, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      setMyStories(mineRes.data?.stories || []);
      setOtherStoryGroups(feedRes.data?.groups || []);
    } catch (err) {
      console.error("[Social] story fetch failed:", err);
    }
  };

  // Scroll to specific post if coming from profile grid
  useEffect(() => {
    if (route.params?.initialPostId && posts.length > 0) {
      const idx = posts.findIndex((p) => p._id === route.params.initialPostId);
      if (idx !== -1) {
        setTimeout(() => {
          flatListRef.current?.scrollToIndex({
            index: idx,
            animated: true,
            viewPosition: 0,
          });
          navigation.setParams({
            initialPostId: undefined,
            activeTab: undefined,
            activeSubTab: undefined,
          });
        }, 500);
      }
    }
  }, [route.params?.initialPostId, posts, navigation]);

  useFocusEffect(
    useCallback(() => {
      fetchPosts();
      fetchStories();
    }, [token, currentUserId])
  );

  // ── Post actions ─────────────────────────────────────────────────────
  const handleLike = async (id) => {
    setPosts((current) =>
      current.map((p) =>
        p._id === id
          ? {
              ...p,
              isLiked: !p.isLiked,
              likesCount: p.isLiked ? p.likesCount - 1 : p.likesCount + 1,
            }
          : p
      )
    );
    try {
      await axios.post(POSTS.ENDPOINTS.LIKE(id), {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (e) {
      console.error("Like failed", e);
    }
  };

  const handleDoubleTap = (id) => {
    const post = posts.find((p) => p._id === id);
    if (post && !post.isLiked) handleLike(id);
  };

  const handleSave = async (id) => {
    setPosts((current) =>
      current.map((p) => (p._id === id ? { ...p, isSaved: !p.isSaved } : p))
    );
    try {
      await axios.post(POSTS.ENDPOINTS.SAVE(id), {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (e) {
      console.error("Save failed", e);
    }
  };

  const handleShare = async (post) => {
    try {
      const message = `${post.tournamentName}\n\n${post.caption}\n\nShared via Chalo Khelne`;
      await Share.share({ message });
    } catch (e) {
      console.error(e);
    }
  };

  const handleImageClick = (post) => {
    const url = post.link || post.linkPreview?.url;
    if (url) Linking.openURL(url).catch((e) => console.error(e));
  };

  const handleComment = (post) => {
    setSelectedPost(post);
    setCommentModalVisible(true);
  };

  const handleMoreOptions = (post) => {
    const postOwnerId = post.user?._id?.toString();
    const currentId = currentUserId?.toString();
    const isOwner = postOwnerId && currentId && postOwnerId === currentId;

    const options = [];
    if (isOwner) {
      options.push({
        text: "Delete Post",
        style: "destructive",
        onPress: () => confirmDeletePost(post._id),
      });
    } else {
      options.push({
        text: "Report Post",
        style: "destructive",
        onPress: () =>
          Alert.alert(
            "Reported",
            "Thank you for reporting this post. We will review it shortly."
          ),
      });
    }
    options.push({ text: "Cancel", style: "cancel" });
    Alert.alert("Options", "What would you like to do?", options, {
      cancelable: true,
    });
  };

  const confirmDeletePost = (postId) => {
    Alert.alert("Delete Post", "Are you sure you want to delete this post?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deletePost(postId) },
    ]);
  };

  const deletePost = async (postId) => {
    try {
      const res = await axios.delete(POSTS.ENDPOINTS.DELETE(postId), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) {
        setPosts((current) => current.filter((p) => p._id !== postId));
      }
    } catch (e) {
      console.error("Delete failed", e);
      Alert.alert("Error", "Could not delete post");
    }
  };

  const handleAddComment = async (postId, text) => {
    try {
      const res = await axios.post(
        POSTS.ENDPOINTS.ADD_COMMENT(postId),
        { text },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.success) {
        setPosts((current) =>
          current.map((p) => (p._id === postId ? { ...p, comments: res.data.comments } : p))
        );
        setSelectedPost((prev) => ({ ...prev, comments: res.data.comments }));
      }
    } catch (e) {
      console.error("Comment failed", e);
      Alert.alert("Error", "Could not post comment");
    }
  };

  const handleDeleteComment = async (postId, commentId) => {
    try {
      const res = await axios.delete(
        POSTS.ENDPOINTS.DELETE_COMMENT(postId, commentId),
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.success) {
        setPosts((current) =>
          current.map((p) => (p._id === postId ? { ...p, comments: res.data.comments } : p))
        );
        setSelectedPost((prev) => ({ ...prev, comments: res.data.comments }));
      }
    } catch (e) {
      console.error("Delete comment failed", e);
      Alert.alert("Error", "Could not delete comment");
    }
  };

  // ── Stories ──────────────────────────────────────────────────────────
  const handleStoryPress = () => setStoryOptionsVisible(true);

  const handleOtherStoryPress = (group) => {
    setActiveStories(group.stories);
    setViewingOwnStory(false);
    setViewStoryVisible(true);
  };

  const handleTextStoryPost = async (text, bgColor, fontFamily, doneCb) => {
    if (textStorySubmitting) return;
    setTextStorySubmitting(true);
    try {
      const res = await axios.post(
        STORIES.ENDPOINTS.CREATE,
        { type: "text", text, bgColor, fontFamily },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data?.success && res.data.story) {
        setMyStories((prev) => [...prev, res.data.story]);
        if (typeof doneCb === "function") doneCb();
      }
    } catch (err) {
      console.error("[Social] text story failed:", err);
      Alert.alert("Story failed", err.response?.data?.message || err.message);
    } finally {
      setTextStorySubmitting(false);
    }
  };

  const uploadImageStory = async (uri) => {
    try {
      const filename = uri.split("/").pop() || `story-${Date.now()}.jpg`;
      const ext = (filename.split(".").pop() || "jpg").toLowerCase();
      const mime = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";

      const form = new FormData();
      form.append("storyImage", { uri, name: filename, type: mime });

      const res = await axios.post(STORIES.ENDPOINTS.CREATE, form, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });
      if (res.data?.success && res.data.story) {
        setMyStories((prev) => [...prev, res.data.story]);
      }
    } catch (err) {
      console.error("[Social] image story upload failed:", err);
      Alert.alert("Upload failed", err.response?.data?.message || err.message);
    }
  };

  const handleStoryOptionPress = async (option) => {
    setStoryOptionsVisible(false);
    switch (option) {
      case "view":
        if (myStories.length > 0) {
          setActiveStories(myStories);
          setViewingOwnStory(true);
          setViewStoryVisible(true);
        } else {
          Alert.alert("No Story", "You haven't uploaded a story yet.");
        }
        break;
      case "text":
        setTextStoryModalVisible(true);
        break;
      case "gallery": {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          Alert.alert("Permission Required", "Gallery access is needed.");
          return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions
            ? ImagePicker.MediaTypeOptions.Images
            : ["images"],
          allowsEditing: true,
          aspect: [9, 16],
          quality: 0.85,
        });
        if (!result.canceled && result.assets?.[0]?.uri) {
          await uploadImageStory(result.assets[0].uri);
        }
        break;
      }
      default:
        break;
    }
  };

  const handleDeleteStory = (storyId) => {
    Alert.alert("Delete Story", "Are you sure you want to delete this story?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const res = await axios.delete(STORIES.ENDPOINTS.DELETE(storyId), {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (res.data?.success) {
              setMyStories((prev) => {
                const updated = prev.filter((s) => s.id !== storyId);
                if (updated.length === 0) setViewStoryVisible(false);
                else setActiveStories(updated);
                return updated;
              });
            }
          } catch (err) {
            console.error("[Social] delete story failed:", err);
            Alert.alert("Delete failed", err.response?.data?.message || err.message);
          }
        },
      },
    ]);
  };

  const handleStoryReply = async (story) => {
    setViewStoryVisible(false);
    const otherUser = story.user;
    if (!otherUser?._id) return;
    // ChatConversation needs a real conversationId — create/resolve the DM first
    // (same as ChatSearch's startChat), then open it. Passing only otherUserId
    // opened an empty chat that sent messages with conversationId: undefined.
    try {
      const response = await authFetch(CHAT.ENDPOINTS.CONVERSATIONS, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantId: otherUser._id }),
      });
      const data = await response.json();
      if (data?.success && data.conversation?._id) {
        navigation.navigate("Chat", {
          screen: "ChatConversation",
          params: { conversationId: data.conversation._id, otherUser },
        });
      } else {
        Alert.alert("Couldn't open chat", "Please try again.");
      }
    } catch (err) {
      console.error("[Social] story reply chat failed:", err);
      Alert.alert("Couldn't open chat", err.message || "Please try again.");
    }
  };

  const renderStoryThumb = (group) => {
    const first = group.stories[0];
    return (
      <TouchableOpacity
        key={group.userId}
        style={styles.storyWrapper}
        onPress={() => handleOtherStoryPress(group)}
        activeOpacity={0.85}
      >
        <View style={[styles.storyCircle, { borderColor: "#FF9B21" }]}>
          <View style={styles.storyCircleInner}>
            {first?.image ? (
              <SafeImage
                uri={assetUrl(first.image)}
                style={styles.storyImage}
                fallback={require("../../../assets/turf.jpg")}
              />
            ) : (
              <View
                style={[
                  styles.storyImage,
                  {
                    backgroundColor: first?.bgColor || "#2D3E4E",
                    justifyContent: "center",
                    alignItems: "center",
                  },
                ]}
              >
                <Text
                  style={{ color: "#fff", fontSize: 8, textAlign: "center" }}
                  numberOfLines={2}
                >
                  {first?.text}
                </Text>
              </View>
            )}
          </View>
        </View>
        <Text style={styles.storyName} numberOfLines={1}>
          {group.name}
        </Text>
      </TouchableOpacity>
    );
  };

  const firstMine = myStories[0];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {modalVisible && (
        <Add
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          onPostCreated={() => fetchPosts(true)}
        />
      )}

      {commentModalVisible && selectedPost && (
        <CommentModal
          visible={commentModalVisible}
          post={selectedPost}
          currentUserId={currentUserId}
          onClose={() => setCommentModalVisible(false)}
          onAddComment={handleAddComment}
          onDeleteComment={handleDeleteComment}
        />
      )}

      <TextStoryModal
        visible={textStoryModalVisible}
        submitting={textStorySubmitting}
        onClose={() => setTextStoryModalVisible(false)}
        onPost={handleTextStoryPost}
      />

      <StoryViewModal
        visible={viewStoryVisible}
        stories={activeStories}
        canDelete={viewingOwnStory}
        onDelete={handleDeleteStory}
        onReply={handleStoryReply}
        onClose={() => {
          setViewStoryVisible(false);
          setActiveStories([]);
          setViewingOwnStory(false);
        }}
      />

      <StoryOptionsModal
        visible={storyOptionsVisible}
        hasStory={myStories.length > 0}
        onClose={() => setStoryOptionsVisible(false)}
        onOptionPress={handleStoryOptionPress}
      />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Social</Text>
        <View style={styles.headerIcons}>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => navigation.navigate("Chat", { screen: "ChatList", params: { from: "Social" } })}
          >
            <ChatIcon width={24} height={24} color="#333" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => navigation.navigate("SocialProfile")}
          >
            <PeopleIcon width={24} height={24} color="#333" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Feed */}
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#15A765" />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={posts}
          keyExtractor={(item) => item._id}
          onScrollToIndexFailed={(info) => {
            setTimeout(() => {
              flatListRef.current?.scrollToIndex({
                index: info.index,
                animated: true,
              });
            }, 500);
          }}
          ListHeaderComponent={() => (
            <View style={styles.storiesContainer}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.storiesScroll}
              >
                {/* Your Story */}
                <TouchableOpacity
                  style={styles.storyWrapper}
                  onPress={handleStoryPress}
                  activeOpacity={0.85}
                >
                  <View
                    style={[
                      styles.storyCircle,
                      {
                        borderColor: myStories.length > 0 ? "#15A765" : "#ddd",
                        backgroundColor:
                          myStories.length > 0 ? "transparent" : "#e0e0e0",
                      },
                    ]}
                  >
                    {myStories.length > 0 && firstMine ? (
                      <View style={styles.storyCircleInner}>
                        {firstMine.image ? (
                          <SafeImage
                            uri={assetUrl(firstMine.image)}
                            style={styles.storyImage}
                            fallback={require("../../../assets/turf.jpg")}
                          />
                        ) : (
                          <View
                            style={[
                              styles.storyImage,
                              {
                                backgroundColor: firstMine.bgColor,
                                justifyContent: "center",
                                alignItems: "center",
                              },
                            ]}
                          >
                            <Text
                              style={{
                                color: "#fff",
                                fontSize: 8,
                                textAlign: "center",
                              }}
                              numberOfLines={2}
                            >
                              {firstMine.text}
                            </Text>
                          </View>
                        )}
                      </View>
                    ) : (
                      <MaterialIcons name="add" size={28} color="#fff" />
                    )}
                  </View>
                  <Text style={styles.storyName}>Your Story</Text>
                </TouchableOpacity>

                {/* Other users' stories */}
                {otherStoryGroups.map(renderStoryThumb)}
              </ScrollView>
            </View>
          )}
          renderItem={({ item }) => (
            <PostItem
              item={item}
              currentUserId={currentUserId}
              onLike={handleLike}
              onDoubleTap={handleDoubleTap}
              onComment={handleComment}
              onSave={handleSave}
              onShare={handleShare}
              onMoreOptions={handleMoreOptions}
              onImageClick={handleImageClick}
            />
          )}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                fetchPosts(true);
                fetchStories();
              }}
              colors={["#15A765"]}
              tintColor="#15A765"
            />
          }
          contentContainerStyle={{ paddingBottom: 120 }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No posts found</Text>
            </View>
          }
        />
      )}

      {/* FAB — floats above tab bar */}
      <TouchableOpacity
        style={[styles.floatingAddBtn, { bottom: 90 + (insets.bottom || 0) }]}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.85}
      >
        <MaterialIcons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  headerTitle: {
    fontFamily: "Montserrat",
    fontSize: 16,
    fontWeight: "600",
    color: "#1A181B",
  },
  headerIcons: { flexDirection: "row", alignItems: "center", gap: 16 },
  headerIconBtn: { padding: 4 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyContainer: { padding: 40, alignItems: "center" },
  emptyText: { color: "#999" },

  // Post
  postCard: { marginBottom: 16, paddingHorizontal: 16 },
  postHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 8,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  postAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#0000001A",
    backgroundColor: "#C6C4C4",
  },
  postUser: { fontWeight: "600", fontSize: 13, color: "#262626" },
  postLocation: { fontSize: 11, color: "#262626", marginTop: 1 },
  mediaContainer: {
    width: width - 32,
    height: 220,
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#f0f0f0",
  },
  postImage: { width: "100%", height: "100%" },
  playButtonOverlay: {
    position: "absolute",
    width: 34,
    height: 34,
    borderRadius: 47,
    backgroundColor: "#FFFFFFE5",
    justifyContent: "center",
    alignItems: "center",
  },
  heartOverlay: { position: "absolute", justifyContent: "center", alignItems: "center" },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 4,
    marginTop: 12,
  },
  actionLeft: { flexDirection: "row", alignItems: "center", gap: 14 },
  actionBtn: {},
  postFooter: { paddingHorizontal: 4, paddingTop: 10 },
  likedByContainer: { marginBottom: 6 },
  likesText: { fontWeight: "600", fontSize: 13, color: "#262626" },
  captionContainer: { marginBottom: 4 },
  captionText: { fontSize: 13, color: "#5B585F", lineHeight: 18 },
  captionUser: { fontWeight: "600", color: "#262626" },
  tagsText: { color: "#00376b", fontSize: 13, marginTop: 2 },
  viewCommentsText: { color: "#999", fontSize: 13, marginBottom: 4 },
  timeAgoText: { color: "#00000066", fontSize: 11 },

  // Stories
  storiesContainer: { marginBottom: 16, paddingLeft: 16 },
  storiesScroll: { paddingRight: 16 },
  storyWrapper: { alignItems: "center", marginRight: 14, width: 70 },
  storyCircle: {
    width: 62,
    height: 62,
    borderRadius: 34,
    borderWidth: 2,
    padding: 3,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  storyCircleInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: "#0000001A",
    overflow: "hidden",
    backgroundColor: "#D9D9D9",
  },
  storyImage: { width: "100%", height: "100%", borderRadius: 26 },
  storyName: {
    fontFamily: "Poppins",
    fontWeight: "400",
    fontSize: 11,
    marginTop: 4,
    color: "#262626",
    textAlign: "center",
  },

  floatingAddBtn: {
    position: "absolute",
    right: 16,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#15A765",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },

  // Comment modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: "80%",
    overflow: "hidden",
  },
  modalHeader: {
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    position: "relative",
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: "#ccc",
    borderRadius: 2,
    marginBottom: 10,
  },
  modalTitle: { fontWeight: "700", fontSize: 16 },
  closeBtn: { position: "absolute", right: 16, top: 16 },
  commentList: { padding: 12 },
  commentItem: {
    flexDirection: "row",
    marginBottom: 16,
    gap: 12,
    alignItems: "flex-start",
  },
  commentAvatar: { width: 40, height: 40, borderRadius: 20 },
  commentBody: { flex: 1 },
  commentHeader: { flexDirection: "row", gap: 8, alignItems: "baseline" },
  commentUser: { fontWeight: "600", fontSize: 13 },
  commentTime: { fontSize: 11, color: "#00000066" },
  commentText: { fontSize: 13, color: "#5B585F", marginTop: 4 },
  commentDeleteBtn: { padding: 6, justifyContent: "center" },
  commentInputContainer: {
    flexDirection: "row",
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    alignItems: "center",
    marginBottom: Platform.OS === "ios" ? 20 : 0,
  },
  commentInput: {
    flex: 1,
    backgroundColor: "#f0f0f0",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 10,
    fontSize: 14,
  },
  postBtnText: { color: "#15A765", fontWeight: "700", fontSize: 15 },
  disabledText: { opacity: 0.5 },
  emptyComments: { padding: 40, alignItems: "center" },

  // Text story
  textStoryContainer: { flex: 1, justifyContent: "space-between" },
  textStoryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 40,
    alignItems: "center",
  },
  textStoryClose: {},
  textStoryTools: { flexDirection: "row", alignItems: "center" },
  textStoryToolBtn: { marginLeft: 20, padding: 5 },
  textStoryInputWrapper: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 30,
  },
  textStoryInput: { fontSize: 32, color: "#fff", fontWeight: "500", width: "100%" },
  textStorySendBtn: { alignSelf: "flex-end", marginRight: 20, marginBottom: 40 },
  sendIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
  },

  // Story full
  storyFullContainer: { flex: 1, paddingTop: 40 },
  storyProgressContainer: {
    flexDirection: "row",
    paddingHorizontal: 10,
    marginTop: 10,
    height: 3,
    width: "100%",
    gap: 4,
  },
  storyProgressBarWrapper: {
    flex: 1,
    height: "100%",
    backgroundColor: "rgba(255,255,255,0.3)",
    borderRadius: 2,
    overflow: "hidden",
  },
  storyProgressBar: { height: "100%", width: "100%" },
  storyFullHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 15,
    marginTop: 15,
  },
  storyUserInfo: { flexDirection: "row", alignItems: "center" },
  storyUserAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: "#fff",
  },
  storyUserName: { color: "#fff", fontWeight: "bold", fontSize: 14 },
  storyTime: { color: "rgba(255,255,255,0.7)", fontSize: 12 },
  storyFullClose: { padding: 5 },
  storyFullContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 30,
    position: "relative",
  },
  storyNavContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    zIndex: 10,
  },
  storyNavBtn: { flex: 1, height: "100%" },
  storyFullImage: { width: "100%", height: "100%" },
  storyFullText: {
    color: "#fff",
    fontSize: 28,
    textAlign: "center",
    fontWeight: "500",
  },
  storyReplyContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingBottom: 30,
    paddingTop: 10,
  },
  storyReplyBtnLeft: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    height: 44,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.5)",
    borderRadius: 22,
    paddingHorizontal: 20,
  },
  storyReplyText: { color: "#fff", fontSize: 14 },

  // Options modal
  optionsModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  optionsModalContent: {
    width: "85%",
    backgroundColor: "#333333",
    borderRadius: 8,
    padding: 24,
  },
  optionsModalTitle: { color: "#fff", fontSize: 22, fontWeight: "bold", marginBottom: 8 },
  optionsModalSub: { color: "#ccc", fontSize: 16, marginBottom: 30 },
  optionsBtnContainer: { alignItems: "flex-end" },
  optionsBtn: { paddingVertical: 12, width: "100%", alignItems: "flex-end" },
  optionsBtnText: {
    color: "#4ECDC4",
    fontSize: 15,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },

  // Emoji picker
  emojiPickerWrapper: {
    height: 350,
    backgroundColor: "#1C1C1E",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  emojiPickerContainer: { flex: 1, paddingTop: 10 },
  emojiHeader: {
    flexDirection: "row",
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: "#333",
  },
  emojiHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  emojiCategoryBtn: { padding: 6, borderRadius: 8 },
  activeCategory: { backgroundColor: "#15A765" },
  emojiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 10,
    paddingBottom: 20,
  },
  emojiItem: {
    width: "12.5%",
    aspectRatio: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emojiText: { fontSize: 28 },
});

export default Social;
