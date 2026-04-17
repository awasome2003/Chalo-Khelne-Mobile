import React, { useState, useEffect, useRef, useCallback } from "react";
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
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useAuth } from "../../context/AuthContext";
import { LinearGradient } from "expo-linear-gradient";

const { width, height } = Dimensions.get("window");

const OTP_EXPIRY_SECONDS = 300; // 5 minutes
const RESEND_COOLDOWN_SECONDS = 60;

const ForgotPasswordScreen = ({ navigation }) => {
  const { forgotPassword, resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  // Separate loading states so resend doesn't block the reset button
  const [sendingOtp, setSendingOtp] = useState(false);
  const [resetting, setResetting] = useState(false);

  // OTP countdown timer
  const [otpTimer, setOtpTimer] = useState(0);
  const timerRef = useRef(null);

  // Resend cooldown
  const [resendCooldown, setResendCooldown] = useState(0);
  const resendTimerRef = useRef(null);

  // Password strength indicators
  const [passwordFocused, setPasswordFocused] = useState(false);

  // Refs for auto-focus
  const otpInputRef = useRef(null);
  const passwordInputRef = useRef(null);
  const confirmPasswordInputRef = useRef(null);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (resendTimerRef.current) clearInterval(resendTimerRef.current);
    };
  }, []);

  const startOtpTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setOtpTimer(OTP_EXPIRY_SECONDS);
    timerRef.current = setInterval(() => {
      setOtpTimer((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const startResendCooldown = useCallback(() => {
    if (resendTimerRef.current) clearInterval(resendTimerRef.current);
    setResendCooldown(RESEND_COOLDOWN_SECONDS);
    resendTimerRef.current = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(resendTimerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // Password validation
  const hasMinLength = newPassword.length >= 6;
  const hasLetter = /[a-zA-Z]/.test(newPassword);
  const hasNumber = /\d/.test(newPassword);
  const passwordsMatch = newPassword && confirmPassword && newPassword === confirmPassword;
  const isPasswordValid = hasMinLength && hasLetter && hasNumber;

  const handleSendOTP = async () => {
    if (!email) {
      Alert.alert("Required", "Please enter your email address");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert("Invalid Email", "Please enter a valid email address");
      return;
    }

    try {
      setSendingOtp(true);
      const response = await forgotPassword(email);
      if (response.success) {
        setOtpSent(true);
        startOtpTimer();
        startResendCooldown();
        Alert.alert(
          "Code Sent!",
          "We've sent a 6-digit reset code to your email. Check your inbox (and spam folder)."
        );
        // Auto-focus OTP input after a short delay
        setTimeout(() => otpInputRef.current?.focus(), 500);
      } else {
        Alert.alert("Error", response.message || "Failed to send reset code");
      }
    } catch (error) {
      Alert.alert("Error", error.message || "Something went wrong");
    } finally {
      setSendingOtp(false);
    }
  };

  const handleResendOTP = async () => {
    if (resendCooldown > 0) return;

    try {
      setSendingOtp(true);
      const response = await forgotPassword(email);
      if (response.success) {
        setOtp(""); // Clear old OTP
        startOtpTimer();
        startResendCooldown();
        Alert.alert("Code Resent!", "A new reset code has been sent to your email.");
      }
    } catch (error) {
      Alert.alert("Error", error.message || "Failed to resend code");
    } finally {
      setSendingOtp(false);
    }
  };

  const handleResetPassword = async () => {
    if (!otp) {
      Alert.alert("Required", "Please enter the 6-digit reset code");
      return;
    }
    if (otp.length !== 6) {
      Alert.alert("Invalid Code", "Reset code must be 6 digits");
      return;
    }
    if (!newPassword) {
      Alert.alert("Required", "Please enter your new password");
      return;
    }
    if (!isPasswordValid) {
      Alert.alert(
        "Weak Password",
        "Password must be at least 6 characters with at least one letter and one number"
      );
      return;
    }
    if (!confirmPassword) {
      Alert.alert("Required", "Please confirm your new password");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Mismatch", "Passwords do not match");
      return;
    }
    if (otpTimer === 0) {
      Alert.alert(
        "Code Expired",
        "Your reset code has expired. Please request a new one.",
        [{ text: "Resend Code", onPress: handleResendOTP }, { text: "Cancel" }]
      );
      return;
    }

    try {
      setResetting(true);
      await resetPassword({ email, otp, newPassword });
      if (timerRef.current) clearInterval(timerRef.current);
      Alert.alert(
        "Password Updated!",
        "Your password has been reset successfully. Please sign in with your new password.",
        [{ text: "Sign In", onPress: () => navigation.navigate("Login") }]
      );
    } catch (error) {
      Alert.alert("Reset Failed", error.message || "Could not reset password. Please try again.");
    } finally {
      setResetting(false);
    }
  };

  const PasswordCheck = ({ valid, label }) => (
    <View style={styles.checkRow}>
      <Ionicons
        name={valid ? "checkmark-circle" : "ellipse-outline"}
        size={16}
        color={valid ? "#22C55E" : "#999"}
      />
      <Text style={[styles.checkLabel, valid && styles.checkLabelValid]}>
        {label}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <LinearGradient colors={["#34A4FA", "#3B4DFD"]} style={styles.gradient}>
        {/* Abstract shapes */}
        <View style={styles.circle1} />
        <View style={styles.circle2} />

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={styles.scrollView}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
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
                  : "No worries! Enter your email and we'll send you a reset code."}
              </Text>
            </View>

            <View style={styles.card}>
              {!otpSent ? (
                /* ==================== STEP 1: EMAIL INPUT ==================== */
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
                      autoCorrect={false}
                      returnKeyType="send"
                      onSubmitEditing={handleSendOTP}
                    />
                  </View>

                  <TouchableOpacity
                    style={[styles.primaryButton, sendingOtp && styles.buttonDisabled]}
                    onPress={handleSendOTP}
                    disabled={sendingOtp}
                  >
                    <LinearGradient
                      colors={sendingOtp ? ["#ccc", "#bbb"] : ["#FF6A00", "#FF4E00"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.buttonGradient}
                    >
                      {sendingOtp ? (
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
                /* ==================== STEP 2: OTP + NEW PASSWORD ==================== */
                <View style={styles.formContainer}>
                  {/* Email badge — shows which email the code was sent to */}
                  <View style={styles.emailBadge}>
                    <MaterialIcons name="email" size={16} color="#3B4DFD" />
                    <Text style={styles.emailBadgeText} numberOfLines={1}>
                      {email}
                    </Text>
                    <TouchableOpacity
                      onPress={() => {
                        setOtpSent(false);
                        setOtp("");
                        setNewPassword("");
                        setConfirmPassword("");
                        if (timerRef.current) clearInterval(timerRef.current);
                        setOtpTimer(0);
                      }}
                    >
                      <Text style={styles.changeEmailText}>Change</Text>
                    </TouchableOpacity>
                  </View>

                  {/* OTP Timer */}
                  {otpTimer > 0 ? (
                    <View style={styles.timerContainer}>
                      <Ionicons name="time-outline" size={16} color={otpTimer < 60 ? "#EF4444" : "#22C55E"} />
                      <Text
                        style={[
                          styles.timerText,
                          otpTimer < 60 && styles.timerTextExpiring,
                        ]}
                      >
                        Code expires in {formatTime(otpTimer)}
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.timerContainer}>
                      <Ionicons name="alert-circle" size={16} color="#EF4444" />
                      <Text style={styles.timerTextExpired}>
                        Code expired — request a new one
                      </Text>
                    </View>
                  )}

                  {/* OTP Input */}
                  <Text style={styles.inputLabel}>Reset Code</Text>
                  <View style={styles.inputWrapper}>
                    <View style={styles.iconBox}>
                      <MaterialIcons name="pin" size={20} color="#3B4DFD" />
                    </View>
                    <TextInput
                      ref={otpInputRef}
                      style={[styles.input, styles.otpInput]}
                      placeholder="Enter 6-digit code"
                      placeholderTextColor="#999"
                      value={otp}
                      onChangeText={(text) => {
                        const cleaned = text.replace(/[^0-9]/g, "");
                        setOtp(cleaned);
                        // Auto-focus to password when 6 digits entered
                        if (cleaned.length === 6) {
                          passwordInputRef.current?.focus();
                        }
                      }}
                      keyboardType="number-pad"
                      maxLength={6}
                      returnKeyType="next"
                      onSubmitEditing={() => passwordInputRef.current?.focus()}
                    />
                    {otp.length === 6 && (
                      <Ionicons name="checkmark-circle" size={22} color="#22C55E" />
                    )}
                  </View>

                  {/* New Password */}
                  <Text style={styles.inputLabel}>New Password</Text>
                  <View style={styles.inputWrapper}>
                    <View style={styles.iconBox}>
                      <MaterialIcons name="lock-outline" size={20} color="#3B4DFD" />
                    </View>
                    <TextInput
                      ref={passwordInputRef}
                      style={styles.input}
                      placeholder="Create new password"
                      placeholderTextColor="#999"
                      secureTextEntry={!showPassword}
                      value={newPassword}
                      onChangeText={setNewPassword}
                      onFocus={() => setPasswordFocused(true)}
                      onBlur={() => setPasswordFocused(false)}
                      returnKeyType="next"
                      onSubmitEditing={() => confirmPasswordInputRef.current?.focus()}
                    />
                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                      <Ionicons name={showPassword ? "eye-off" : "eye"} size={20} color="#666" />
                    </TouchableOpacity>
                  </View>

                  {/* Password strength checklist — shown when focused or partially filled */}
                  {(passwordFocused || (newPassword.length > 0 && !isPasswordValid)) && (
                    <View style={styles.passwordChecks}>
                      <PasswordCheck valid={hasMinLength} label="At least 6 characters" />
                      <PasswordCheck valid={hasLetter} label="Contains a letter" />
                      <PasswordCheck valid={hasNumber} label="Contains a number" />
                    </View>
                  )}

                  {/* Confirm Password */}
                  <Text style={styles.inputLabel}>Confirm Password</Text>
                  <View style={styles.inputWrapper}>
                    <View style={styles.iconBox}>
                      <MaterialIcons name="verified-user" size={20} color="#3B4DFD" />
                    </View>
                    <TextInput
                      ref={confirmPasswordInputRef}
                      style={styles.input}
                      placeholder="Re-enter new password"
                      placeholderTextColor="#999"
                      secureTextEntry={!showConfirmPassword}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      returnKeyType="done"
                      onSubmitEditing={handleResetPassword}
                    />
                    <TouchableOpacity
                      onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                      style={styles.eyeIcon}
                    >
                      <Ionicons name={showConfirmPassword ? "eye-off" : "eye"} size={20} color="#666" />
                    </TouchableOpacity>
                  </View>

                  {/* Password match indicator */}
                  {confirmPassword.length > 0 && (
                    <View style={styles.matchRow}>
                      <Ionicons
                        name={passwordsMatch ? "checkmark-circle" : "close-circle"}
                        size={16}
                        color={passwordsMatch ? "#22C55E" : "#EF4444"}
                      />
                      <Text
                        style={[
                          styles.matchText,
                          { color: passwordsMatch ? "#22C55E" : "#EF4444" },
                        ]}
                      >
                        {passwordsMatch ? "Passwords match" : "Passwords don't match"}
                      </Text>
                    </View>
                  )}

                  {/* Reset Button */}
                  <TouchableOpacity
                    style={[styles.primaryButton, resetting && styles.buttonDisabled]}
                    onPress={handleResetPassword}
                    disabled={resetting}
                  >
                    <LinearGradient
                      colors={resetting ? ["#ccc", "#bbb"] : ["#FF6A00", "#FF4E00"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.buttonGradient}
                    >
                      {resetting ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text style={styles.buttonText}>Update Password</Text>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>

                  {/* Resend OTP */}
                  <TouchableOpacity
                    onPress={handleResendOTP}
                    disabled={resendCooldown > 0 || sendingOtp}
                    style={styles.resendBtn}
                  >
                    {sendingOtp ? (
                      <ActivityIndicator size="small" color="#3B4DFD" />
                    ) : resendCooldown > 0 ? (
                      <Text style={styles.resendTextDisabled}>
                        Resend code in {resendCooldown}s
                      </Text>
                    ) : (
                      <Text style={styles.resendText}>
                        Didn't receive code?{" "}
                        <Text style={styles.resendAction}>Resend</Text>
                      </Text>
                    )}
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
    position: "absolute",
    top: -height * 0.1,
    left: -width * 0.2,
    width: width * 0.7,
    height: width * 0.7,
    borderRadius: width * 0.35,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  circle2: {
    position: "absolute",
    bottom: height * 0.2,
    right: -width * 0.2,
    width: width * 0.5,
    height: width * 0.5,
    borderRadius: width * 0.25,
    backgroundColor: "rgba(255,106,0,0.1)",
  },
  scrollView: {
    flexGrow: 1,
    paddingHorizontal: 25,
    paddingTop: 60,
    paddingBottom: 40,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 30,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  headerContainer: { marginBottom: 35 },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 15,
  },
  statusText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "800",
    marginLeft: 6,
    textTransform: "uppercase",
  },
  appName: {
    fontSize: 32,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: 0.5,
  },
  tagline: {
    fontSize: 16,
    color: "rgba(255,255,255,0.85)",
    marginTop: 8,
    lineHeight: 24,
  },
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
  formContainer: { width: "100%" },
  emailBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EEF2FF",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
    gap: 8,
  },
  emailBadgeText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  changeEmailText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#3B4DFD",
  },
  timerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
    gap: 6,
  },
  timerText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#22C55E",
  },
  timerTextExpiring: {
    color: "#EF4444",
  },
  timerTextExpired: {
    fontSize: 13,
    fontWeight: "600",
    color: "#EF4444",
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "900",
    color: "#666",
    marginBottom: 10,
    marginLeft: 4,
    textTransform: "uppercase",
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
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  input: {
    flex: 1,
    height: "100%",
    color: "#111",
    fontSize: 15,
    fontWeight: "600",
  },
  otpInput: {
    letterSpacing: 6,
    fontSize: 18,
    fontWeight: "700",
  },
  eyeIcon: { padding: 5 },
  passwordChecks: {
    marginTop: -10,
    marginBottom: 16,
    marginLeft: 4,
    gap: 4,
  },
  checkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  checkLabel: {
    fontSize: 12,
    color: "#999",
    fontWeight: "500",
  },
  checkLabelValid: {
    color: "#22C55E",
  },
  matchRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: -12,
    marginBottom: 16,
    marginLeft: 4,
    gap: 6,
  },
  matchText: {
    fontSize: 12,
    fontWeight: "600",
  },
  primaryButton: {
    borderRadius: 20,
    overflow: "hidden",
    height: 60,
    marginTop: 10,
    elevation: 8,
    shadowColor: "#FF6A00",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  buttonDisabled: {
    elevation: 0,
    shadowOpacity: 0,
  },
  buttonGradient: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  resendBtn: {
    marginTop: 25,
    alignItems: "center",
    minHeight: 24,
    justifyContent: "center",
  },
  resendText: { color: "#666", fontWeight: "600", fontSize: 14 },
  resendTextDisabled: { color: "#999", fontWeight: "600", fontSize: 14 },
  resendAction: { color: "#3B4DFD", fontWeight: "900" },
  footer: { marginTop: 40, alignItems: "center" },
  loginLink: { flexDirection: "row", alignItems: "center" },
  loginLinkText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 16,
    marginLeft: 10,
  },
});

export default ForgotPasswordScreen;
