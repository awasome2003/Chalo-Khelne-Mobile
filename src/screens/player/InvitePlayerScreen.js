import React, { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  FlatList, ActivityIndicator, Alert, SafeAreaView,
  StatusBar, Platform, KeyboardAvoidingView, ScrollView,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useAuth } from "../../context/AuthContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import API from "../../api/api";
import INVITATIONS from "../../api/invitations";
import DateTimePicker from "@react-native-community/datetimepicker";

// Invitation types
const INVITE_TYPES = [
  {
    key: "play_with_me",
    label: "Play with me",
    description: 'Casual "Play with me" request for any sport',
    icon: "play-outline",
    iconBg: "#8A38F51F",
    iconColor: "#8A38F5",
  },
  {
    key: "turf_match",
    label: "Turf match",
    description: "Invite to join your turf booking/ground match",
    icon: "location-outline",
    iconBg: "#00BA001F",
    iconColor: "#00BA00",
  },
  {
    key: "sports_event",
    label: "Sports event",
    description: "Invite a sports event, camp or workshop",
    icon: "calendar-outline",
    iconBg: "#0088FF1F",
    iconColor: "#0088FF",
  },
];

// Step indicator
const StepIndicator = ({ current, total }) => (
  <View style={s.stepRow}>
    {Array.from({ length: total }, (_, i) => {
      const stepNum = i + 1;
      const done = stepNum < current;
      const active = stepNum === current;
      return (
        <React.Fragment key={stepNum}>
          <View style={[s.stepCircle, done && s.stepDone, active && s.stepActive]}>
            {done ? (
              <Ionicons name="checkmark-outline" size={20} color="#FFFFFF" />
            ) : (
              <Text style={[s.stepNum, active && s.stepNumActive]}>{stepNum}</Text>
            )}
          </View>
          {stepNum < total && (
            <View style={[s.stepLine, done && s.stepLineDone]} />
          )}
        </React.Fragment>
      );
    })}
  </View>
);

