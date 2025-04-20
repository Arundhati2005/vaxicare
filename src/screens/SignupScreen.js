import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Image, ScrollView, ActivityIndicator } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { registerUser } from "../services/authService";

const SignupScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const initialUserType = route.params?.userType || "user";
  
  const [userType, setUserType] = useState(initialUserType);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [hospitalId, setHospitalId] = useState("");
  const [location, setLocation] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    // Check if passwords match
    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match.");
      return;
    }

    // Validate required fields
    if (userType === "user" && (!name || !email || !phone || !address || !password)) {
      Alert.alert("Error", "All fields are required.");
      return;
    }

    if (userType === "hospital" && (!name || !email || !location || !password)) {
      Alert.alert("Error", "All fields are required.");
      return;
    }

    // Validate password strength
    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters.");
      return;
    }

    try {
      setLoading(true);
      
      // Create user data object with all fields
      const userData = {
        email,
        password,
        name,
        userType,
        phone: userType === 'user' ? phone : '',
        address: userType === 'user' ? address : '',
        hospitalId: userType === 'hospital' ? hospitalId : '',
        location: userType === 'hospital' ? location : ''
      };
      
      // Register user with our authService (now uses SQLite)
      const newUser = await registerUser(userData);
      
      console.log(`Signed up as ${userType}:`, newUser);
      Alert.alert("Success", "Account created successfully!", [
        { text: "OK", onPress: () => navigation.navigate("LoginScreen", { userType }) }
      ]);
    } catch (error) {
      console.error("Signup error:", error);
      Alert.alert("Error", error.message || "Failed to create account. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
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
      
      <Text style={[styles.heading, userType === "hospital" ? styles.hospitalHeading : styles.userHeading]}>
        Sign Up as {userType === "hospital" ? "Hospital" : "User"}
      </Text>

      {userType === "user" ? (
        <>
          <View style={styles.inputContainer}>
            <Image 
              source={require("../assets/icons/profile.png")} 
              style={[styles.inputIcon, styles.userIcon]}
            />
            <TextInput
              style={styles.inputWithIcon}
              placeholder="Full Name"
              placeholderTextColor="#4A90E2"
              value={name}
              onChangeText={setName}
            />
          </View>

          <View style={styles.inputContainer}>
            <Image 
              source={require("../assets/icons/email.png")} 
              style={[styles.inputIcon, styles.userIcon]}
            />
            <TextInput
              style={styles.inputWithIcon}
              placeholder="Email Address"
              placeholderTextColor="#4A90E2"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputContainer}>
            <Image 
              source={require("../assets/icons/phone.png")} 
              style={[styles.inputIcon, styles.userIcon]}
            />
            <TextInput
              style={styles.inputWithIcon}
              placeholder="Phone Number"
              placeholderTextColor="#4A90E2"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />
          </View>

          <View style={styles.inputContainer}>
            <Image 
              source={require("../assets/icons/location.png")} 
              style={[styles.inputIcon, styles.userIcon]}
            />
            <TextInput
              style={styles.inputWithIcon}
              placeholder="Address"
              placeholderTextColor="#4A90E2"
              value={address}
              onChangeText={setAddress}
            />
          </View>
        </>
      ) : (
        <>
          <View style={styles.inputContainer}>
            <Image 
              source={require("../assets/icons/hospital.png")} 
              style={[styles.inputIcon, styles.hospitalIcon]}
            />
            <TextInput
              style={styles.inputWithIcon}
              placeholder="Hospital Name"
              placeholderTextColor="#1E3A8A"
              value={name}
              onChangeText={setName}
            />
          </View>

          <View style={styles.inputContainer}>
            <Image 
              source={require("../assets/icons/hospital-id.png")} 
              style={[styles.inputIcon, styles.hospitalIcon]}
            />
            <TextInput
              style={styles.inputWithIcon}
              placeholder="Hospital ID"
              placeholderTextColor="#1E3A8A"
              value={hospitalId}
              onChangeText={setHospitalId}
            />
          </View>

          <View style={styles.inputContainer}>
            <Image 
              source={require("../assets/icons/email.png")} 
              style={[styles.inputIcon, styles.hospitalIcon]}
            />
            <TextInput
              style={styles.inputWithIcon}
              placeholder="Hospital Email"
              placeholderTextColor="#1E3A8A"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputContainer}>
            <Image 
              source={require("../assets/icons/location.png")} 
              style={[styles.inputIcon, styles.hospitalIcon]}
            />
            <TextInput
              style={styles.inputWithIcon}
              placeholder="Location"
              placeholderTextColor="#1E3A8A"
              value={location}
              onChangeText={setLocation}
            />
          </View>
        </>
      )}

      <View style={styles.inputContainer}>
        <Image 
          source={require("../assets/icons/lock.png")}
          style={[styles.inputIcon, userType === "hospital" ? styles.hospitalIcon : styles.userIcon]}
        />
        <TextInput
          style={styles.inputWithIcon}
          placeholder="Password"
          placeholderTextColor={userType === "hospital" ? "#1E3A8A" : "#4A90E2"}
          secureTextEntry={!isPasswordVisible}
          value={password}
          onChangeText={setPassword}
          autoCapitalize="none"
        />
        <TouchableOpacity onPress={() => setIsPasswordVisible(prev => !prev)}>
          <Image
            source={isPasswordVisible ? require("../assets/icons/eye.png") : require("../assets/icons/hidden.png")}
            style={[styles.eyeIcon, userType === "hospital" ? styles.hospitalIcon : styles.userIcon]}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.inputContainer}>
        <Image 
          source={require("../assets/icons/lock.png")}
          style={[styles.inputIcon, userType === "hospital" ? styles.hospitalIcon : styles.userIcon]}
        />
        <TextInput
          style={styles.inputWithIcon}
          placeholder="Confirm Password"
          placeholderTextColor={userType === "hospital" ? "#1E3A8A" : "#4A90E2"}
          secureTextEntry={!isConfirmPasswordVisible}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          autoCapitalize="none"
        />
        <TouchableOpacity onPress={() => setIsConfirmPasswordVisible(prev => !prev)}>
          <Image
            source={isConfirmPasswordVisible ? require("../assets/icons/eye.png") : require("../assets/icons/hidden.png")}
            style={[styles.eyeIcon, userType === "hospital" ? styles.hospitalIcon : styles.userIcon]}
          />
        </TouchableOpacity>
      </View>

      <TouchableOpacity 
        style={[
          styles.button,
          userType === "hospital" ? styles.hospitalButton : styles.userButton
        ]} 
        onPress={handleSignup}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Text style={styles.buttonText}>Sign Up</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.loginLink} 
        onPress={() => navigation.navigate("LoginScreen", { userType })}
      >
        <Text style={styles.loginLinkText}>Already have an account? Login</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#fff",
  },
  logo: {
    width: 200,
    height: 100,
    marginBottom: 20,
    marginTop: 40,
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
  heading: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
  },
  userHeading: {
    color: "#4A90E2",
  },
  hospitalHeading: {
    color: "#1E3A8A",
  },
  inputContainer: {
    width: "100%",
    height: 50,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 10,
    paddingHorizontal: 15,
    marginVertical: 8,
    backgroundColor: "#F3F4F6",
  },
  inputIcon: {
    width: 20,
    height: 20,
    marginRight: 10,
  },
  inputWithIcon: {
    flex: 1,
    height: "100%",
    fontSize: 16,
    color: "#333",
  },
  eyeIcon: {
    width: 24,
    height: 24,
  },
  hospitalIcon: {
    tintColor: "#1E3A8A",
  },
  userIcon: {
    tintColor: "#4A90E2",
  },
  button: {
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    width: "100%",
    marginTop: 20,
  },
  userButton: {
    backgroundColor: "#4A90E2",
  },
  hospitalButton: {
    backgroundColor: "#1E3A8A",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  loginLink: {
    marginTop: 15,
    marginBottom: 30,
  },
  loginLinkText: {
    color: "#1E3A8A",
  },
});

export default SignupScreen;
