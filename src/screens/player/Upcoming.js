import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { MaterialIcons, FontAwesome5, Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import Icon from "react-native-vector-icons/MaterialIcons";

// Header component
const CustomHeader = () => {
  const navigation = useNavigation();

  return (
    <View style={styles.headerContainer}>
      <TouchableOpacity onPress={() => navigation.goBack()}>
        <MaterialIcons name="arrow-back" size={24} color="#666" />
      </TouchableOpacity>

      <Text style={styles.headerTitle}>Sports Arena</Text>

      <View style={styles.headerIcons}>
        <TouchableOpacity style={styles.iconSpacing}>
          <MaterialIcons name="share" size={24} color="#666" />
        </TouchableOpacity>
        <TouchableOpacity>
          <Ionicons name="heart-outline" size={24} color="black" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const Tournament Details = ({ route }) => {
  const [showMore, setShowMore] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("Open Category");
  const [expanded, setExpanded] = useState(false);

  const toggleExpanded = () => setExpanded((prev) => !prev);
  const description = `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui velit.`;
  const { item } = route.params;

  return (
    <ScrollView style={styles.container}>
      <CustomHeader />
      <Text style={styles.header}>Event Details Page</Text>
      <Image source={item.image} style={styles.image} />

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Tournament Name</Text>
        <Text style={styles.cardContent}>{item.name}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Club Name</Text>
        <Text style={styles.cardContent}>{item.club}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{item.date}</Text>
        <Text style={styles.cardContent}>{item.closingDate}</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.title}>Event Description</Text>
        <View style={styles.descriptionContainer}>
          <Text style={styles.content}>
            {showMore ? description : description.slice(0, 200) + "..."}
          </Text>
          <TouchableOpacity
            style={styles.readMoreWrapper}
            onPress={() => setShowMore(!showMore)}
          >
            <Text style={styles.readMoreText}>
              {showMore ? "Read Less" : "Read More"}
            </Text>
            <MaterialIcons
              name={showMore ? "keyboard-arrow-up" : "keyboard-arrow-down"}
              size={20}
              color="#007BFF"
            />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Organized by</Text>
        <Text style={styles.cardContent}>Organizer Name</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Amenities</Text>
        <View style={styles.amenitiesRow}>
          <View style={styles.amenity}>
            <MaterialIcons name="checkroom" size={20} color="#666" />
            <Text style={styles.amenityText}>Changing Room</Text>
          </View>
          <View style={styles.amenity}>
            <FontAwesome5 name="parking" size={20} color="#666" />
            <Text style={styles.amenityText}>Parking</Text>
          </View>

          {/* Add more amenities as needed */}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Select Category</Text>
        <View style={styles.categoryRow}>
          <TouchableOpacity style={styles.categoryActive}>
            <Text style={styles.categoryTextActive}>Open Category</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.categoryInactive}>
            <Text style={styles.categoryTextInactive}>Under 15 (U15)</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.categoryInactive}>
            <Text style={styles.categoryTextInactive}>Veterans (39+)</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.categoryInactive}>
            <Text style={styles.categoryTextInactive}>Veterans (59+)</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Cancellation Policy */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Cancellation Policy</Text>
        <Text style={styles.contentText}>Cancellation Policy</Text>
      </View>

      {/* Terms & Conditions */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Terms & Conditions</Text>
        <Text style={styles.subTitle}>Eligibility & Registration</Text>

        <View style={styles.bulletList}>
          <Text style={styles.bulletItem}>
            • Open to players of all experience levels.
          </Text>
          <Text style={styles.bulletItem}>
            • Registration is mandatory, and participation will only be
            confirmed after payment is received.
          </Text>
          {expanded && (
            <>
              <Text style={styles.bulletItem}>
                • No refunds will be provided once registration is confirmed.
              </Text>
              <Text style={styles.bulletItem}>
                • A minimum of 16 participants is required for each category; if
                this is not met, categories may be combined with similar ones.
              </Text>
            </>
          )}
        </View>

        <TouchableOpacity style={styles.readMoreRow} onPress={toggleExpanded}>
          <Text style={styles.readMoreText}>
            {expanded ? "Read Less" : "Read More"}
          </Text>
          <Icon
            name={expanded ? "expand-less" : "expand-more"}
            size={20}
            color="#007BFF"
          />
        </TouchableOpacity>
      </View>

      {/* Show Scoreboard Button */}
      <TouchableOpacity style={styles.button}>
        <Text style={styles.buttonText}>Show Scoreboard</Text>
      </TouchableOpacity>

      {/* Match Started Info */}
      <Text style={styles.footerText}>Match Started 20 min ago</Text>
    </ScrollView>
  );
};