export default function InvitePlayerScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { tournamentId, tournamentName } = route.params || {};

  const [step, setStep] = useState(1);
  const [selectedType, setSelectedType] = useState(null);
  const [search, setSearch] = useState("");
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [selectedPlayers, setSelectedPlayers] = useState([]);
  const [searchTimer, setSearchTimer] = useState(null);
  const [sentIds, setSentIds] = useState(new Set());

  // Step 3 form state
  const [title, setTitle] = useState("");
  const [sport, setSport] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [location, setLocation] = useState("");
  const [personalNote, setPersonalNote] = useState("");

  // Suggestions
  const [suggestedTurfs, setSuggestedTurfs] = useState([]);
  const [showLocSuggestions, setShowLocSuggestions] = useState(false);
  const [locLoading, setLocLoading] = useState(false);
  const [showSportSuggestions, setShowSportSuggestions] = useState(false);

  // Pickers
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [activeTimePicker, setActiveTimePicker] = useState(null);

  const COMMON_SPORTS = ["Cricket", "Football", "Basketball", "Badminton", "Tennis", "Volleyball"];

  useEffect(() => {
    if (tournamentId && user?._id) fetchSentInvitations();
  }, [tournamentId]);

  const fetchSentInvitations = async () => {
    try {
      const token = await AsyncStorage.getItem("auth_token");
      const res = await axios.get(INVITATIONS.SENT(user._id || user.id), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) {
        const ids = new Set(
          res.data.invitations
            .filter(
              (inv) =>
                inv.tournamentId?._id === tournamentId ||
                inv.tournamentId === tournamentId
            )
            .map((inv) => inv.receiverId?._id || inv.receiverId)
        );
        setSentIds(ids);
      }
    } catch (_) {}
  };

  useEffect(() => {
    if (step === 2 && players.length === 0 && search.length === 0) {
      fetchDefaultPlayers();
    }
  }, [step]);

  const fetchDefaultPlayers = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("auth_token");
      const res = await axios.get(INVITATIONS.DEFAULT_PLAYERS, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) {
        setPlayers(res.data.players.filter((p) => p._id !== user?._id));
      }
    } catch (err) {
      console.error("Fetch default players error:", err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (text) => {
    setSearch(text);
    if (searchTimer) clearTimeout(searchTimer);
    if (text.length === 0) {
      fetchDefaultPlayers();
      return;
    }
    if (text.length < 2) {
      setPlayers([]);
      return;
    }
    const timer = setTimeout(() => searchPlayers(text), 400);
    setSearchTimer(timer);
  };

  const handleLocationChange = (text) => {
    setLocation(text);
    if (!text.trim()) {
      setShowLocSuggestions(false);
      setSuggestedTurfs([]);
      return;
    }
    setShowLocSuggestions(true);
    setLocLoading(true);

    if (searchTimer) clearTimeout(searchTimer);
    const timer = setTimeout(async () => {
      try {
        const token = await AsyncStorage.getItem("auth_token");
        const res = await axios.get(
          `${API.SERVER_URL}/api/search?query=${encodeURIComponent(text)}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setSuggestedTurfs(res.data.turfs || []);
      } catch (error) {
        console.error("Location search error:", error);
      } finally {
        setLocLoading(false);
      }
    }, 500);
    setSearchTimer(timer);
  };

  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDate(selectedDate.toISOString().split("T")[0]);
    }
  };

  const onTimeChange = (event, selectedTime) => {
    const picker = activeTimePicker;
    setActiveTimePicker(null);
    if (selectedTime) {
      const hours = selectedTime.getHours();
      const minutes = selectedTime.getMinutes();
      const ampm = hours >= 12 ? "PM" : "AM";
      const formattedHours = hours % 12 || 12;
      const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;
      const formatted = `${formattedHours}:${formattedMinutes} ${ampm}`;
      if (picker === "start") setStartTime(formatted);
      else if (picker === "end") setEndTime(formatted);
    }
  };

  const searchPlayers = async (query) => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("auth_token");
      const res = await axios.get(
        `${INVITATIONS.SEARCH_PLAYERS}?q=${encodeURIComponent(query)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.success) {
        setPlayers(res.data.players.filter((p) => p._id !== user?._id));
      }
    } catch (err) {
      console.error("Search error:", err.message);
    } finally {
      setLoading(false);
    }
  };

  const togglePlayerSelection = (player) => {
    const isSelected = selectedPlayers.find((p) => p._id === player._id);
    if (isSelected) {
      setSelectedPlayers((prev) => prev.filter((p) => p._id !== player._id));
    } else {
      setSelectedPlayers((prev) => [...prev, player]);
    }
  };

  const removePlayerTag = (playerId) => {
    setSelectedPlayers((prev) => prev.filter((p) => p._id !== playerId));
  };

  const handleFinalSubmit = async () => {
    setSending(true);
    try {
      const senderId = user?._id || user?.id;
      if (!senderId || selectedPlayers.length === 0) {
        Alert.alert("Error", "Please select at least one player.");
        return;
      }
      const token = await AsyncStorage.getItem("auth_token");
      const receiver_ids = selectedPlayers.map((p) => p._id);

      const res = await axios.post(
        INVITATIONS.SEND,
        {
          sender_id: senderId,
          receiver_ids,
          tournament_id: tournamentId || null,
          invitationType: selectedType?.key,
          tournamentName: title,
          sport,
          eventDate: date,
          startTime,
          endTime,
          venue: location,
          message: personalNote,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        setStep(5);
      }
    } catch (err) {
      Alert.alert("Failed", err.response?.data?.message || err.message);
    } finally {
      setSending(false);
    }
  };

  const resetFlow = () => {
    setStep(1);
    setSelectedType(null);
    setSearch("");
    setPlayers([]);
    setSelectedPlayers([]);
    setTitle("");
    setSport("");
    setDate("");
    setStartTime("");
    setEndTime("");
    setLocation("");
    setPersonalNote("");
  };

  const getProfileImage = (player) => {
    if (!player.profileImage) return null;
    const img = player.profileImage.replace(/^uploads[\\/]/, "");
    return `${API.SERVER_URL}/uploads/${img}`;
  };

  // Step 1
  const renderStep1 = () => (
    <View style={{ flex: 1 }}>
      <View style={s.stepMeta}>
        <Text style={s.stepMetaLabel}>Step 1 of 4</Text>
        <Text style={s.stepMetaTitle}>Choose invitation type</Text>
      </View>
      <StepIndicator current={1} total={4} />

      <View style={s.typeList}>
        {INVITE_TYPES.map((type) => (
          <TouchableOpacity
            key={type.key}
            style={s.typeCard}
            activeOpacity={0.7}
            onPress={() => {
              setSelectedType(type);
              setStep(2);
            }}
          >
            <View style={[s.typeIconBox, { backgroundColor: type.iconBg }]}>
              <Ionicons name={type.icon} size={22} color={type.iconColor} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.typeLabel}>{type.label}</Text>
              <Text style={s.typeDesc}>{type.description}</Text>
            </View>
            <Ionicons name="chevron-forward-outline" size={18} color="#D1D5DB" />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  // Step 2
  const renderPlayer = ({ item }) => {
    const isSelected = selectedPlayers.find((p) => p._id === item._id);
    const profileImg = getProfileImage(item);
    const sportName =
      item.sports && item.sports.length > 0
        ? item.sports[0]
        : item.sport || item.sportsType || null;
    const locationStr =
      typeof item.address === "string" && item.address.trim() !== ""
        ? item.address
        : item.address?.area || item.address?.city
        ? [item.address?.area, item.address?.city].filter(Boolean).join(", ")
        : "";

    return (
      <View style={s.playerCard}>
        {profileImg ? (
          <Image source={{ uri: profileImg }} style={s.avatar} />
        ) : (
          <View style={s.avatarFallback}>
            <Ionicons name="person-outline" size={20} color="#666666" />
          </View>
        )}

        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={s.playerName}>{item.name}</Text>
          {locationStr ? <Text style={s.playerLocation}>{locationStr}</Text> : null}
        </View>

        {sportName && (
          <View style={s.sportTag}>
            <Text style={s.sportTagText}>{sportName}</Text>
          </View>
        )}

        {isSelected ? (
          <TouchableOpacity style={s.addedPill} onPress={() => togglePlayerSelection(item)}>
            <Ionicons name="checkmark-outline" size={14} color="#AAAAAA" />
            <Text style={s.addedText}>Added</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={s.inviteBtn} onPress={() => togglePlayerSelection(item)}>
            <Ionicons name="add-outline" size={16} color="#FFFFFF" />
            <Text style={s.inviteBtnText}>Invite</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderStep2 = () => (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1 }}
    >
      <View style={s.stepMeta}>
        <Text style={s.stepMetaLabel}>Step 2 of 4</Text>
        <Text style={s.stepMetaTitle}>Who do you want to invite?</Text>
      </View>
      <StepIndicator current={2} total={4} />

      <View style={s.searchBox}>
        <Ionicons name="search-outline" size={18} color="#666666" />
        <TextInput
          style={s.searchInput}
          value={search}
          onChangeText={handleSearch}
          placeholder="Search players by name or sport..."
          placeholderTextColor="#B0B7C3"
          autoFocus
        />
        {search.length > 0 && (
          <TouchableOpacity
            onPress={() => {
              setSearch("");
              setPlayers([]);
            }}
          >
            <Ionicons name="close-circle-outline" size={18} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color="#10B981" />
        </View>
      ) : players.length === 0 && search.length >= 2 ? (
        <View style={s.center}>
          <Ionicons name="people-outline" size={48} color="#D1D5DB" />
          <Text style={s.emptyText}>No players found</Text>
        </View>
      ) : players.length === 0 ? (
        <View style={s.center}>
          <Ionicons name="search-outline" size={44} color="#D1D5DB" />
          <Text style={s.emptyText}>Search players to invite</Text>
          <Text style={s.emptySubText}>Type at least 2 characters</Text>
        </View>
      ) : (
        <FlatList
          data={players}
          keyExtractor={(item) => item._id}
          renderItem={renderPlayer}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </KeyboardAvoidingView>
  );

  // Step 3
  const renderStep3 = () => (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingBottom: 24 }}
      keyboardShouldPersistTaps="handled"
    >
      <View style={s.stepMeta}>
        <Text style={s.stepMetaLabel}>Step 3 of 4</Text>
        <Text style={s.stepMetaTitle}>Fill in the details</Text>
      </View>
      <StepIndicator current={3} total={4} />

      <View style={s.tagsContainer}>
        {selectedPlayers.map((p) => (
          <TouchableOpacity key={p._id} style={s.playerTag} onPress={() => removePlayerTag(p._id)}>
            <Text style={s.playerTagText}>{p.name}</Text>
            <Ionicons name="close-outline" size={16} color="#007AFF" />
          </TouchableOpacity>
        ))}
      </View>

      <View style={s.formContainer}>
        <Text style={s.formLabel}>Invitation Type</Text>
        <View style={s.typeDisplay}>
          <Ionicons
            name={selectedType?.icon || "play"}
            size={18}
            color={selectedType?.iconColor || "#7C3AED"}
          />
          <Text style={s.typeDisplayText}>{selectedType?.label || "Play with me"}</Text>
        </View>

        <Text style={s.formLabel}>Invitation Title</Text>
        <TextInput
          style={s.input}
          placeholder="Enter title"
          placeholderTextColor="#9CA3AF"
          value={title}
          onChangeText={setTitle}
        />

        <Text style={s.formLabel}>Sport</Text>
        <View style={{ zIndex: 5 }}>
          <TextInput
            style={s.input}
            placeholder="Search or enter sport"
            placeholderTextColor="#9CA3AF"
            value={sport}
            onChangeText={(text) => {
              setSport(text);
              setShowSportSuggestions(text.length > 0);
            }}
            onFocus={() => setShowSportSuggestions(sport.length > 0)}
          />
          {showSportSuggestions && (
            <View style={s.suggestionsDropdown}>
              {COMMON_SPORTS.filter((sp) =>
                sp.toLowerCase().includes(sport.toLowerCase())
              ).map((item) => (
                <TouchableOpacity
                  key={item}
                  style={s.suggestionItem}
                  onPress={() => {
                    setSport(item);
                    setShowSportSuggestions(false);
                  }}
                >
                  <Text style={s.suggestionName}>{item}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View style={s.row}>
          <View style={{ flex: 1 }}>
            <Text style={s.formLabel}>Date</Text>
            <TouchableOpacity style={s.input} onPress={() => setShowDatePicker(true)}>
              <Text style={{ color: date ? "#1F2937" : "#9CA3AF" }}>{date || "dd-mm-yyyy"}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={s.row}>
          <View style={{ flex: 1 }}>
            <Text style={s.formLabel}>Start Time</Text>
            <TouchableOpacity style={s.input} onPress={() => setActiveTimePicker("start")}>
              <Text style={{ color: startTime ? "#1F2937" : "#9CA3AF" }}>
                {startTime || "00:00 am/pm"}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={s.formLabel}>End Time</Text>
            <TouchableOpacity style={s.input} onPress={() => setActiveTimePicker("end")}>
              <Text style={{ color: endTime ? "#1F2937" : "#9CA3AF" }}>
                {endTime || "00:00 am/pm"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={s.formLabel}>Location/ Venue</Text>
        <View style={{ zIndex: 10 }}>
          <TextInput
            style={s.input}
            placeholder="Search location"
            placeholderTextColor="#9CA3AF"
            value={location}
            onChangeText={handleLocationChange}
            onFocus={() => setShowLocSuggestions(location.length > 0)}
          />
          {showLocSuggestions && (
            <View style={s.suggestionsDropdown}>
              {locLoading ? (
                <ActivityIndicator size="small" color="#10B981" style={{ padding: 10 }} />
              ) : suggestedTurfs.length > 0 ? (
                suggestedTurfs.map((turf) => (
                  <TouchableOpacity
                    key={turf._id}
                    style={s.suggestionItem}
                    onPress={() => {
                      setLocation(turf.name);
                      setShowLocSuggestions(false);
                    }}
                  >
                    <Ionicons name="location-outline" size={18} color="#10B981" />
                    <View style={{ marginLeft: 8 }}>
                      <Text style={s.suggestionName}>{turf.name}</Text>
                      <Text style={s.suggestionSub}>
                        {turf.address?.area || turf.address?.city || ""}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))
              ) : (
                <Text style={s.noSuggestionText}>No turfs found</Text>
              )}
            </View>
          )}
        </View>

        <Text style={s.formLabel}>Personal Message</Text>
        <TextInput
          style={[s.input, s.textArea]}
          placeholder="Add detailed note"
          placeholderTextColor="#9CA3AF"
          multiline
          numberOfLines={4}
          value={personalNote}
          onChangeText={setPersonalNote}
          textAlignVertical="top"
        />
      </View>

      {showDatePicker && (
        <DateTimePicker
          value={date ? new Date(date) : new Date()}
          mode="date"
          display="default"
          onChange={onDateChange}
        />
      )}
      {activeTimePicker && (
        <DateTimePicker
          value={new Date()}
          mode="time"
          is24Hour={false}
          display="default"
          onChange={onTimeChange}
        />
      )}
    </ScrollView>
  );

  // Step 4
  const renderStep4 = () => (
    <FlatList
      ListHeaderComponent={() => (
        <View style={{ paddingBottom: 120 }}>
          <View style={s.stepMeta}>
            <Text style={s.stepMetaLabel}>Step 4 of 4</Text>
            <Text style={s.stepMetaTitle}>Review your invitation</Text>
          </View>
          <StepIndicator current={4} total={4} />

          <View style={s.reviewCard}>
            <View style={[s.reviewHeader, { backgroundColor: "#F9F5FF" }]}>
              <Ionicons
                name={selectedType?.icon || "play-outline"}
                size={16}
                color={selectedType?.iconColor || "#8A38F5"}
              />
              <Text style={[s.reviewHeaderText, { color: selectedType?.iconColor || "#8A38F5" }]}>
                {selectedType?.label || "Play With Me"}
              </Text>
            </View>

            <View style={s.reviewContent}>
              <View style={s.reviewPlayers}>
                {selectedPlayers.map((p) => (
                  <View key={p._id} style={s.reviewPlayerRow}>
                    <View style={s.reviewAvatar}>
                      {getProfileImage(p) ? (
                        <Image source={{ uri: getProfileImage(p) }} style={s.reviewAvatarImg} />
                      ) : (
                        <Ionicons name="person-outline" size={20} color="#666666" />
                      )}
                    </View>
                    <Text style={s.reviewPlayerName}>{p.name}</Text>
                  </View>
                ))}
              </View>

              <View style={s.reviewTitleSection}>
                <Text style={s.reviewTitle}>{title || "Play with me - Saturday"}</Text>
                <Text style={s.reviewLabel}>Invitation name</Text>
              </View>

              <View style={s.reviewPillRow}>
                {date ? (
                  <View style={s.reviewPill}>
                    <Ionicons name="calendar-outline" size={14} color="#9CA3AF" />
                    <Text style={s.reviewPillText}>{date}</Text>
                  </View>
                ) : null}
                {startTime || endTime ? (
                  <View style={s.reviewPill}>
                    <Ionicons name="time-outline" size={14} color="#9CA3AF" />
                    <Text style={s.reviewPillText}>
                      {startTime && endTime
                        ? `${startTime} – ${endTime}`
                        : startTime || endTime}
                    </Text>
                  </View>
                ) : null}
              </View>

              {location ? (
                <View style={s.reviewPill}>
                  <Ionicons name="location-outline" size={14} color="#9CA3AF" />
                  <Text style={s.reviewPillText}>{location}</Text>
                </View>
              ) : null}

              {personalNote ? (
                <View style={s.reviewMsgBox}>
                  <Text style={s.reviewMsgText}>"{personalNote}"</Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>
      )}
      data={[]}
      renderItem={null}
      style={{ flex: 1 }}
    />
  );

  // Step 5
  const renderStep5 = () => (
    <View style={s.successContainer}>
      <View style={s.successCircle}>
        <Ionicons name="checkmark-outline" size={60} color="#FFF" />
      </View>

      <Text style={s.successTitle}>Invitation Sent!</Text>
      <Text style={s.successSub}>Your invitation has been sent</Text>
      <Text style={s.successInfo}>
        You will be notified when they respond to your invitation.
      </Text>

      <View style={s.successActions}>
        <TouchableOpacity style={s.viewInvitesBtn} onPress={() => navigation.goBack()}>
          <Text style={s.viewInvitesBtnText}>View all invitations</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.sendAnotherBtn} onPress={resetFlow}>
          <Text style={s.sendAnotherBtnText}>Send another</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.backHomeLink} onPress={() => navigation.navigate("Home")}>
          <Text style={s.backHomeLinkText}>Back to Home</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderStepNav = () => (
    <View style={[s.bottomNav, { paddingBottom: Math.max(insets.bottom, 14) }]}>
      <TouchableOpacity
        style={s.backCircleBtn}
        onPress={() => setStep(step === 4 ? 3 : step - 1)}
      >
        <Ionicons
          name={step === 4 ? "pencil-outline" : "arrow-back-outline"}
          size={24}
          color="#15A765"
        />
      </TouchableOpacity>
      <TouchableOpacity
        style={s.nextBtn}
        onPress={() => {
          if (step === 2) {
            if (selectedPlayers.length === 0) {
              Alert.alert(
                "No players selected",
                "Please select at least one player before proceeding."
              );
              return;
            }
            setStep(3);
          } else if (step === 3) {
            setStep(4);
          } else if (step === 4) {
            handleFinalSubmit();
          } else {
            setStep(step + 1);
          }
        }}
        disabled={sending}
      >
        {sending ? (
          <ActivityIndicator size="small" color="#FFF" />
        ) : (
          <>
            {step === 4 && (
              <Ionicons
                name="paper-plane-outline"
                size={18}
                color="#FFF"
                style={{ marginRight: 8 }}
              />
            )}
            <Text style={s.nextBtnText}>{step === 4 ? "Send Invitation" : "Next"}</Text>
            {step !== 4 && (
              <Ionicons name="arrow-forward-outline" size={24} color="#FFFFFF" />
            )}
          </>
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        {step < 5 && (
          <View style={s.header}>
            <TouchableOpacity
              style={s.headerBack}
              onPress={() => {
                if (step === 1) navigation.goBack();
                else if (step === 4) setStep(3);
                else setStep(step - 1);
              }}
            >
              <Ionicons name="chevron-back-outline" size={22} color="#666666" />
            </TouchableOpacity>
            <Text style={s.headerTitle}>Send Invitations</Text>
          </View>
        )}

        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}
        {step === 5 && renderStep5()}
      </KeyboardAvoidingView>

      {step >= 2 && step < 5 && renderStepNav()}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF",
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  headerBack: { padding: 0 },
  headerTitle: { fontSize: 16, color: "#333333", fontFamily: "Montserrat_500Medium" },
  stepMeta: { paddingHorizontal: 16, paddingTop: 8 },
  stepMetaLabel: { fontSize: 14, color: "#666666", fontFamily: "Montserrat_500Medium" },
  stepMetaTitle: { fontSize: 16, color: "#333333", fontFamily: "Montserrat_500Medium" },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 16,
  },
  stepCircle: {
    width: 36,
    height: 36,
    borderRadius: 50,
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
  },
  stepDone: { backgroundColor: "#00BA00" },
  stepActive: { backgroundColor: "#FF8D28", borderColor: "#F5F5F5", borderWidth: 4 },
  stepNum: { fontSize: 16, color: "#999999", fontFamily: "Montserrat_500Medium" },
  stepNumActive: { color: "#FFFFFF", fontFamily: "Montserrat_700Bold", fontSize: 16 },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: "#EEEEEE",
    marginHorizontal: 8,
    borderRadius: 10,
  },
  stepLineDone: { backgroundColor: "#00BA00" },
  typeList: { paddingHorizontal: 16 },
  typeCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderColor: "#F5F5F5",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  typeIconBox: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  typeLabel: {
    fontSize: 16,
    color: "#333333",
    marginBottom: 2,
    fontFamily: "Montserrat_600SemiBold",
  },
  typeDesc: {
    fontSize: 14,
    color: "#666666",
    lineHeight: 17,
    fontFamily: "Montserrat_400Regular",
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 53,
    paddingHorizontal: 16,
    height: 50,
    borderWidth: 1,
    borderColor: "#EEEEFF",
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#666666",
    padding: 0,
    fontFamily: "Montserrat_500Medium",
  },
  playerCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#F5F5F5",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  avatar: { width: 36, height: 36, borderRadius: 50, backgroundColor: "#EEEEEE" },
  avatarFallback: {
    width: 36,
    height: 36,
    borderRadius: 50,
    padding: 8,
    backgroundColor: "#EEEEEE",
    justifyContent: "center",
    alignItems: "center",
  },
  playerName: { fontSize: 16, color: "#333333", fontFamily: "Montserrat_500Medium" },
  playerLocation: {
    fontSize: 12,
    color: "#666666",
    marginTop: 2,
    fontFamily: "Montserrat_500Medium",
  },
  sportTag: {
    backgroundColor: "#E6F1FA",
    borderRadius: 60,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 16,
  },
  sportTagText: { fontSize: 12, color: "#0F7FE2", fontFamily: "Poppins_400Regular" },
  inviteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#15A765",
    paddingRight: 12,
    paddingLeft: 8,
    paddingVertical: 8,
    borderRadius: 8,
  },
  inviteBtnText: { color: "#FFFFFF", fontSize: 12, fontFamily: "Montserrat_500Medium" },
  addedPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingRight: 12,
    paddingLeft: 8,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#F5F5F5",
  },
  addedText: { fontSize: 12, color: "#AAAAAA", fontFamily: "Montserrat_500Medium" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", paddingBottom: 60 },
  emptyText: {
    fontSize: 14,
    color: "#9CA3AF",
    marginTop: 12,
    fontFamily: "Montserrat_600SemiBold",
  },
  emptySubText: {
    fontSize: 12,
    color: "#D1D5DB",
    marginTop: 4,
    fontFamily: "Poppins_400Regular",
  },
  bottomNav: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    backgroundColor: "#FFF",
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  backCircleBtn: {
    width: 56,
    height: 44,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#15A765",
    justifyContent: "center",
    alignItems: "center",
  },
  nextBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#15A765",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
  },
  nextBtnText: { color: "#FFFFFF", fontSize: 16, fontFamily: "Montserrat_500Medium" },
  tagsContainer: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 16, gap: 8 },
  playerTag: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: "#EBF4FF",
    borderRadius: 60,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  playerTagText: { fontSize: 14, color: "#007AFF", fontFamily: "Poppins_400Regular" },
  formContainer: { paddingHorizontal: 16 },
  formLabel: {
    fontSize: 16,
    color: "#333333",
    marginBottom: 6,
    marginTop: 16,
    fontFamily: "Montserrat_500Medium",
  },
  typeDisplay: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F4EFF9",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 16,
  },
  typeDisplayText: { fontSize: 14, color: "#333333", fontFamily: "Montserrat_500Medium" },
  input: {
    backgroundColor: "#F3F3F3",
    borderWidth: 1,
    borderColor: "#F6F6F6",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    height: 48,
    fontSize: 14,
    color: "#888888",
    fontFamily: "Poppins_400Regular",
    justifyContent: "center",
  },
  textArea: { height: 123 },
  row: { flexDirection: "row", alignItems: "center" },
  reviewCard: {
    marginHorizontal: 16,
    backgroundColor: "#FFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    overflow: "hidden",
  },
  reviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  reviewHeaderText: { fontSize: 14, fontFamily: "Montserrat_600SemiBold" },
  reviewContent: { padding: 16, gap: 16 },
  reviewPlayers: { gap: 16 },
  reviewPlayerRow: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#FFF" },
  reviewAvatar: {
    width: 36,
    height: 36,
    borderRadius: 50,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  reviewAvatarImg: { width: 36, height: 36, borderRadius: 50 },
  reviewPlayerName: { fontSize: 15, color: "#1F2937", fontFamily: "Montserrat_600SemiBold" },
  reviewTitle: { fontSize: 16, color: "#333333", fontFamily: "Montserrat_600SemiBold" },
  reviewLabel: { fontSize: 12, color: "#666666", marginTop: 2, fontFamily: "Poppins_400Regular" },
  reviewPillRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  reviewPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F7F7F7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 60,
  },
  reviewPillText: { fontSize: 12, color: "#777777", fontFamily: "Poppins_400Regular" },
  reviewMsgBox: {
    marginTop: 16,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "#F7F7F7",
    borderRadius: 12,
  },
  reviewMsgText: { fontSize: 12, color: "#666666", lineHeight: 20, fontFamily: "Poppins_400Regular" },
  successContainer: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 24 },
  successCircle: {
    width: 88,
    height: 88,
    borderRadius: 50,
    backgroundColor: "#00BA00",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    shadowColor: "#00BA00",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  successTitle: { fontSize: 24, color: "#333333", marginBottom: 2, fontFamily: "Montserrat_500Medium" },
  successSub: { fontSize: 16, color: "#666666", marginBottom: 8, fontFamily: "Montserrat_500Medium" },
  successInfo: {
    fontSize: 16,
    color: "#999999",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
    fontFamily: "Montserrat_500Medium",
  },
  successActions: { width: "100%", gap: 12 },
  viewInvitesBtn: {
    backgroundColor: "#15A765",
    height: 44,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  viewInvitesBtnText: { color: "#FFFFFF", fontSize: 16, fontFamily: "Montserrat_500Medium" },
  sendAnotherBtn: {
    backgroundColor: "#FFF",
    height: 44,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#DDDDDD",
    justifyContent: "center",
    alignItems: "center",
  },
  sendAnotherBtnText: { color: "#333333", fontSize: 16, fontFamily: "Montserrat_500Medium" },
  backHomeLink: { paddingVertical: 10, alignItems: "center" },
  backHomeLinkText: { color: "#666666", fontSize: 16, fontFamily: "Montserrat_500Medium" },
  suggestionsDropdown: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    marginTop: 4,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    maxHeight: 200,
    elevation: 5,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F9FAFB",
  },
  suggestionName: { fontSize: 14, color: "#1F2937", fontFamily: "Montserrat_600SemiBold" },
  suggestionSub: { fontSize: 12, color: "#9CA3AF", fontFamily: "Poppins_400Regular" },
  noSuggestionText: {
    padding: 12,
    color: "#9CA3AF",
    textAlign: "center",
    fontFamily: "Poppins_400Regular",
  },
});
