import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  StatusBar,
  Image,
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import { Ionicons, MaterialIcons, FontAwesome5 } from "@expo/vector-icons";
import { LinearGradient } from 'expo-linear-gradient';
import {
  GoogleSignin,
  isErrorWithCode,
  statusCodes,
} from "@react-native-google-signin/google-signin";

const { width, height } = Dimensions.get("window");

// Configure Google Sign-In
// Replace this with YOUR Web Client ID from Google Cloud Console
GoogleSignin.configure({
  webClientId: "943646523727-8k78ggm2lm9p2ur152k0lhie0ta2a2mb.apps.googleusercontent.com",
  offlineAccess: false,
  scopes: ["profile", "email"],
});

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [googleLoading, setGoogleLoading] = useState(false);
  const { login, googleLogin, loading } = useAuth();

  const handleGoogleSignIn = async () => {
    try {
      setGoogleLoading(true);

      // Check if Google Play Services are available
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

      // Sign out first so the account picker always shows
      try {
        await GoogleSignin.signOut();
      } catch (_) {}

      // Trigger native Google Sign-In
      const response = await GoogleSignin.signIn();

      if (response.type === "cancelled") {
        // User cancelled — do nothing
        return;
      }

      const { data } = response;
      const idToken = data?.idToken;
      const user = data?.user;

      if (!user?.email) {
        Alert.alert("Error", "Could not get email from Google account.");
        return;
      }

      if (!idToken) {
        Alert.alert("Error", "Could not get authentication token. Please check Google Sign-In configuration.");
        return;
      }

      // Send idToken to our backend for verification
      await googleLogin({
        token: idToken,
        email: user.email,
        name: user.name || user.givenName || "User",
        platform: Platform.OS,
      });
    } catch (error) {
      if (isErrorWithCode(error)) {
        switch (error.code) {
          case statusCodes.SIGN_IN_CANCELLED:
            // User cancelled — silent
            break;
          case statusCodes.IN_PROGRESS:
            // Sign-in already in progress
            break;
          case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
            Alert.alert("Error", "Google Play Services is not available on this device.");
            break;
          default:
            Alert.alert("Google Sign-In Failed", error.message || "Something went wrong.");
        }
      } else {
        Alert.alert("Google Sign-In Failed", error.message || "Authentication failed. Please try again.");
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleLogin = async () => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();
    const errors = {};

    if (!cleanEmail) {
      errors.email = "Email is required";
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cleanEmail)) {
        errors.email = "Please enter a valid email address";
      }
    }

    if (!cleanPassword) {
      errors.password = "Password is required";
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    setValidationErrors({});

    try {
      await login({ email: cleanEmail, password: cleanPassword });
    } catch (error) {
      Alert.alert(
        "Login Failed",
        error.message || "Please check your credentials and try again"
      );
    }
  };

  const toggleShowPassword = () => {
    setShowPassword(!showPassword);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <LinearGradient
        colors={['#34A4FA', '#3B4DFD']}
        style={styles.gradient}
      >
        {/* Abstract Background Shapes */}
        <View style={styles.circle1} />
        <View style={styles.circle2} />
        <View style={styles.circle3} />

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={styles.scrollView}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.headerContainer}>
              <View style={styles.logoBadge}>
                <LinearGradient
                  colors={['#FF8C00', '#FF4E00']}
                  style={styles.logoGradient}
                >
                  <FontAwesome5 name="medal" size={40} color="#fff" />
                </LinearGradient>
              </View>
              <Text style={styles.appName}>Chalo Khelne</Text>
              <Text style={styles.tagline}>Unlock Your Pro Potential</Text>
            </View>

            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Welcome Back</Text>
                <Text style={styles.cardSubtitle}>Sign in to continue your journey</Text>
              </View>

              <View style={styles.formContainer}>
                {/* Email Input */}
                <Text style={styles.inputLabel}>Email Address</Text>
                <View style={[styles.inputWrapper, validationErrors.email && styles.inputErrorBorder]}>
                  <View style={styles.iconBox}>
                    <MaterialIcons name="alternate-email" size={20} color="#3B4DFD" />
                  </View>
                  <TextInput
                    style={styles.input}
                    placeholder="example@mail.com"
                    placeholderTextColor="#999"
                    value={email}
                    onChangeText={(text) => {
                      setEmail(text);
                      if (validationErrors.email) {
                        setValidationErrors(prev => {
                          const newErrors = { ...prev };
                          delete newErrors.email;
                          return newErrors;
                        });
                      }
                    }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
                {validationErrors.email && (
                  <Text style={styles.errorText}>{validationErrors.email}</Text>
                )}

                {/* Password Input */}
                <Text style={styles.inputLabel}>Password</Text>
                <View style={[styles.inputWrapper, validationErrors.password && styles.inputErrorBorder]}>
                  <View style={styles.iconBox}>
                    <MaterialIcons name="lock-outline" size={20} color="#3B4DFD" />
                  </View>
                  <TextInput
                    style={styles.input}
                    placeholder="••••••••"
                    placeholderTextColor="#999"
                    value={password}
                    onChangeText={(text) => {
                      setPassword(text);
                      if (validationErrors.password) {
                        setValidationErrors(prev => {
                          const newErrors = { ...prev };
                          delete newErrors.password;
                          return newErrors;
                        });
                      }
                    }}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity onPress={toggleShowPassword} style={styles.eyeIcon}>
                    <Ionicons
                      name={showPassword ? "eye-off" : "eye"}
                      size={20}
                      color="#666"
                    />
                  </TouchableOpacity>
                </View>
                {validationErrors.password && (
                  <Text style={styles.errorText}>{validationErrors.password}</Text>
                )}

                <TouchableOpacity
                  style={styles.forgotPassword}
                  onPress={() => navigation.navigate("ForgotPassword")}
                >
                  <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.loginButton}
                  onPress={handleLogin}
                  disabled={loading}
                >
                  <LinearGradient
                    colors={['#FF6A00', '#FF4E00']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.buttonGradient}
                  >
                    {loading ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.loginButtonText}>Sign In</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>
            <TouchableOpacity
              style={[styles.googleButton, (googleLoading || loading) && { opacity: 0.6 }]}
              onPress={handleGoogleSignIn}
              disabled={googleLoading || loading}
              activeOpacity={0.8}
            >
              {googleLoading ? (
                <ActivityIndicator color="#333" size="small" />
              ) : (
                <>
                  <FontAwesome5 name="google" size={18} color="#4285F4" style={{ marginRight: 8 }} />
                  <Text style={styles.googleButtonText}>Continue with Google</Text>
                </>
              )}
            </TouchableOpacity>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate("Register")}>
                <Text style={styles.registerText}>Sign Up Now</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  circle1: {
    position: 'absolute',
    top: -height * 0.1,
    right: -width * 0.2,
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: width * 0.4,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  circle2: {
    position: 'absolute',
    bottom: height * 0.1,
    left: -width * 0.3,
    width: width * 0.7,
    height: width * 0.7,
    borderRadius: width * 0.35,
    backgroundColor: 'rgba(255,106,0,0.1)',
  },
  circle3: {
    position: 'absolute',
    top: height * 0.3,
    left: width * 0.8,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  scrollView: {
    flexGrow: 1,
    paddingHorizontal: 25,
    paddingTop: Platform.OS === 'ios' ? 80 : 60,
    paddingBottom: 40,
  },
  headerContainer: {
    alignItems: "center",
    marginBottom: 35,
  },
  logoBadge: {
    width: 90,
    height: 90,
    borderRadius: 25,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    transform: [{ rotate: '15deg' }],
  },
  logoGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  appName: {
    fontSize: 34,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: 1,
  },
  tagline: {
    fontSize: 16,
    color: "rgba(255,255,255,0.8)",
    marginTop: 5,
    letterSpacing: 1,
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
  cardHeader: {
    marginBottom: 25,
  },
  cardTitle: {
    fontSize: 26,
    fontWeight: "900",
    color: "#111",
  },
  cardSubtitle: {
    fontSize: 14,
    color: "#777",
    marginTop: 4,
  },
  formContainer: {
    width: '100%',
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#444',
    marginBottom: 8,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F4F7FF",
    borderRadius: 18,
    paddingHorizontal: 12,
    height: 60,
    marginBottom: 15,
    borderWidth: 1.5,
    borderColor: "#E8EEFF",
  },
  inputErrorBorder: {
    borderColor: "#FF3B30",
    backgroundColor: "#FFF9F9",
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(59,77,253,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: "100%",
    color: "#111",
    fontSize: 15,
    fontWeight: '600',
  },
  eyeIcon: {
    padding: 8,
  },
  errorText: {
    color: "#FF3B30",
    fontSize: 12,
    marginTop: -10,
    marginBottom: 10,
    marginLeft: 5,
    fontWeight: '700',
  },
  forgotPassword: {
    alignSelf: "flex-end",
    marginBottom: 25,
  },
  forgotPasswordText: {
    color: "#3B4DFD",
    fontSize: 14,
    fontWeight: "800",
  },
  loginButton: {
    borderRadius: 20,
    overflow: 'hidden',
    height: 60,
    marginBottom: 25,
    elevation: 8,
    shadowColor: "#FF6A00",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  buttonGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 1,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
    paddingHorizontal: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  dividerText: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 12,
    fontWeight: "700",
    marginHorizontal: 12,
    letterSpacing: 1,
  },
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginHorizontal: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  googleIcon: {
    width: 20,
    height: 20,
    marginRight: 8,
  },
  googleButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#333",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 25,
  },
  footerText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 15,
    fontWeight: '500',
  },
  registerText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 15,
    textDecorationLine: 'underline',
  },
});

export default LoginScreen;
