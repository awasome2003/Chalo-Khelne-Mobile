import React, { useState } from "react";
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
import RoleSelector from "./RoleSelector";

const { width, height } = Dimensions.get("window");

const RegisterScreen = ({ navigation }) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState("Player");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const { register, loading } = useAuth();

  const handleMobileChange = (value) => {
    const numericValue = value.replace(/\D/g, '');
    if (numericValue.length <= 10) {
      setMobile(numericValue);
      if (numericValue.length === 10 && validationErrors.mobile) {
        setValidationErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.mobile;
          return newErrors;
        });
      }
    }
  };

  const handleRegister = async () => {
    const errors = {};

    if (!name.trim()) errors.name = "Name is required";
    if (!email.trim()) {
      errors.email = "Email is required";
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) errors.email = "Invalid email address";
    }
    if (!mobile.trim()) {
      errors.mobile = "Mobile is required";
    } else if (mobile.length !== 10) {
      errors.mobile = "Enter a valid 10-digit number";
    }
    if (!password.trim()) {
      errors.password = "Password is required";
    } else if (password.length < 6) {
      errors.password = "Minimum 6 characters";
    }
    if (password !== confirmPassword) errors.confirmPassword = "Passwords match error";

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    setValidationErrors({});

    try {
      const response = await register({ name, email, mobile, password, role });
      if (response) {
        let msg = "Account created successfully. Please login.";
        if (response.message && response.message.includes("waiting for approval")) {
          msg = "Registration successful! Your account is waiting for approval.";
        }
        Alert.alert("Success", msg, [{ text: "OK", onPress: () => navigation.navigate("Login") }]);
      }
    } catch (error) {
      Alert.alert("Registration Failed", error.message || "Please try again");
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <LinearGradient
        colors={['#34A4FA', '#3B4DFD']}
        style={styles.gradient}
      >
        {/* Abstract Shapes */}
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
              <Text style={styles.appName}>Create Account</Text>
              <Text style={styles.tagline}>Join the elite sports community</Text>
            </View>

            <View style={styles.card}>
              <View style={styles.formContainer}>

                <View style={styles.sectionHeader}>
                  <View style={styles.sectionBadge}>
                    <Text style={styles.sectionBadgeText}>Step 1</Text>
                  </View>
                  <Text style={styles.sectionTitle}>Select Your Role</Text>
                </View>
                <RoleSelector selectedRole={role} onSelectRole={setRole} />

                <View style={[styles.sectionHeader, { marginTop: 10 }]}>
                  <View style={styles.sectionBadge}>
                    <Text style={styles.sectionBadgeText}>Step 2</Text>
                  </View>
                  <Text style={styles.sectionTitle}>Personal Details</Text>
                </View>

                {/* Name Input */}
                <Text style={styles.inputLabel}>Full Name</Text>
                <View style={[styles.inputWrapper, validationErrors.name && styles.inputErrorBorder]}>
                  <View style={styles.iconBox}>
                    <MaterialIcons name="person-outline" size={20} color="#3B4DFD" />
                  </View>
                  <TextInput
                    style={styles.input}
                    placeholder="John Doe"
                    placeholderTextColor="#999"
                    value={name}
                    onChangeText={(text) => {
                      setName(text);
                      if (validationErrors.name) {
                        setValidationErrors(prev => {
                          const newErrors = { ...prev };
                          delete newErrors.name;
                          return newErrors;
                        });
                      }
                    }}
                  />
                </View>
                {validationErrors.name && <Text style={styles.errorText}>{validationErrors.name}</Text>}

                {/* Email Input */}
                <Text style={styles.inputLabel}>Email Address</Text>
                <View style={[styles.inputWrapper, validationErrors.email && styles.inputErrorBorder]}>
                  <View style={styles.iconBox}>
                    <MaterialIcons name="mail-outline" size={20} color="#3B4DFD" />
                  </View>
                  <TextInput
                    style={styles.input}
                    placeholder="john@example.com"
                    placeholderTextColor="#999"
                    keyboardType="email-address"
                    autoCapitalize="none"
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
                  />
                </View>
                {validationErrors.email && <Text style={styles.errorText}>{validationErrors.email}</Text>}

                {/* Mobile Input */}
                <Text style={styles.inputLabel}>Mobile Number</Text>
                <View style={[styles.inputWrapper, validationErrors.mobile && styles.inputErrorBorder]}>
                  <View style={styles.iconBox}>
                    <MaterialIcons name="phone-iphone" size={20} color="#3B4DFD" />
                  </View>
                  <TextInput
                    style={styles.input}
                    placeholder="10-digit number"
                    placeholderTextColor="#999"
                    keyboardType="phone-pad"
                    maxLength={10}
                    value={mobile}
                    onChangeText={handleMobileChange}
                  />
                </View>
                {validationErrors.mobile && <Text style={styles.errorText}>{validationErrors.mobile}</Text>}

                {/* Password Input */}
                <Text style={styles.inputLabel}>Security</Text>
                <View style={[styles.inputWrapper, validationErrors.password && styles.inputErrorBorder]}>
                  <View style={styles.iconBox}>
                    <MaterialIcons name="lock-open" size={20} color="#3B4DFD" />
                  </View>
                  <TextInput
                    style={styles.input}
                    placeholder="Create Password"
                    placeholderTextColor="#999"
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={setPassword}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                    <Ionicons name={showPassword ? "eye-off" : "eye"} size={20} color="#666" />
                  </TouchableOpacity>
                </View>
                {validationErrors.password && <Text style={styles.errorText}>{validationErrors.password}</Text>}

                <View style={[styles.inputWrapper, validationErrors.confirmPassword && styles.inputErrorBorder]}>
                  <View style={styles.iconBox}>
                    <MaterialIcons name="verified" size={20} color="#3B4DFD" />
                  </View>
                  <TextInput
                    style={styles.input}
                    placeholder="Confirm Password"
                    placeholderTextColor="#999"
                    secureTextEntry={!showConfirmPassword}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                  />
                  <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeIcon}>
                    <Ionicons name={showConfirmPassword ? "eye-off" : "eye"} size={20} color="#666" />
                  </TouchableOpacity>
                </View>
                {validationErrors.confirmPassword && <Text style={styles.errorText}>{validationErrors.confirmPassword}</Text>}

                <TouchableOpacity
                  style={styles.registerButton}
                  onPress={handleRegister}
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
                      <>
                        <Text style={styles.registerButtonText}>Register Account</Text>
                        <MaterialIcons name="arrow-forward" size={20} color="#fff" style={{ marginLeft: 8 }} />
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate("Login")}>
                <Text style={styles.loginText}>Sign In</Text>
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
    top: -50,
    left: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  circle2: {
    position: 'absolute',
    bottom: 50,
    right: -30,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255,106,0,0.1)',
  },
  scrollView: {
    flexGrow: 1,
    paddingHorizontal: 25,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 40,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  headerContainer: {
    marginBottom: 30,
    paddingLeft: 5,
  },
  appName: {
    fontSize: 32,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: 1,
  },
  tagline: {
    fontSize: 15,
    color: "rgba(255,255,255,0.8)",
    marginTop: 4,
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 35,
    padding: 22,
    elevation: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.15,
    shadowRadius: 25,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionBadge: {
    backgroundColor: 'rgba(59,77,253,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginRight: 10,
  },
  sectionBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#3B4DFD',
    textTransform: 'uppercase',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: "#111",
    letterSpacing: 0.3,
  },
  formContainer: {
    width: '100%',
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: '#666',
    marginBottom: 8,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F4F7FF",
    borderRadius: 18,
    paddingHorizontal: 12,
    height: 58,
    marginBottom: 15,
    borderWidth: 1.5,
    borderColor: "#E8EEFF",
  },
  inputErrorBorder: {
    borderColor: "#FF3B30",
    backgroundColor: "#FFF9F9",
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
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
    fontSize: 14,
    fontWeight: '600',
  },
  eyeIcon: {
    padding: 8,
  },
  errorText: {
    color: "#FF3B30",
    fontSize: 11,
    marginTop: -10,
    marginBottom: 10,
    marginLeft: 5,
    fontWeight: '700',
  },
  registerButton: {
    borderRadius: 20,
    overflow: 'hidden',
    height: 60,
    marginTop: 15,
    marginBottom: 5,
    elevation: 8,
    shadowColor: "#FF6A00",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  buttonGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  registerButtonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "900",
    letterSpacing: 1,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 30,
    marginBottom: 10,
  },
  footerText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 15,
    fontWeight: '500',
  },
  loginText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 15,
    textDecorationLine: 'underline',
  },
});

export default RegisterScreen;
