import React from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

const sportsList = [
  "Badminton",
  "Cricket",
  "Football",
  "Tennis",
  "Basketball",
  "Snooker",
];

const SportsModal = ({
  visible,
  onClose,
  selectedSports = [],
  setSelectedSports,
}) => {
  const toggleSport = (sport) => {
    if (selectedSports.includes(sport)) {
      setSelectedSports(selectedSports.filter((item) => item !== sport));
    } else {
      setSelectedSports([...selectedSports, sport]);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <MaterialIcons name="close" size={24} color="#000" />
        </TouchableOpacity>

        <View style={styles.modalContainer}>
          <Text style={styles.title}>Select Sports</Text>
          {sportsList.map((sport, index) => (
            <TouchableOpacity
              key={index}
              style={styles.sportItem}
              onPress={() => toggleSport(sport)}
            >
              <Text style={styles.sportlists}>{sport}</Text>
              <View
                style={[
                  styles.checkbox,
                  selectedSports.includes(sport) && styles.checkedBox,
                ]}
              >
                {selectedSports.includes(sport) && (
                  <MaterialIcons name="check" size={16} color="#fff" />
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  closeButton: {
    position: "absolute",
    top: "54%", // Adjust this value to fit the pop-up height
    right: "5%",
    backgroundColor: "#F1F1F1",
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
    zIndex: 10,
  },
  modalContainer: {
    width: "95%",
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 25,
  },
  title: {
    fontWeight: "600",
    fontSize: 14,
    marginBottom: 12,
  },
  sportItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 8,
  },
  sportlists:{
    fontSize:14,
    fontWeight:'400',
    color:'#666'
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#666",
    justifyContent: "center",
    alignItems: "center",
  },
  checkedBox: {
    backgroundColor: "#f60",
    borderColor: "#f60",
  },
});

export default SportsModal;
