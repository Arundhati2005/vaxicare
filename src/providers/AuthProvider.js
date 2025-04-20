import React, { createContext, useContext, useState, useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { getCurrentUser } from '../services/authService';
import { initializeDataService } from '../services/dataService';

// Create Auth context
const AuthContext = createContext({
  user: null,
  loading: true,
  setUser: () => {},
});

// Custom hook to use Auth context
export const useAuth = () => {
  return useContext(AuthContext);
};

// Auth Provider component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize database and check for logged in user
  useEffect(() => {
    const initialize = async () => {
      try {
        console.log('Initializing database from AuthProvider');
        
        // Initialize SQLite database
        await initializeDataService();
        
        // Check if user is already logged in
        const currentUser = await getCurrentUser();
        setUser(currentUser);
        
        console.log('Auth state initialized:', currentUser ? 'user logged in' : 'no user');
      } catch (err) {
        console.error('AuthProvider setup error:', err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };
    
    initialize();
  }, []);

  // Show loading indicator while initializing
  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles.text}>Initializing...</Text>
      </View>
    );
  }

  // Show error if initialization failed
  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Error</Text>
        <Text style={styles.errorMessage}>{error.message || 'Unknown error'}</Text>
      </View>
    );
  }

  // Provide Auth context
  return (
    <AuthContext.Provider value={{ user, setUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F9FF',
  },
  text: {
    marginTop: 10,
    fontSize: 16,
    color: '#4A90E2',
  },
  errorText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#DC2626',
    marginBottom: 10,
  },
  errorMessage: {
    color: '#7F1D1D',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
}); 