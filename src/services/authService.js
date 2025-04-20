import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUserByEmail, getHospitalByEmail, insertUser, insertHospital, authenticateUser } from './databaseService';

// Current user storage key
const CURRENT_USER_KEY = 'vaxicare_current_user';

// Store the current user in memory for easier access
let currentUser = null;

// Register new user (redirect to dataService)
export const registerUser = async (userData) => {
  try {
    const { userType, email } = userData;
    
    // Check in the appropriate table based on userType
    let existingUser = null;
    if (userType === 'hospital') {
      console.log('Checking if hospital email exists:', email);
      existingUser = await getHospitalByEmail(email);
    } else {
      console.log('Checking if user email exists:', email);
      existingUser = await getUserByEmail(email);
    }
    
    if (existingUser) {
      throw new Error('Email already registered');
    }

    // Add created timestamp
    const dataWithTimestamp = {
      ...userData,
      createdAt: new Date().toISOString()
    };

    let createdUser;
    
    // Insert into the correct table based on userType
    if (userType === 'hospital') {
      console.log('Registering new hospital:', userData.name);
      createdUser = await insertHospital(dataWithTimestamp);
    } else {
      console.log('Registering new user:', userData.name);
      createdUser = await insertUser(dataWithTimestamp);
    }
    
    // Remove password before storing
    const { password, ...userWithoutPassword } = createdUser;
    
    // Store user info in AsyncStorage
    await AsyncStorage.setItem(CURRENT_USER_KEY, JSON.stringify(userWithoutPassword));
    
    // Set current user
    currentUser = userWithoutPassword;
    
    console.log(`Successfully registered ${userType}:`, userWithoutPassword);
    
    return userWithoutPassword;
  } catch (error) {
    console.error('Registration error:', error);
    throw error;
  }
};

// Login existing user
export const loginUser = async (email, password, userType = 'user') => {
  try {
    // Authenticate user with SQLite
    let userWithoutPassword = await authenticateUser(email, password, userType);
    
    // If not found in requested table, try the other table
    if (!userWithoutPassword && userType === 'user') {
      userWithoutPassword = await authenticateUser(email, password, 'hospital');
    } else if (!userWithoutPassword && userType === 'hospital') {
      userWithoutPassword = await authenticateUser(email, password, 'user');
    }
    
    if (!userWithoutPassword) {
      throw new Error('Invalid email or password');
    }
    
    // Set current user
    currentUser = userWithoutPassword;
    
    // Store login state in AsyncStorage
    await AsyncStorage.setItem(CURRENT_USER_KEY, JSON.stringify(userWithoutPassword));
    
    return userWithoutPassword;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};

// Logout user
export const logoutUser = async () => {
  try {
    // Remove from memory
    currentUser = null;
    
    // Remove from AsyncStorage
    await AsyncStorage.removeItem(CURRENT_USER_KEY);
    
    return true;
  } catch (error) {
    console.error('Logout error:', error);
    throw error;
  }
};

// Reset password (simplified mock implementation)
export const resetPassword = async (email) => {
  try {
    // Check if user exists
    const user = await getUserByEmail(email);
    if (!user) {
      throw new Error('Email not found');
    }
    
    // Just a mock implementation that always succeeds
    console.log(`Password reset email would be sent to: ${email}`);
    return true;
  } catch (error) {
    console.error("Reset password error:", error);
    throw error;
  }
};

// Get current user
export const getCurrentUser = async () => {
  try {
    // If we have a current user in memory, return it
    if (currentUser) {
      return currentUser;
    }
    
    // Otherwise try to get from AsyncStorage
    const userJson = await AsyncStorage.getItem(CURRENT_USER_KEY);
    if (!userJson) {
      return null;
    }
    
    const userData = JSON.parse(userJson);
    
    // Set in memory for next time
    currentUser = userData;
    
    return userData;
  } catch (error) {
    console.error('Get current user error:', error);
    return null;
  }
};

// Subscribe to auth state changes (simplified mock implementation)
export const subscribeToAuthChanges = (callback) => {
  try {
    // Call once immediately with current user
    getCurrentUser().then(user => {
      callback(user);
    });
    
    // In a real implementation we would set up listeners
    // Since we're using AsyncStorage, we can't really listen for changes
    // So we just return an empty unsubscribe function
    return () => {}; 
  } catch (error) {
    console.error("Auth subscription error:", error);
    callback(null);
    return () => {};
  }
}; 