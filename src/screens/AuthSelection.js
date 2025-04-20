import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Image } from "react-native";
import { useNavigation } from "@react-navigation/native";

const AuthSelection = () => {
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      <Image source={require("../assets/Vaxilogo.png")} style={styles.logo} />
      <Text style={styles.heading}>Welcome to VaxiCare</Text>
      <Text style={styles.subText}>Choose your role to continue</Text>

      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate("LoginScreen", { userType: "hospital" })}
      >
        <View style={styles.buttonContent}>
          <Text style={styles.buttonText}>Login as Hospital</Text>
          <Image source={require("../assets/icons/hospital.png")} style={styles.icon} />
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.userButton]}
        onPress={() => navigation.navigate("LoginScreen", { userType: "user" })}
      >
        <View style={styles.buttonContent}>
          <Text style={styles.buttonText}>Login as User</Text>
          <Image source={require("../assets/icons/user.png")} style={styles.icon} />
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#fff" },
  logo: { width: 200, height: 200, marginBottom: 20 },
  heading: { fontSize: 24, fontWeight: "bold", marginBottom: 10, color: "#1E3A8A" },
  subText: { fontSize: 16, color: "#6B7280", marginBottom: 30 },
  button: {
    backgroundColor: "#1E3A8A",
    paddingVertical: 15,
    width: "80%",
    borderRadius: 10,
    marginVertical: 10,
  },
  userButton: { backgroundColor: "#4A90E2" },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: { 
    color: "#fff", 
    fontSize: 18, 
    fontWeight: "bold", 
    textAlign: "center", 
    flexShrink: 1, 
  },
  icon: { 
    width: 24, 
    height: 24, 
    tintColor: "#fff", 
    marginLeft: 10, // Adjust spacing between text and icon
  },
});

export default AuthSelection;
