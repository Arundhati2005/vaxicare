import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCurrentUser } from './authService';
import { 
  initDatabase, 
  insertUser, 
  authenticateUser,
  getAllUsers,
  getUserByEmail,
  getHospitalByEmail,
  getAllHospitals,
  getHospitalsByLocation,
  addFamilyMember,
  getFamilyMembersByUserId,
  createAppointment,
  getAppointmentsByUserId,
  closeDatabase,
  registerUser as dbRegisterUser,
  insertHospital,
  purgeAllData,
  insertTestHospitals,
  migrateHospitals,
  recreateHospitalsTable,
  addVaccineToInventory,
  getHospitalVaccineInventory,
  removeVaccineFromInventory,
  getAvailableVaccines,
  updateAppointmentStatus,
  createWalkInAppointment,
  cancelAppointment
} from './databaseService';
import SQLite from 'react-native-sqlite-storage';

// Local storage keys
const CURRENT_USER_KEY = 'vaxicare_current_user';
const DB_INITIALIZED_KEY = 'vaxicare_db_initialized';

// Database initialized flag
let isDatabaseInitialized = false;

// Initialize data service
export const initializeDataService = async () => {
  try {
    console.log('Initializing data service...');
    
    // Check if database is already initialized
    const dbInitialized = await AsyncStorage.getItem(DB_INITIALIZED_KEY);
    
    if (dbInitialized !== 'true') {
      console.log('First time initialization');
      
      // Initialize database
      await initDatabase();
      
      // Mark as initialized
      await AsyncStorage.setItem(DB_INITIALIZED_KEY, 'true');
    } else {
      console.log('Database already initialized, just connecting');
      await initDatabase();
    }
    
    isDatabaseInitialized = true;
    console.log('Data service initialized successfully');
    return true;
  } catch (error) {
    console.error('Error initializing data service:', error);
    isDatabaseInitialized = false;
    return false;
  }
};

// Login user using SQLite database
export const loginUser = async (email, password, userType = 'user') => {
  try {
    console.log(`Attempting to login with email: ${email}, userType: ${userType}`);
    
    if (!email || !password) {
      throw new Error('Email and password are required');
    }
    
    // Authenticate with SQLite using the correct function
    let user = await authenticateUser(email, password, userType);
    
    // If not found with requested userType, try the other type
    if (!user && userType === 'user') {
      console.log('Not found as user, trying as hospital');
      user = await authenticateUser(email, password, 'hospital');
    } else if (!user && userType === 'hospital') {
      console.log('Not found as hospital, trying as user');
      user = await authenticateUser(email, password, 'user');
    }
    
    if (!user) {
      throw new Error('Invalid email or password');
    }
    
    // Store current user in AsyncStorage
    await AsyncStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    
    console.log(`Logged in as ${user.name}`);
    return user;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};

// Register user
export const registerUser = async (userData) => {
  try {
    const { email, password, name, userType, ...otherData } = userData;
    
    if (!email || !password || !name || !userType) {
      throw new Error('Missing required fields');
    }
    
    // Check if email already exists in the appropriate database
    let existingUser = null;
    
    if (userType === 'hospital') {
      existingUser = await getHospitalByEmail(email);
    } else {
      existingUser = await getUserByEmail(email);
    }
    
    if (existingUser) {
      throw new Error(`A ${userType} with this email already exists`);
    }
    
    // Register in the correct database
    const newUser = await dbRegisterUser({
      email: email.toLowerCase(),
      password,
      name,
      userType,
      ...otherData,
      createdAt: new Date().toISOString()
    });
    
    // Return user without password
    const { password: _, ...userWithoutPassword } = newUser;
    
    console.log(`Registered new ${userType}: ${name}`);
    return userWithoutPassword;
  } catch (error) {
    console.error('Registration error:', error);
    throw error;
  }
};

// Logout user
export const logoutUser = async () => {
  try {
    await AsyncStorage.removeItem(CURRENT_USER_KEY);
    console.log('User logged out');
    return true;
  } catch (error) {
    console.error('Logout error:', error);
    throw error;
  }
};

// Get all hospitals
export const getAllHospitalsData = async () => {
  try {
    const hospitals = await getAllHospitals();
    console.log(`Found ${hospitals.length} total hospitals`);
    return hospitals;
  } catch (error) {
    console.error('Error getting hospitals:', error);
    return [];
  }
};

// Get hospitals by location search
export const getHospitalsByLocationSearch = async (location) => {
  try {
    console.log(`Searching for hospitals with location: "${location}"`);
    
    const hospitals = await getHospitalsByLocation(location);
    
    console.log(`Found ${hospitals.length} hospitals matching search: ${location}`);
    
    // For debugging, log what we found
    if (hospitals.length > 0) {
      console.log("Hospitals found:");
      hospitals.forEach((h, i) => {
        console.log(`${i+1}. ${h.name} - Location: ${h.location || 'No location'}`);
      });
    } else {
      console.log(`No hospitals found matching: "${location}"`);
    }
    
    return hospitals;
  } catch (error) {
    console.error('Error getting hospitals by location:', error);
    return [];
  }
};

// Add family member
export const addFamilyMemberData = async (familyMemberData) => {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    const familyMember = await addFamilyMember(familyMemberData, user.id);
    return familyMember;
  } catch (error) {
    console.error('Error adding family member:', error);
    throw error;
  }
};

