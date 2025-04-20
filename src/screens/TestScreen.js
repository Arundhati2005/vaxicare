import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { initializeDataService, loginUser, recoverDatabase } from '../services/dataService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SQLite from 'react-native-sqlite-storage';

const TestScreen = ({ navigation }) => {
  const [status, setStatus] = useState({
    dataService: false,
    sqliteMode: '',
    users: [],
    error: null,
    loading: true,
    recovering: false
  });

  useEffect(() => {
    // Test data service
    const testConnection = async () => {
      try {
        console.log('TestScreen - Testing data service');
        
        // Get SQLite mode (promises vs callbacks)
        const sqliteMode = SQLite.enablePromise ? 'Promise API' : 'Callback API';
        console.log(`SQLite is using: ${sqliteMode}`);
        
        // Initialize data service
        let dataServiceOk = false;
        try {
          dataServiceOk = await initializeDataService();
          console.log('Data service initialized:', dataServiceOk);
        } catch (err) {
          console.error('Data service initialization failed:', err);
        }
        
        // Get stored users
        let users = [];
        try {
          const usersJson = await AsyncStorage.getItem('vaxicare_local_users');
          if (usersJson) {
            const allUsers = JSON.parse(usersJson);
            // Remove passwords for display
            users = allUsers.map(user => {
              const { password, ...userWithoutPassword } = user;
              return userWithoutPassword;
            });
          }
          console.log(`Found ${users.length} local users`);
        } catch (err) {
          console.error('Error fetching local users:', err);
        }
        
        setStatus({
          dataService: dataServiceOk,
          sqliteMode,
          users,
          error: null,
          loading: false,
          recovering: false
        });
      } catch (error) {
        console.error('TestScreen - Error:', error);
        setStatus(prev => ({
          ...prev,
          error: error.message,
          loading: false,
          recovering: false
        }));
      }
    };
    
    testConnection();
  }, []);

  const goToAuth = () => {
    navigation.navigate('AuthSelection');
  };
  
  const testSampleLogin = async () => {
    try {
      setStatus(prev => ({ ...prev, loading: true }));
      
      // Try to login with a sample user
      const user = await loginUser('user@example.com', 'password123');
      
      if (user) {
        Alert.alert(
          'Login Test Successful',
          `Logged in as: ${user.name} (${user.userType})`,
          [
            { text: 'Go to Home', onPress: () => {
              if (user.userType === 'hospital') {
                navigation.navigate('HomeScreenHospital');
              } else {
                navigation.navigate('HomeScreenUser');
              }
            }},
            { text: 'Stay Here', onPress: () => setStatus(prev => ({ ...prev, loading: false })) }
          ]
        );
      } else {
        setStatus(prev => ({ ...prev, loading: false }));
        Alert.alert('Login Test Failed', 'No user returned');
      }
    } catch (error) {
      console.error('Test login error:', error);
      setStatus(prev => ({ ...prev, loading: false }));
      Alert.alert('Login Test Error', error.message);
    }
  };
  
  const testHospitalLogin = async () => {
    try {
      setStatus(prev => ({ ...prev, loading: true }));
      
      // Try to login with a sample hospital
      const user = await loginUser('hospital@example.com', 'hospital123');
      
      if (user) {
        Alert.alert(
          'Login Test Successful',
          `Logged in as: ${user.name} (${user.userType})`,
          [
            { text: 'Go to Home', onPress: () => {
              if (user.userType === 'hospital') {
                navigation.navigate('HomeScreenHospital');
              } else {
                navigation.navigate('HomeScreenUser');
              }
            }},
            { text: 'Stay Here', onPress: () => setStatus(prev => ({ ...prev, loading: false })) }
          ]
        );
      } else {
        setStatus(prev => ({ ...prev, loading: false }));
        Alert.alert('Login Test Failed', 'No user returned');
      }
    } catch (error) {
      console.error('Test login error:', error);
      setStatus(prev => ({ ...prev, loading: false }));
      Alert.alert('Login Test Error', error.message);
    }
  };
  
  const handleRecoverDatabase = async () => {
    try {
      setStatus(prev => ({ ...prev, recovering: true }));
      const recovered = await recoverDatabase();
      
      if (recovered) {
        Alert.alert(
          'Database Recovery',
          'Database recovery was successful. The app should work properly now.',
          [{ text: 'OK' }]
        );
        
        // Refresh the status
        setStatus(prev => ({
          ...prev,
          dataService: true,
          error: null,
          recovering: false
        }));
      } else {
        Alert.alert(
          'Database Recovery Failed',
          'Could not recover the database. You can still use the app with limited functionality.',
          [{ text: 'OK' }]
        );
        setStatus(prev => ({ ...prev, recovering: false }));
      }
    } catch (error) {
      console.error('Database recovery error:', error);
      setStatus(prev => ({ ...prev, recovering: false }));
      Alert.alert('Recovery Error', error.message);
    }
  };

  if (status.loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles.loadingText}>Testing Data Service...</Text>
      </View>
    );
  }
  
  if (status.recovering) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles.loadingText}>Recovering Database...</Text>
        <Text style={styles.subLoadingText}>This may take a few moments</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>VAXICARE Test Screen</Text>
      
      <View style={styles.card}>
        <Text style={styles.cardTitle}>App Status</Text>
        
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Data Service:</Text>
          <Text style={status.dataService ? styles.statusSuccess : styles.statusFail}>
            {status.dataService ? 'Initialized ✅' : 'Not Initialized ❌'}
          </Text>
        </View>
        
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>SQLite Mode:</Text>
          <Text style={styles.statusInfo}>
            {status.sqliteMode || 'Unknown'}
          </Text>
        </View>
        
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Sample Users:</Text>
          <Text style={status.users.length > 0 ? styles.statusSuccess : styles.statusFail}>
            {status.users.length > 0 ? `${status.users.length} Found ✅` : 'None Found ❌'}
          </Text>
        </View>
        
        {status.error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorTitle}>Error Detected:</Text>
            <Text style={styles.errorText}>{status.error}</Text>
            
            <TouchableOpacity 
              style={styles.recoveryButton} 
              onPress={handleRecoverDatabase}
            >
              <Text style={styles.recoveryButtonText}>Attempt Recovery</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
      
      {status.users.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sample Users</Text>
          {status.users.map(user => (
            <View key={user.id} style={styles.userCard}>
              <Text style={styles.userName}>{user.name}</Text>
              <Text style={styles.userEmail}>{user.email}</Text>
              <Text style={styles.userType}>
                Type: <Text style={styles.highlight}>{user.userType}</Text>
              </Text>
            </View>
          ))}
        </View>
      )}
      
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Login Testing</Text>
        <Text style={styles.helpText}>
          You can use these sample accounts to log in:{'\n'}
          • User: <Text style={styles.highlight}>user@example.com</Text> / <Text style={styles.highlight}>password123</Text>{'\n'}
          • Hospital: <Text style={styles.highlight}>hospital@example.com</Text> / <Text style={styles.highlight}>hospital123</Text>
        </Text>
        
        <View style={styles.buttonRow}>
          <TouchableOpacity 
            style={[styles.halfButton, styles.userButton]} 
            onPress={testSampleLogin}
          >
            <Text style={styles.buttonText}>
              Test User Login
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.halfButton, styles.hospitalButton]} 
            onPress={testHospitalLogin}
          >
            <Text style={styles.buttonText}>
              Test Hospital Login
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={styles.button} 
          onPress={goToAuth}
        >
          <Text style={styles.buttonText}>
            Go to Authentication Screen
          </Text>
        </TouchableOpacity>
        
        {!status.dataService && (
          <TouchableOpacity 
            style={[styles.button, styles.recoverButton]} 
            onPress={handleRecoverDatabase}
          >
            <Text style={styles.buttonText}>
              Recover Database
            </Text>
          </TouchableOpacity>
        )}
      </View>
      
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Notice:</Text>
        <Text style={styles.infoText}>
          The app is using hybrid storage (SQLite with AsyncStorage fallback).
          {!status.dataService && ' Currently in fallback mode due to database issues.'}
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: '#F5F9FF',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#4A90E2',
  },
  subLoadingText: {
    marginTop: 5,
    fontSize: 14,
    color: '#718096',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E3A8A',
    marginBottom: 20,
    textAlign: 'center',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#1E3A8A',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  statusLabel: {
    fontSize: 16,
    color: '#4B5563',
  },
  statusSuccess: {
    color: '#059669',
    fontWeight: '500',
  },
  statusFail: {
    color: '#DC2626',
    fontWeight: '500',
  },
  statusInfo: {
    color: '#4A90E2',
    fontWeight: '500',
  },
  helpText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#4B5563',
    marginBottom: 15,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfButton: {
    flex: 0.48,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  userButton: {
    backgroundColor: '#059669',
  },
  hospitalButton: {
    backgroundColor: '#3B82F6',
  },
  errorContainer: {
    marginTop: 15,
    padding: 10,
    backgroundColor: '#FEF2F2',
    borderRadius: 5,
    borderLeftWidth: 4,
    borderLeftColor: '#DC2626',
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#B91C1C',
    marginBottom: 5,
  },
  errorText: {
    color: '#7F1D1D',
    fontSize: 14,
  },
  recoveryButton: {
    backgroundColor: '#1E3A8A',
    borderRadius: 5,
    padding: 8,
    marginTop: 10,
    alignSelf: 'flex-start',
  },
  recoveryButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  userCard: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    marginBottom: 10,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  userEmail: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 5,
  },
  userType: {
    fontSize: 14,
    color: '#4B5563',
  },
  highlight: {
    color: '#4A90E2',
    fontWeight: '500',
  },
  buttonContainer: {
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#1E3A8A',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  testButton: {
    backgroundColor: '#059669',
  },
  recoverButton: {
    backgroundColor: '#D97706',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  infoCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E40AF',
    marginBottom: 5,
  },
  infoText: {
    color: '#1E3A8A',
    fontSize: 14,
  },
});

export default TestScreen; 