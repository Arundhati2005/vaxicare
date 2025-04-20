import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, ActivityIndicator, Alert } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { loginUser } from "../services/authService";
import { useAuth } from "../providers/AuthProvider";

const LoginScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { setUser } = useAuth();
  const initialUserType = route.params?.userType || "user";
  
  const [userType, setUserType] = useState(initialUserType);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [secureText, setSecureText] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter your email and password");
      return;
    }

    try {
      setLoading(true);
      
      // Login with authService (now uses SQLite)
      const user = await loginUser(email, password, userType);
      
      console.log(`Logged in as ${userType} with ${email}`);
      
      // Update auth context with user
      setUser(user);
      
      // Navigate to appropriate screen based on user type
      if (user.userType === "hospital") {
        navigation.navigate("HomeScreenHospital");
      } else {
        navigation.navigate("HomeScreenUser");
      }
    } catch (error) {
      console.error("Login error:", error);
      
      let errorMessage = "Failed to login. Please try again.";
      if (error.message === 'User not found') {
        errorMessage = "No account found with this email. Please check your email or sign up.";
      } else if (error.message === 'Invalid password') {
        errorMessage = "Invalid password. Please try again.";
      }
      
      Alert.alert("Login Error", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Image
        source={require("../assets/Vaxilogo.png")}
        style={styles.logo}
        resizeMode="contain"
      />
      
      <View style={styles.segmentedControlContainer}>
        <TouchableOpacity 
          style={[
            styles.segmentButton, 
            userType === "user" ? styles.activeSegment : styles.inactiveSegment,
            { borderTopLeftRadius: 10, borderBottomLeftRadius: 10 }
          ]} 
          onPress={() => setUserType("user")}
        >
          <Image 
            source={require("../assets/icons/user.png")} 
            style={[
              styles.segmentIcon,
              userType === "user" ? styles.activeSegmentIcon : styles.inactiveSegmentIcon
            ]} 
          />
          <Text style={userType === "user" ? styles.activeSegmentText : styles.inactiveSegmentText}>User</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[
            styles.segmentButton, 
            userType === "hospital" ? styles.activeSegment : styles.inactiveSegment,
            { borderTopRightRadius: 10, borderBottomRightRadius: 10 }
          ]} 
          onPress={() => setUserType("hospital")}
        >
          <Image 
            source={require("../assets/icons/hospital.png")} 
            style={[
              styles.segmentIcon,
              userType === "hospital" ? styles.activeSegmentIcon : styles.inactiveSegmentIcon
            ]} 
          />
          <Text style={userType === "hospital" ? styles.activeSegmentText : styles.inactiveSegmentText}>Hospital</Text>
        </TouchableOpacity>
      </View>
      
      <Text style={[styles.heading, userType === "hospital" ? styles.hospitalText : styles.userText]}>
        Login as {userType === "hospital" ? "Hospital" : "User"}
      </Text>

      <View style={styles.inputContainer}>
        <Image 
          source={userType === "hospital" 
            ? require("../assets/icons/hospital.png") 
            : require("../assets/icons/email.png")}
          style={[styles.inputIcon, userType === "hospital" ? styles.hospitalIcon : styles.userIcon]}
        />
        <TextInput
          style={styles.inputWithIcon}
          placeholder={userType === "hospital" ? "Enter Hospital Email" : "Enter Email"}
          keyboardType="email-address"
          placeholderTextColor={userType === "hospital" ? "#1E3A8A" : "#4A90E2"}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
        />
      </View>

      <View style={styles.inputContainer}>
        <Image 
          source={require("../assets/icons/lock.png")}
          style={[styles.inputIcon, userType === "hospital" ? styles.hospitalIcon : styles.userIcon]}
        />
        <TextInput
          style={styles.passwordInputWithIcon}
          placeholder="Enter Password"
          secureTextEntry={secureText} 
          value={password}
          placeholderTextColor={userType === "hospital" ? "#1E3A8A" : "#4A90E2"}
          onChangeText={setPassword}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity onPress={() => setSecureText(!secureText)}>
          <Image 
            source={secureText ? require("../assets/icons/hidden.png") : require("../assets/icons/eye.png")}
            style={[styles.icon, userType === "hospital" ? styles.hospitalIcon : styles.userIcon]}
          />
        </TouchableOpacity>
      </View>

      <TouchableOpacity 
        style={[styles.button, userType === "hospital" ? styles.hospitalButton : styles.userButton]} 
        onPress={handleLogin}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Text style={styles.buttonText}>Login</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate("SignupScreen", { userType })}>
        <Text style={styles.linkText}>Don't have an account? Sign up</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#fff" },
  logo: {
    width: 200,
    height: 100,
    marginBottom: 20,
  },
  segmentedControlContainer: {
    flexDirection: 'row',
    marginBottom: 30,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  segmentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    width: 120,
  },
  segmentIcon: {
    width: 20,
    height: 20,
    marginRight: 8,
  },
  activeSegment: {
    backgroundColor: '#F3F4F6',
  },
  inactiveSegment: {
    backgroundColor: '#FFFFFF',
  },
  activeSegmentText: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  inactiveSegmentText: {
    fontSize: 16,
    color: '#6B7280',
  },
  activeSegmentIcon: {
    tintColor: '#1E3A8A',
  },
  inactiveSegmentIcon: {
    tintColor: '#6B7280',
  },
  heading: { fontSize: 24, fontWeight: "bold", marginBottom: 20 },
  hospitalText: { color: "#1E3A8A" },
  userText: { color: "#4A90E2" },
  inputContainer: {
    width: "80%",
    height: 50,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 10,
    paddingHorizontal: 15,
    marginVertical: 10,
    backgroundColor: "#F3F4F6",
  },
  inputIcon: {
    width: 20,
    height: 20,
    marginRight: 10,
  },
  hospitalIcon: {
    tintColor: "#1E3A8A",
  },
  userIcon: {
    tintColor: "#4A90E2",
  },
  inputWithIcon: {
    flex: 1,
    height: "100%",
    fontSize: 16,
    color: "#000",
  },
  passwordInputWithIcon: {
    flex: 1,
    height: "100%",
    fontSize: 16,
    color: "#000",
  },
  icon: { 
    width: 24, 
    height: 24, 
  },
  button: {
    paddingVertical: 15,
    width: "80%",
    borderRadius: 10,
    marginVertical: 10,
    alignItems: "center",
  },
  hospitalButton: { backgroundColor: "#1E3A8A" },
  userButton: { backgroundColor: "#4A90E2" },
  buttonText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  linkText: { color: "#1E3A8A", marginTop: 10, textDecorationLine: "underline" },
});

export default LoginScreen;