// Get family members
export const getFamilyMembersData = async () => {
  try {
    console.log('Getting family members for current user...');
    const user = await getCurrentUser();
    if (!user) {
      console.log('No user found, cannot get family members');
      return [];
    }
    
    console.log(`Getting family members for user ID: ${user.id}`);
    const familyMembers = await getFamilyMembersByUserId(user.id);
    console.log(`Found ${familyMembers.length} family members`);
    return familyMembers;
  } catch (error) {
    console.error('Error getting family members:', error);
    return [];
  }
};

// Export for compatibility with existing code
export const getFamilyMembers = getFamilyMembersData;

// Create appointment
export const createAppointmentData = async (appointmentData) => {
  try {
    console.log('Creating new appointment...');
    console.log('Appointment data:', JSON.stringify(appointmentData));
    
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    // Get the hospital ID from the data
    const hospitalId = appointmentData.hospitalId || appointmentData.hospital?.id;
    
    if (!hospitalId) {
      throw new Error('Hospital ID is required for appointment');
    }
    
    // Create appointment object
    const appointment = {
      ...appointmentData,
      userId: user.id,
      hospitalId: hospitalId,
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    
    console.log(`Creating appointment with hospital ID: ${appointment.hospitalId}`);
    const createdAppointment = await createAppointment(appointment);
    console.log('Appointment created successfully with ID:', createdAppointment.id);
    return createdAppointment;
  } catch (error) {
    console.error('Error creating appointment:', error);
    throw error;
  }
};

// Get user appointments
export const getUserAppointmentsData = async () => {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return [];
    }
    
    const appointments = await getAppointmentsByUserId(user.id);
    return appointments;
  } catch (error) {
    console.error('Error getting user appointments:', error);
    return [];
  }
};

// Purge all data but maintain the database structure
export const purgeAllDataAndReset = async () => {
  try {
    console.log('Starting complete data purge...');
    
    // Ensure database is initialized
    if (!isDatabaseInitialized) {
      console.log('Database not initialized, initializing first...');
      await initializeDataService();
    }
    
    // Delete all data from all tables but keep the structure
    await purgeAllData();
    
    // Reset the DB initialization flag to avoid auto-seeding sample data
    await AsyncStorage.setItem(DB_INITIALIZED_KEY, 'true');
    
    console.log('Database successfully reset. All data deleted but structure preserved.');
    return true;
  } catch (error) {
    console.error('Error purging data:', error);
    return false;
  }
};

