import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  SafeAreaView,
} from "react-native";
import Collapsible from "react-native-collapsible";
import { AntDesign } from "@expo/vector-icons";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { useNavigation } from "@react-navigation/native";

const faqData = [
  {
    id: 1,
    question: `What is Chalo Khelne ?`,
    answer:
      "Chalo Khelne is a platform designed to simplify the organization and management of sports tournaments for teams, clubs, and individuals.",
  },
  {
    id: 2,
    question: "Who can use Chalo Khelne ?",
    answer: "Anyone who wants to organize or participate in sports tournaments, including sports enthusiasts, clubs, schools, and organizations.",
  },
  {
    id: 3,
    question: "Who can use Chalo Khelne ?",
    answer: "Anyone who wants to organize or participate in sports tournaments, including sports enthusiasts, clubs, schools, and organizations.",
  },
  {
    id: 4, question: "Can I customize the tournament format ?",
    answer: "Yes, you can choose from various formats such as knockout, round-robin, or league-based tournaments."
  },
  {
    id: 5,
    question: "Who can use Chalo Khelne ?",
    answer: "Anyone who wants to organize or participate in sports tournaments, including sports enthusiasts, clubs, schools, and organizations.",
  },
  { id: 6, question: "Is there a fee to use Chalo Khelne ?", answer: "No, Chalo Khelne is completely free to use. You can access all the essential features without any charges." },
  {
    id: 7,
    question: "Can I manage team registrations through the app ?",
    answer: "Yes, you can invite teams and players to register directly through Chalo Khelne.",
  },
  { id: 8, question: "What if I face issues while using the platform ?", answer: "Reach out to our support team via the app or email us at sales@chalokhelne.com." },
  { id: 9, question: "Can I track live scores during the tournament ?", answer: "Yes, live score tracking is available to keep participants and spectators updated." },
  {
    id: 10,
    question: "Does Chalo Khelne support offline tournaments ?",
    answer: "Yes, you can manage offline tournaments and update scores manually.",
  },
];

const FAQScreen = () => {
  const navigation = useNavigation();

  const [activeId, setActiveId] = useState(null);

  const toggleExpand = (id) => {
    setActiveId(activeId === id ? null : id);
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <TouchableOpacity
        onPress={() => toggleExpand(item.id)}
        style={styles.header}
      >
        <Text style={styles.question}>{`${item.id}. ${item.question}`}</Text>
        <MaterialIcons
          name={activeId === item.id ? "keyboard-arrow-up" : "keyboard-arrow-down"}
          size={18}
          color="gray"
        />
      </TouchableOpacity>
      <Collapsible collapsed={activeId !== item.id}>
        <Text style={styles.answer}>{item.answer}</Text>
      </Collapsible>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={faqData}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ paddingBottom: 20 }}
      />
    </SafeAreaView>
  );
};

export default FAQScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9F9F9",
    paddingHorizontal: 16,
    paddingTop: 20,
    // marginHorizontal: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
  },
  card: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    // elevation: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  question: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    flex: 1,
  },
  answer: {
    marginTop: 10,
    fontSize: 14,
    color: "#666",
    fontWeight: "400",
  },
  BookingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 20,
  },
  Bookingtext: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
});
