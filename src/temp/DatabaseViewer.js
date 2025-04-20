import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import SQLite from 'react-native-sqlite-storage';

// Use callback API
SQLite.enablePromise(false);

const DatabaseViewer = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Open the database directly
      const db = SQLite.openDatabase(
        { name: 'vaxicare.db', location: 'default' },
        async () => {
          console.log("Database opened successfully for inspection");
          
          // Query users table
          db.transaction(tx => {
            tx.executeSql(
              "SELECT * FROM users",
              [],
              (_, result) => {
                const data = [];
                const len = result.rows.length;
                
                for (let i = 0; i < len; i++) {
                  const user = result.rows.item(i);
                  // Mask password for security
                  user.password = "********";
                  data.push(user);
                }
                
                setUsers(data);
                console.log(`Found ${data.length} users`);
                
                // Now query hospitals table
                tx.executeSql(
                  "SELECT * FROM hospitals",
                  [],
                  (_, hospResult) => {
                    const hospData = [];
                    const hospLen = hospResult.rows.length;
                    
                    for (let i = 0; i < hospLen; i++) {
                      hospData.push(hospResult.rows.item(i));
                    }
                    
                    setHospitals(hospData);
                    console.log(`Found ${hospData.length} hospitals`);
                    setLoading(false);
                  },
                  (_, hospError) => {
                    console.error("Error querying hospitals:", hospError);
                    setError("Failed to load hospitals: " + hospError.message);
                    setLoading(false);
                    return false;
                  }
                );
              },
              (_, userError) => {
                console.error("Error querying users:", userError);
                setError("Failed to load users: " + userError.message);
                setLoading(false);
                return false;
              }
            );
          });
        },
        error => {
          console.error("Error opening database:", error);
          setError("Failed to open database: " + error.message);
          setLoading(false);
        }
      );
    } catch (e) {
      console.error("Exception in database inspection:", e);
      setError("Exception in database inspection: " + e.message);
      setLoading(false);
    }
  };

  const clearSampleData = () => {
    setLoading(true);
    setError(null);
    
    try {
      // Open the database directly
      const db = SQLite.openDatabase(
        { name: 'vaxicare.db', location: 'default' },
        async () => {
          console.log("Database opened successfully for cleaning");
          
          // Delete sample hospitals
          db.transaction(tx => {
            tx.executeSql(
              "DELETE FROM hospitals WHERE name IN ('Sample Hospital', 'Nashik Civil Hospital', 'Nashik Apollo Hospital')",
              [],
              (_, result) => {
                console.log(`Deleted ${result.rowsAffected} sample hospitals`);
                
                // Now reload the data
                loadData();
              },
              (_, error) => {
                console.error("Error deleting sample hospitals:", error);
                setError("Failed to delete sample hospitals: " + error.message);
                setLoading(false);
                return false;
              }
            );
          });
        },
        error => {
          console.error("Error opening database for cleaning:", error);
          setError("Failed to open database: " + error.message);
          setLoading(false);
        }
      );
    } catch (e) {
      console.error("Exception in database cleaning:", e);
      setError("Exception in database cleaning: " + e.message);
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Database Contents</Text>
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.refreshButton} onPress={loadData}>
          <Text style={styles.buttonText}>Refresh Data</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteButton} onPress={clearSampleData}>
          <Text style={styles.buttonText}>Clear Sample Data</Text>
        </TouchableOpacity>
      </View>
      
      {loading ? (
        <ActivityIndicator size="large" color="#4A90E2" style={styles.loader} />
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <ScrollView style={styles.dataContainer}>
          <Text style={styles.sectionTitle}>Users ({users.length})</Text>
          {users.map((user, index) => (
            <View key={`user-${index}`} style={styles.dataItem}>
              <Text style={styles.dataLabel}>ID: {user.id}</Text>
              <Text style={styles.dataLabel}>Name: {user.name}</Text>
              <Text style={styles.dataLabel}>Email: {user.email}</Text>
              <Text style={styles.dataLabel}>Type: {user.userType}</Text>
              {user.address && <Text style={styles.dataLabel}>Address: {user.address}</Text>}
              {user.userType === 'hospital' && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>HOSPITAL ACCOUNT</Text>
                </View>
              )}
            </View>
          ))}

          <Text style={styles.sectionTitle}>Hospitals ({hospitals.length})</Text>
          {hospitals.map((hospital, index) => (
            <View key={`hospital-${index}`} style={styles.dataItem}>
              <Text style={styles.dataLabel}>ID: {hospital.id}</Text>
              <Text style={styles.dataLabel}>Name: {hospital.name}</Text>
              <Text style={styles.dataLabel}>Email: {hospital.email}</Text>
              <Text style={styles.dataLabel}>Location: {hospital.location}</Text>
              {hospital.type && <Text style={styles.dataLabel}>Type: {hospital.type}</Text>}
              {hospital.vaccines && <Text style={styles.dataLabel}>Vaccines: {hospital.vaccines}</Text>}
              {hospital.name.includes('Sample') || hospital.name.includes('Nashik Apollo') || hospital.name.includes('Nashik Civil') ? (
                <View style={[styles.badge, styles.warningBadge]}>
                  <Text style={styles.badgeText}>SAMPLE DATA</Text>
                </View>
              ) : (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>ACTUAL DATA</Text>
                </View>
              )}
            </View>
          ))}
        </ScrollView>
      )}
      
      <TouchableOpacity 
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.backButtonText}>Back</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#F5F9FF',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  refreshButton: {
    backgroundColor: '#4A90E2',
    padding: 10,
    borderRadius: 8,
    flex: 1,
    marginRight: 8,
    alignItems: 'center',
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
    padding: 10,
    borderRadius: 8,
    flex: 1,
    marginLeft: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  loader: {
    marginTop: 40,
  },
  errorContainer: {
    padding: 16,
    backgroundColor: '#FFE6E6',
    borderRadius: 8,
    marginVertical: 16,
  },
  errorText: {
    color: '#D00000',
  },
  dataContainer: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
    color: '#4A90E2',
  },
  dataItem: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  dataLabel: {
    fontSize: 14,
    marginBottom: 4,
    color: '#333',
  },
  badge: {
    backgroundColor: '#4A90E2',
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    marginTop: 4,
  },
  warningBadge: {
    backgroundColor: '#FF9500',
  },
  badgeText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
  backButton: {
    marginTop: 16,
    backgroundColor: '#333',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  backButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

export default DatabaseViewer; 