// Insert test hospitals data for debugging
export const insertTestHospitalsData = async () => {
  try {
    console.log('Adding test hospitals for debugging...');
    
    // Ensure database is initialized
    if (!isDatabaseInitialized) {
      console.log('Database not initialized, initializing first...');
      await initializeDataService();
    }
    
    // Insert test hospitals
    const result = await insertTestHospitals();
    console.log(`Test hospitals added: ${result}`);
    
    return result;
  } catch (error) {
    console.error('Error adding test hospitals:', error);
    throw error;
  }
};

// Get all users
export const getAllUsersData = async () => {
  try {
    console.log('Getting all users from database...');
    
    // Ensure database is initialized
    if (!isDatabaseInitialized) {
      console.log('Database not initialized, initializing first...');
      await initializeDataService();
    }
    
    // Get all users
    const users = await getAllUsers();
    console.log(`Found ${users.length} users in database`);
    
    return users;
  } catch (error) {
    console.error('Error getting all users:', error);
    return [];
  }
};

// Add a function to migrate hospitals from users table to hospitals table
export const migrateHospitalsFromUsersTable = async () => {
  try {
    console.log('Starting hospital migration from users table to hospitals table...');
    
    // Ensure database is initialized
    if (!isDatabaseInitialized) {
      console.log('Database not initialized, initializing first...');
      await initializeDataService();
    }
    
    // Create a function in the database service to handle the migration
    const migrated = await migrateHospitals();
    
    console.log(`Migration complete: ${migrated} hospitals migrated from users to hospitals table`);
    return migrated;
  } catch (error) {
    console.error('Error migrating hospitals:', error);
    return 0;
  }
};

// Add this new function to access the recreate hospitals table function
export const fixHospitalsTable = async () => {
  try {
    console.log('Starting hospitals table fix...');
    
    // Ensure database is initialized
    if (!isDatabaseInitialized) {
      console.log('Database not initialized, initializing first...');
      await initializeDataService();
    }
    
    // Recreate the hospitals table with correct schema
    await recreateHospitalsTable();
    
    console.log('Hospitals table fixed successfully');
    return true;
  } catch (error) {
    console.error('Error fixing hospitals table:', error);
    return false;
  }
};

// Add/update vaccine in hospital inventory
export const manageVaccineInventory = async (vaccineData) => {
  try {
    console.log('Managing vaccine inventory...');
    
    // Ensure database is initialized
    if (!isDatabaseInitialized) {
      console.log('Database not initialized, initializing first...');
      await initializeDataService();
    }
    
    // Get current user (must be a hospital)
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    if (user.userType !== 'hospital') {
      throw new Error('Only hospitals can manage vaccine inventory');
    }
    
    // Add/update vaccine in inventory
    const result = await addVaccineToInventory(user.id, vaccineData);
    console.log(`Vaccine ${result.vaccineName} inventory updated`);
    
    return result;
  } catch (error) {
    console.error('Error managing vaccine inventory:', error);
    throw error;
  }
};

// Get current hospital's vaccine inventory
export const getHospitalInventory = async () => {
  try {
    console.log('Getting hospital inventory...');
    
    // Get current user (must be a hospital)
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    if (user.userType !== 'hospital') {
      throw new Error('Only hospitals can view their inventory');
    }
    
    // Get inventory
    const inventory = await getHospitalVaccineInventory(user.id);
    console.log(`Got ${inventory.length} vaccines in inventory`);
    
    return inventory;
  } catch (error) {
    console.error('Error getting hospital inventory:', error);
    return [];
  }
};

