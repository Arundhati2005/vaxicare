import React, { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import AuthSelection from "./src/screens/AuthSelection";
import LoginScreen from "./src/screens/LoginScreen";
import SignupScreen from "./src/screens/SignupScreen";
import UserHomeScreen from "./src/screens/HomeScreenUser";
import HospitalHomeScreen from "./src/screens/HomeScreenHospital";
import VaccineInfoHub from "./src/screens/VaccineInfoHub";
import RecoveryScreen from "./src/temp/RecoveryScreen";
import DatabaseViewer from "./src/temp/DatabaseViewer";
import { AuthProvider } from "./src/providers/AuthProvider";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeDataService, recoverDatabase } from "./src/services/dataService";
import { View, Text, ActivityIndicator, StyleSheet, TouchableOpacity } from "react-native";
// @ts-ignore
import SQLite from 'react-native-sqlite-storage';
import VaccineAssistantScreen from "./src/screens/VaccineAssistantScreen";
import CertificatesScreen from "./src/screens/CertificatesScreen";

// Make sure AsyncStorage is available
const checkStorage = async () => {
  try {
    await AsyncStorage.setItem('test_key', 'test_value');
    const value = await AsyncStorage.getItem('test_key');
    console.log('AsyncStorage is working:', value === 'test_value');
    await AsyncStorage.removeItem('test_key');
  } catch (error) {
    console.error('AsyncStorage error:', error);
  }
};

// Call it early
checkStorage();

const Stack = createNativeStackNavigator();

// Simple Navigation component
const Navigation = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="AuthSelection">
        <Stack.Screen name="AuthSelection" component={AuthSelection} options={{ headerShown: false }} />
        <Stack.Screen name="LoginScreen" component={LoginScreen} />
        <Stack.Screen name="SignupScreen" component={SignupScreen} />
        <Stack.Screen name="HomeScreenUser" component={UserHomeScreen} options={{ headerShown: false }} />
        <Stack.Screen name="HomeScreenHospital" component={HospitalHomeScreen} options={{ headerShown: false }} />
        <Stack.Screen name="VaccineInfoHub" component={VaccineInfoHub} options={{ headerShown: false }} />
        <Stack.Screen name="RecoveryScreen" component={RecoveryScreen} options={{ 
          title: "Database Recovery",
          headerShown: true
        }} />
        <Stack.Screen name="DatabaseViewer" component={DatabaseViewer} options={{ 
          title: "Database Contents",
          headerShown: true
        }} />
        <Stack.Screen name="VaccineAssistant" component={VaccineAssistantScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Certificates" component={CertificatesScreen} options={{ headerShown: false }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

// Main App component
const App = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [dbInitialized, setDbInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [recoveringDatabase, setRecoveringDatabase] = useState(false);

  const initApp = async () => {
    try {
      console.log("Initializing database...");
      
      // Clear any previous errors
      setError(null);
      setIsLoading(true);
      
      // Make sure SQLite is using callback API
      SQLite.enablePromise(false);
      
      // Initialize SQLite database
      const initialized = await initializeDataService();
      setDbInitialized(initialized);
      
      if (!initialized) {
        setError("Database initialization failed. Please try again or check the logs for more details.");
      }
    } catch (err: any) {
      console.error("Database initialization error:", err);
      setError(err?.message || "Unknown database error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Initialize the app
    initApp();
  }, [retryCount]);

  const handleRetry = () => {
    setRetryCount(prevCount => prevCount + 1);
  };

  const handleRecoverDatabase = async () => {
    try {
      setRecoveringDatabase(true);
      const recovered = await recoverDatabase();
      if (recovered) {
        setDbInitialized(true);
        setError(null);
      } else {
        setError("Database recovery failed. Please restart the app.");
      }
    } catch (err: any) {
      setError(`Recovery error: ${err?.message || "Unknown error"}`);
    } finally {
      setRecoveringDatabase(false);
    }
  };

  const handleContinueWithoutDatabase = () => {
    setDbInitialized(true);
    setError(null);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1E3A8A" />
        <Text style={styles.loadingText}>Initializing database...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Database Error</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        
        <View style={styles.errorActions}>
          {recoveringDatabase ? (
            <View style={styles.loadingButtonContainer}>
              <ActivityIndicator size="small" color="#FFFFFF" />
              <Text style={styles.loadingButtonText}>Recovering Database...</Text>
            </View>
          ) : (
            <TouchableOpacity 
              style={styles.recoveryButton} 
              onPress={handleRecoverDatabase}
              disabled={recoveringDatabase}
            >
              <Text style={styles.buttonText}>Recover Database</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
            <Text style={styles.buttonText}>Retry Initialization</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.continueButton} onPress={handleContinueWithoutDatabase}>
            <Text style={styles.buttonText}>Continue Anyway</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <AuthProvider>
      <Navigation />
    </AuthProvider>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F9FF',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#1E3A8A',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FEE2E2',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#DC2626',
    marginBottom: 10,
  },
  errorMessage: {
    color: '#7F1D1D',
    textAlign: 'center',
    marginBottom: 20,
  },
  errorActions: {
    flexDirection: 'column',
    marginTop: 20,
    alignItems: 'center',
  },
  retryButton: {
    backgroundColor: '#1E3A8A',
    padding: 15,
    borderRadius: 8,
    width: 200,
    alignItems: 'center',
    marginBottom: 10,
  },
  recoveryButton: {
    backgroundColor: '#059669',
    padding: 15,
    borderRadius: 8,
    width: 200,
    alignItems: 'center',
    marginBottom: 10,
  },
  continueButton: {
    backgroundColor: '#4A5568',
    padding: 15,
    borderRadius: 8,
    width: 200,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingButtonContainer: {
    backgroundColor: '#059669',
    padding: 15,
    borderRadius: 8,
    width: 200,
    alignItems: 'center',
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  loadingButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
});

export default App;
