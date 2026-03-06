import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from "react-native";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import MultiSlider from "@ptomasroos/react-native-multi-slider";

const screenHeight = Dimensions.get("window").height;

const FilterModal = ({ visible, onClose }) => {
  const [selectedSort, setSelectedSort] = useState("distance");
  const [priceRange, setPriceRange] = useState([300, 1300]);

  const sortOptions = [
    { label: "Distance From You", value: "distance" },
    { label: "Rating High To Low", value: "rating" },
    { label: "Price Low To High", value: "lowToHigh" },
    { label: "Price High To Low", value: "highToLow" },
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <MaterialIcons name="close" size={24} />
          </TouchableOpacity>

          <Text style={styles.heading}>Sort By</Text>

          {sortOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={styles.radioRow}
              onPress={() => setSelectedSort(option.value)}
            >
              <Text style={styles.radioLabel}>{option.label}</Text>
              <View
                style={[
                  styles.radioCircle,
                  selectedSort === option.value && styles.radioCircleSelected,
                ]}
              >
                {selectedSort === option.value && (
                  <View style={styles.radioDot} />
                )}
              </View>
            </TouchableOpacity>
          ))}

          <View style={styles.rangeBox}>
            <Text style={styles.rangeLabel}>Select Price Range</Text>

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginTop: 20,
              }}
            >
              <View style={{ flex: 1, paddingHorizontal: 0 }}>
                <MultiSlider
                  values={priceRange}
                  onValuesChange={setPriceRange}
                  min={0}
                  max={2000}
                  step={100}
                  selectedStyle={{ backgroundColor: "#FF6A00" }}
                  unselectedStyle={{ backgroundColor: "#F5EAD8" }}
                  trackStyle={{ height: 4, borderRadius: 2 }}
                  containerStyle={{ height: 50 }}
                  customMarker={({ currentValue }) => (
                    <View style={{ alignItems: "center" }}>
                      <View
                        style={{
                          position: "absolute",
                          top: -40,
                          alignItems: "center",
                        }}
                      >
                        <Text
                          style={{
                            fontWeight: "600",
                            color: "#4A4A4A",
                            fontSize: 14,
                            marginBottom: 4,
                          }}
                        >
                          ₹ {currentValue}
                        </Text>
                        <View
                          style={{
                            width: 0,
                            height: 0,
                            backgroundColor: "transparent",
                            borderLeftWidth: 10,
                            borderRightWidth: 10,
                            borderTopWidth: 14,
                            borderLeftColor: "transparent",
                            borderRightColor: "transparent",
                            borderTopColor: "#FF6A00",
                          }}
                        />
                      </View>
                    </View>
                  )}
                />
              </View>
            </View>

            <View style={styles.rangeEnds}>
              <Text>₹ 0</Text>
              <Text>₹ 2000</Text>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default FilterModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "#00000055",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  modal: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 25,
    width: "95%",
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  closeBtn: {
    position: "absolute",
    top: -50,
    right: 0,
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 30,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.5,
  },
  heading: {
    fontWeight: "bold",
    fontSize: 18,
    marginBottom: 15,
  },
  radioRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 8,
  },
  radioLabel: {
    fontSize: 14,
    color: "#666",
    fontWeight: "400",
  },
  radioCircle: {
    height: 20,
    width: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#999",
    alignItems: "center",
    justifyContent: "center",
  },
  radioCircleSelected: {
    borderColor: "#FF6A00",
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#FF6A00",
  },
  rangeBox: {
    padding: 10,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  rangeLabel: {
    fontWeight: "bold",
    marginBottom: 30,
  },
  priceValues: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  priceText: {
    fontWeight: "600",
    fontSize: 16,
  },
  rangeEnds: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
});
