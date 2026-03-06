import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  Dimensions,
} from "react-native";
import { Ionicons, MaterialIcons, FontAwesome5 } from "@expo/vector-icons";
import { useAuth } from "../../context/AuthContext";
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get("window");

const ForgotPasswordScreen = ({ navigation }) => {
  const { forgotPassword, resetPassword, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  const handleSendOTP = async () => {
    if (!email) {
      Alert.alert("Error", "Please enter your email address");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert("Error", "Please enter a valid email address");
      return;
    }

    try {
      const response = await forgotPassword(email);
      if (response.success) {
        setOtpSent(true);
        Alert.alert("OTP Sent", "Check your email for the OTP code");
      } else {
        Alert.alert("Error", response.message || "Failed to send OTP");
      }
    } catch (error) {
      Alert.alert("Error", error.message || "Something went wrong");
    }
  };

  const handleResetPassword = async () => {
    if (!otp || !newPassword || !confirmPassword) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert("Error", "Minimum 6 characters required");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    try {
      await resetPassword({ email, otp, newPassword });
      Alert.alert("Success", "Password reset successfully!");
      navigation.navigate("Login");
    } catch (error) {
      Alert.alert("Error", error.message || "Reset failed");
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <LinearGradient
        colors={['#34A4FA', '#3B4DFD']}
        style={styles.gradient}
      >
        {/* Abstract shapes */}
        <View style={styles.circle1} />
        <View style={styles.circle2} />

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={styles.scrollView}
            showsVerticalScrollIndicator={false}
          >
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <MaterialIcons name="arrow-back-ios" size={20} color="#fff" style={{ marginLeft: 5 }} />
            </TouchableOpacity>

            <View style={styles.headerContainer}>
              <View style={styles.statusBadge}>
                <Ionicons
                  name={otpSent ? "shield-checkmark" : "lock-open"}
                  size={16}
                  color="#fff"
                />
                <Text style={styles.statusText}>
                  {otpSent ? "Verification" : "Account Recovery"}
                </Text>
              </View>
              <Text style={styles.appName}>
                {otpSent ? "Reset Password" : "Forgot Password?"}
              </Text>
              <Text style={styles.tagline}>
                {otpSent
                  ? "Enter the code sent to your inbox and set your new credentials"
                  : "No worries! It happens. Enter your email and we'll help you get back in."}
              </Text>
            </View>

            <View style={styles.card}>
              {!otpSent ? (
                <View style={styles.formContainer}>
                  <Text style={styles.inputLabel}>Registered Email</Text>
                  <View style={styles.inputWrapper}>
                    <View style={styles.iconBox}>
                      <MaterialIcons name="alternate-email" size={20} color="#3B4DFD" />
                    </View>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter your email"
                      placeholderTextColor="#999"
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>

                  <TouchableOpacity style={styles.primaryButton} onPress={handleSendOTP} disabled={loading}>
                    <LinearGradient
                      colors={['#FF6A00', '#FF4E00']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.buttonGradient}
                    >
                      {loading ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <>
                          <Text style={styles.buttonText}>Send Reset Code</Text>
                          <MaterialIcons name="send" size={18} color="#fff" style={{ marginLeft: 10 }} />
                        </>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.formContainer}>
                  <Text style={styles.inputLabel}>Security Code</Text>
                  <View style={styles.inputWrapper}>
                    <View style={styles.iconBox}>
                      <MaterialIcons name="vibration" size={20} color="#3B4DFD" />
                    </View>
                    <TextInput
                      style={styles.input}
                      placeholder="6-digit OTP"
                      placeholderTextColor="#999"
                      value={otp}
                      onChangeText={setOtp}
                      keyboardType="number-pad"
                      maxLength={6}
                    />
                  </View>

                  <Text style={styles.inputLabel}>New Password</Text>
                  <View style={styles.inputWrapper}>
                    <View style={styles.iconBox}>
                      <MaterialIcons name="lock-outline" size={20} color="#3B4DFD" />
                    </View>
                    <TextInput
                      style={styles.input}
                      placeholder="Create New Password"
                      placeholderTextColor="#999"
                      secureTextEntry={!showPassword}
                      value={newPassword}
                      onChangeText={setNewPassword}
                    />
                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                      <Ionicons name={showPassword ? "eye-off" : "eye"} size={20} color="#666" />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.inputWrapper}>
                    <View style={styles.iconBox}>
                      <MaterialIcons name="verified-user" size={20} color="#3B4DFD" />
                    </View>
                    <TextInput
                      style={styles.input}
                      placeholder="Confirm New Password"
                      placeholderTextColor="#999"
                      secureTextEntry={!showConfirmPassword}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                    />
                    <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeIcon}>
                      <Ionicons name={showConfirmPassword ? "eye-off" : "eye"} size={20} color="#666" />
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity style={styles.primaryButton} onPress={handleResetPassword} disabled={loading}>
                    <LinearGradient
                      colors={['#FF6A00', '#FF4E00']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.buttonGradient}
                    >
                      {loading ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text style={styles.buttonText}>Update Password</Text>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>

                  <TouchableOpacity onPress={handleSendOTP} style={styles.resendBtn}>
                    <Text style={styles.resendText}>Didn't receive code? <Text style={styles.resendAction}>Resend</Text></Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <View style={styles.footer}>
              <TouchableOpacity onPress={() => navigation.navigate("Login")} style={styles.loginLink}>
                <MaterialIcons name="keyboard-backspace" size={20} color="#fff" />
                <Text style={styles.loginLinkText}>Back to Sign In</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  gradient: { flex: 1 },
  circle1: {
    position: 'absolute',
    top: -height * 0.1,
    left: -width * 0.2,
    width: width * 0.7,
    height: width * 0.7,
    borderRadius: width * 0.35,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  circle2: {
    position: 'absolute',
    bottom: height * 0.2,
    right: -width * 0.2,
    width: width * 0.5,
    height: width * 0.5,
    borderRadius: width * 0.25,
    backgroundColor: 'rgba(255,106,0,0.1)',
  },
  scrollView: { flexGrow: 1, paddingHorizontal: 25, paddingTop: 60, paddingBottom: 40 },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  headerContainer: { marginBottom: 35 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 15,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
    marginLeft: 6,
    textTransform: 'uppercase',
  },
  appName: { fontSize: 32, fontWeight: "900", color: "#fff", letterSpacing: 0.5 },
  tagline: { fontSize: 16, color: "rgba(255,255,255,0.85)", marginTop: 8, lineHeight: 24 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 35,
    padding: 25,
    elevation: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.15,
    shadowRadius: 25,
  },
  formContainer: { width: '100%' },
  inputLabel: {
    fontSize: 12,
    fontWeight: "900",
    color: "#666",
    marginBottom: 10,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F4F7FF",
    borderRadius: 18,
    paddingHorizontal: 15,
    height: 60,
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: "#E8EEFF",
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  input: { flex: 1, height: "100%", color: "#111", fontSize: 15, fontWeight: '600' },
  eyeIcon: { padding: 5 },
  primaryButton: {
    borderRadius: 20,
    overflow: 'hidden',
    height: 60,
    marginTop: 10,
    elevation: 8,
    shadowColor: "#FF6A00",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  buttonGradient: { flex: 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
  buttonText: { color: "#fff", fontSize: 18, fontWeight: "900", letterSpacing: 0.5 },
  resendBtn: { marginTop: 25, alignItems: 'center' },
  resendText: { color: "#666", fontWeight: "600", fontSize: 14 },
  resendAction: { color: "#3B4DFD", fontWeight: "900" },
  footer: { marginTop: 40, alignItems: 'center' },
  loginLink: { flexDirection: 'row', alignItems: 'center' },
  loginLinkText: { color: '#fff', fontWeight: '900', fontSize: 16, marginLeft: 10 },
});

export default ForgotPasswordScreen;