// Styles
const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: "#f2f4f6",
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
    marginTop: 40,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "500",
    flex: 1,
    textAlign: "center",
  },
  headerIcons: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconSpacing: {
    marginRight: 16,
  },
  header: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 10,
  },
  image: {
    width: "100%",
    height: 180,
    borderRadius: 10,
    marginBottom: 16,
  },
  card: {
    backgroundColor: "#FFF",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 4,
    color: "#333",
  },
  cardContent: {
    fontSize: 14,
    color: "#666",
    fontWeight: "400",
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
  },
  descriptionContainer: {
    position: "relative",
  },

  readMoreWrapper: {
    flexDirection: "row",
    alignItems: "center",
    position: "absolute",
    bottom: -7,
    right: 0,
    paddingTop: 8,
  },

  readMoreText: {
    color: "#007BFF",
    fontWeight: "600",
    marginRight: 4,
  },

  content: {
    fontSize: 14,
    fontWeight: "400",
    color: "#666",
  },
  amenitiesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    marginTop: 8,
  },

  amenity: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f1f1f1",
    padding: 10,
    borderRadius: 50,
    paddingHorizontal: 16,
    marginBottom: 10,
  },

  amenityText: {
    fontSize: 14,
    color: "#444",
    marginLeft: 6,
  },
  categoryRow: {
    flexDirection: "row",
    marginTop: 10,
  },
  categoryActive: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    backgroundColor: "#0066CC",
    color: "#fff",
    borderRadius: 20,
    fontSize: 13,
  },
  categoryInactive: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    backgroundColor: "#E0E0E0",
    color: "#333",
    borderRadius: 20,
    fontSize: 13,
  },
  cardTitle: {
    fontWeight: "bold",
    fontSize: 16,
    marginBottom: 12,
  },
  subTitle: {
    fontWeight: "600",
    marginBottom: 8,
    color: "#333",
  },
  contentText: {
    color: "#555",
  },
  categoryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  categoryActive: {
    backgroundColor: "#0047AB",
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 20,
    marginBottom: 10,
  },
  categoryInactive: {
    borderColor: "#aaa",
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 20,
    marginBottom: 10,
  },
  categoryTextActive: {
    color: "#fff",
    fontWeight: "500",
  },
  categoryTextInactive: {
    color: "#444",
    fontWeight: "500",
  },
  bulletList: {
    marginTop: 8,
  },
  bulletItem: {
    marginBottom: 8,
    color: "#444",
    fontSize: 14,
  },
  readMoreRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    marginTop: 4,
  },
  readMoreText: {
    color: "#007BFF",
    fontSize: 13,
    marginRight: 4,
  },
  button: {
    borderColor: "#f60",
    borderWidth: 1,
    paddingVertical: 12,
    borderRadius: 25,
    alignItems: "center",
    marginTop: 12,
  },
  buttonText: {
    color: "#f60",
    fontWeight: "600",
    fontSize: 15,
  },
  footerText: {
    textAlign: "center",
    marginTop: 16,
    marginBottom: 20, // <– added space below
    color: "#555",
    fontSize: 12,
    fontWeight: "400",
  },
});

export default Tournament Details;
