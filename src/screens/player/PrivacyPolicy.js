import React from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";

const PrivacyPolicyScreen = () => {
  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>

        <Text style={styles.paragraph}>
          Welcome to Chalo Khelne! Your privacy is important to us. This Privacy
          Policy explains how we collect, use, and protect your information when
          you use our app.
        </Text>

        <Text style={styles.heading}>1. Information We Collect</Text>
        <Text style={styles.paragraph}>
          We may collect personal details such as your name, email, and contact
          number, as well as usage information like device details, location, or
          app activity to improve our services.
        </Text>

        <Text style={styles.heading}>2. How We Use Information</Text>
        <Text style={styles.paragraph}>
          - To provide and improve our services{"\n"}
          - To communicate with you about bookings and updates{"\n"}
          - To ensure a secure and safe experience{"\n"}
          - For analytics and troubleshooting
        </Text>

        <Text style={styles.heading}>3. Sharing Your Information</Text>
        <Text style={styles.paragraph}>
          We do not sell your personal information. Data may be shared with
          trusted third-party providers (such as payment processors) strictly to
          operate our services.
        </Text>

        <Text style={styles.heading}>4. Data Security</Text>
        <Text style={styles.paragraph}>
          We take reasonable steps to protect your information, but no system is
          100% secure. Please use the app responsibly.
        </Text>

        <Text style={styles.heading}>5. Your Rights</Text>
        <Text style={styles.paragraph}>
          You may request access, update, or deletion of your personal data by
          contacting us at support@chalokhelne.com.
        </Text>

        <Text style={styles.heading}>6. Updates to Policy</Text>
        <Text style={styles.paragraph}>
          We may update this Privacy Policy from time to time. Continued use of
          our app after updates means you accept the revised terms.
        </Text>

        <Text style={styles.paragraph}>
          If you have questions about this Privacy Policy, please contact us at:
          {"\n"}support@chalokhelne.com
        </Text>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollContent: {
    padding: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    marginBottom: 15,
    color: "#111",
    textAlign: "center",
  },
  heading: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 20,
    marginBottom: 5,
    color: "#333",
  },
  paragraph: {
    fontSize: 15,
    lineHeight: 22,
    color: "#555",
    marginBottom: 10,
  },
});

export default PrivacyPolicyScreen;
