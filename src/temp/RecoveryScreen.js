import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { recoverDatabase, purgeSampleHospitals } from '../services/dataService';

const RecoveryScreen = ({ navigation }) => {
  const [isRecovering, setIsRecovering] = useState(false);
  const [isPurging, setIsPurging] = useState(false);
  const [logs, setLogs] = useState([]);

  const addLog = (message) => {
    setLogs(prevLogs => [...prevLogs, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const handleResetDatabase = async () => {
    try {
      setIsRecovering(true);
      setLogs([]);
      
      addLog("Starting database reset...");
      
      // Clear AsyncStorage DB initialization flag
      await AsyncStorage.removeItem('vaxicare_db_initialized');
      addLog("Cleared database initialization flag");
      
      // Run recovery
      addLog("Running database recovery...");
      const success = await recoverDatabase();
      
      if (success) {
        addLog("Database reset successful!");
        Alert.alert(
          'Success',
          'Database has been reset and reinitialized with fresh data. Please login again.',
          [{ text: 'OK', onPress: () => navigation.replace('LoginScreen') }]
        );
      } else {
        addLog("Database reset failed!");
        Alert.alert('Error', 'Failed to reset database.');
      }
    } catch (error) {
      console.error('Error resetting database:', error);
      addLog(`Error: ${error.message}`);
      Alert.alert('Error', 'An unexpected error occurred.');
    } finally {
      setIsRecovering(false);
    }
  };

  const handlePurgeSampleHospitals = async () => {
    try {
      setIsPurging(true);
      setLogs([]);
      
      addLog("Starting sample hospital purge...");
      
      // Run the purge function
      const success = await purgeSampleHospitals();
      
      if (success) {
        addLog("Sample hospitals purged successfully!");
        Alert.alert(
          'Success',
          'All sample hospitals have been removed from the database.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        addLog("Sample hospital purge failed!");
        Alert.alert('Error', 'Failed to purge sample hospitals.');
      }
    } catch (error) {
      console.error('Error purging sample hospitals:', error);
      addLog(`Error: ${error.message}`);
      Alert.alert('Error', 'An unexpected error occurred.');
    } finally {
      setIsPurging(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Database Management</Text>
      <Text style={styles.description}>
        Use these options to manage your app database. You can reset the entire 
        database or purge only sample data.
      </Text>
      
      <View style={styles.buttonGroup}>
        <TouchableOpacity
          style={styles.resetButton}
          onPress={handleResetDatabase}
          disabled={isRecovering || isPurging}
        >
          <Text style={styles.resetButtonText}>
            {isRecovering ? 'Resetting...' : 'Reset Entire Database'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.purgeButton}
          onPress={handlePurgeSampleHospitals}
          disabled={isRecovering || isPurging}
        >
          <Text style={styles.purgeButtonText}>
            {isPurging ? 'Purging...' : 'Remove Sample Hospitals Only'}
          </Text>
        </TouchableOpacity>
      </View>
      
      {logs.length > 0 && (
        <View style={styles.logsContainer}>
          <Text style={styles.logsTitle}>Operation Logs</Text>
          <ScrollView style={styles.logsList}>
            {logs.map((log, index) => (
              <Text key={index} style={styles.logItem}>{log}</Text>
            ))}
          </ScrollView>
        </View>
      )}
      
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
        disabled={isRecovering || isPurging}
      >
        <Text style={styles.backButtonText}>Back</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    color: '#666',
  },
  buttonGroup: {
    width: '100%',
    marginBottom: 20,
  },
  resetButton: {
    backgroundColor: '#FF3B30',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
    marginBottom: 15,
    width: '100%',
    alignItems: 'center',
  },
  resetButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  purgeButton: {
    backgroundColor: '#FF9500',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
    marginBottom: 15,
    width: '100%',
    alignItems: 'center',
  },
  purgeButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  backButton: {
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    marginTop: 10,
  },
  backButtonText: {
    color: '#666',
    fontSize: 18,
  },
  logsContainer: {
    width: '100%',
    backgroundColor: '#333',
    borderRadius: 10,
    padding: 10,
    marginBottom: 20,
    maxHeight: 200,
  },
  logsTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  logsList: {
    maxHeight: 150,
  },
  logItem: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 2,
  },
});

export default RecoveryScreen; 