// Remove vaccine from hospital inventory
export const removeVaccine = async (inventoryId) => {
  try {
    console.log(`Removing vaccine with inventory ID: ${inventoryId}`);
    
    // Get current user (must be a hospital)
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    if (user.userType !== 'hospital') {
      throw new Error('Only hospitals can manage their inventory');
    }
    
    // Remove from inventory
    const result = await removeVaccineFromInventory(inventoryId);
    
    if (result) {
      console.log('Vaccine removed from inventory');
    } else {
      console.log('Vaccine not found in inventory');
    }
    
    return result;
  } catch (error) {
    console.error('Error removing vaccine from inventory:', error);
    throw error;
  }
};

// Check available vaccines for a hospital based on patient age
export const getAvailableVaccinesForHospital = async (hospitalId, patientAge) => {
  try {
    console.log(`Checking available vaccines for hospital ${hospitalId} and patient age ${patientAge}`);
    
    // Ensure database is initialized
    if (!isDatabaseInitialized) {
      console.log('Database not initialized, initializing first...');
      await initializeDataService();
    }
    
    // Get available vaccines
    const vaccines = await getAvailableVaccines(hospitalId, patientAge);
    console.log(`Found ${vaccines.length} available vaccines`);
    
    return vaccines;
  } catch (error) {
    console.error('Error getting available vaccines:', error);
    return [];
  }
};

// Update appointment status 
export const updateAppointmentStatusData = async (appointmentId, status) => {
  try {
    // Ensure database is initialized
    if (!isDatabaseInitialized) {
      await initializeDataService();
    }
    
    // Call the database service to update the appointment status
    const result = await updateAppointmentStatus(appointmentId, status);
    return result;
  } catch (error) {
    console.error(`Error updating appointment status: ${error.message}`);
    throw error;
  }
};

// Create a walk-in patient appointment directly at the hospital
export const createWalkInAppointmentData = async (walkInData) => {
  try {
    console.log('Creating new walk-in appointment...');
    
    // Ensure database is initialized
    if (!isDatabaseInitialized) {
      await initializeDataService();
    }
    
    // Get the current hospital user
    const hospital = await getCurrentUser();
    if (!hospital || hospital.userType !== 'hospital') {
      throw new Error('Only hospital accounts can create walk-in appointments');
    }
    
    // Add hospital ID to walk-in data
    const appointmentData = {
      ...walkInData,
      hospitalId: hospital.id
    };
    
    console.log('Creating walk-in appointment with data:', JSON.stringify(appointmentData));
    
    // Call the database service to create the walk-in appointment
    const appointment = await createWalkInAppointment(appointmentData);
    
    console.log('Walk-in appointment created successfully with ID:', appointment.id);
    return appointment;
  } catch (error) {
    console.error('Error creating walk-in appointment:', error);
    throw error;
  }
};

// Cancel appointment
export const cancelAppointmentData = async (appointmentId) => {
  try {
    console.log(`Canceling appointment with ID: ${appointmentId}`);
    
    // Ensure database is initialized
    if (!isDatabaseInitialized) {
      await initializeDataService();
    }
    
    // Get current user to verify ownership
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    // Call the database service to cancel the appointment
    const result = await cancelAppointment(appointmentId);
    
    if (result) {
      console.log(`Appointment ${appointmentId} successfully canceled`);
    } else {
      console.log(`No appointment found with ID ${appointmentId}`);
    }
    
    return result;
  } catch (error) {
    console.error(`Error canceling appointment: ${error.message}`);
    throw error;
  }
};

// Add this new function for database recovery
export const recoverDatabase = async () => {
  try {
    console.log('Attempting to recover database...');
    
    // Close database connection if it exists
    await closeDatabase();
    
    // Clear initialization flag
    await AsyncStorage.removeItem(DB_INITIALIZED_KEY);
    
    // Try to reinitialize the database
    const initialized = await initializeDataService();
    
    if (initialized) {
      console.log('Database recovered successfully');
      return true;
    } else {
      console.error('Database recovery failed');
      return false;
    }
  } catch (error) {
    console.error('Error recovering database:', error);
    return false;
  }
}; 