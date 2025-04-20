import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, Image, ScrollView, TextInput, StyleSheet, Modal, Alert, ActivityIndicator } from "react-native";
import { getCurrentUser, logoutUser } from '../services/authService';
import {
  initializeDataService,
  loginUser,
  getFamilyMembersData,
  getFamilyMembers,
  addFamilyMemberData,
  getAllHospitalsData,
  getAllUsersData,
  getHospitalsByLocationSearch,
  purgeAllDataAndReset,
  insertTestHospitalsData,
  migrateHospitalsFromUsersTable,
  fixHospitalsTable,
  getAvailableVaccinesForHospital,
  createAppointmentData,
  getUserAppointmentsData,
  cancelAppointmentData
} from '../services/dataService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Picker } from '@react-native-picker/picker';
import { Feather } from 'react-native-vector-icons/Ionicons';

const UserHomeScreen = ({ navigation }) => {
  const [menuVisible, setMenuVisible] = useState(false);
  const [addFamilyModalVisible, setAddFamilyModalVisible] = useState(false);
  const [databaseModalVisible, setDatabaseModalVisible] = useState(false);
  const [databaseContent, setDatabaseContent] = useState({});
  const [newFamilyMember, setNewFamilyMember] = useState({
    name: '',
    relation: '',
    age: '',
    gender: '',
    medicalConditions: ''
  });
  const [familyMembers, setFamilyMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editableUser, setEditableUser] = useState({ name: '', email: '', phone: '', address: '' });
  // Hospital filtering states
  const [hospitals, setHospitals] = useState([]);
  const [allHospitals, setAllHospitals] = useState([]);
  const [locationInput, setLocationInput] = useState('');
  const [locationSearchActive, setLocationSearchActive] = useState(false);
  const [availableVaccines, setAvailableVaccines] = useState([]);
  const [selectedVaccine, setSelectedVaccine] = useState(null);
  const [patientAge, setPatientAge] = useState('');
  const [selectedHospital, setSelectedHospital] = useState(null);
  const [bookAppointmentModalVisible, setBookAppointmentModalVisible] = useState(false);
  const [selectedFamilyMember, setSelectedFamilyMember] = useState(null);
  const [selfAppointment, setSelfAppointment] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [calendarDates, setCalendarDates] = useState([]);
  const [bookingHistoryModalVisible, setBookingHistoryModalVisible] = useState(false);
  const [userAppointments, setUserAppointments] = useState([]);
  // Add this state to track upcoming appointments specifically
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  // Add this state to track the current month being displayed in the calendar
  const [currentDisplayMonth, setCurrentDisplayMonth] = useState(new Date().getMonth());
  const [currentDisplayYear, setCurrentDisplayYear] = useState(new Date().getFullYear());
  // Add new state for certificates
  const [certificates, setCertificates] = useState([]);

  // Check for authenticated user
  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await getCurrentUser();
        if (currentUser) {
          setUser(currentUser);
        } else {
          // User is not authenticated, redirect to login
          navigation.navigate("LoginScreen");
        }
      } catch (error) {
        console.error("Error loading user:", error);
        navigation.navigate("LoginScreen");
      } finally {
        setLoading(false);
      }
    };
    
    loadUser();
  }, [navigation]);

  // Load initial hospital data
  useEffect(() => {
    const loadHospitals = async () => {
      try {
        // Get all hospitals (no location filter)
        const hospitalData = await getHospitalsByLocationSearch('');
        setAllHospitals(hospitalData);
      } catch (error) {
        console.error('Error loading hospital data:', error);
      }
    };

    loadHospitals();
  }, []);

  // Fetch family members for authenticated user
  useEffect(() => {
    if (!user) return;
    
    const fetchFamilyMembers = async () => {
      try {
        setLoading(true);
        const members = await getFamilyMembers();
        setFamilyMembers(members);
      } catch (error) {
        console.error("Error fetching family members: ", error);
        Alert.alert("Error", "Failed to load family members");
      } finally {
        setLoading(false);
      }
    };

    fetchFamilyMembers();
  }, [user]);

  // Add this useEffect to generate calendar dates for this month and next month
  useEffect(() => {
    const generateCalendarDates = () => {
      const dates = [];
      const today = new Date();
      
      // Start from today
      const startDate = new Date(today);
      
      // Generate dates for 60 days (covers this month and next)
      for (let i = 0; i < 60; i++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + i);
        
        // Format the date for display and as value
        const formattedDate = currentDate.toISOString().split('T')[0];
        const displayDate = currentDate.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric'
        });
        
        const isWeekend = currentDate.getDay() === 0 || currentDate.getDay() === 6;
        
        dates.push({
          value: formattedDate,
          display: displayDate,
          isWeekend,
          month: currentDate.getMonth(),
          date: currentDate.getDate()
        });
      }
      
      setCalendarDates(dates);
    };
    
    generateCalendarDates();
  }, []);

  // Add this useEffect to load upcoming appointments when the user loads
  useEffect(() => {
    if (user) {
      loadUpcomingAppointments();
    }
  }, [user]);

  // Add this function to load upcoming appointments
  const loadUpcomingAppointments = async () => {
    try {
      const appointments = await getUserAppointmentsData();
      
      // Filter to only get pending appointments and sort by date (most recent first)
      const upcoming = appointments
        .filter(appointment => appointment.status === 'pending')
        .sort((a, b) => new Date(a.date) - new Date(b.date));
      
      setUpcomingAppointments(upcoming.slice(0, 3)); // Show only next 3 appointments
    } catch (error) {
      console.error("Error loading upcoming appointments:", error);
    }
  };

  // Generate calendar view for current month
  const generateCalendarView = () => {
    const today = new Date();
    const year = currentDisplayYear;
    const month = currentDisplayMonth;
    
    // Get the first day of the month
    const firstDay = new Date(year, month, 1);
    
    // Get the last day of the month
    const lastDay = new Date(year, month + 1, 0);
    
    // Calculate days in month
    const daysInMonth = lastDay.getDate();
    
    // Get day of week of first day (0 = Sunday, 1 = Monday, etc.)
    const startingDayOfWeek = firstDay.getDay();
    
    // Create an array of calendar day objects
    const calendarDays = [];
    
    // Add empty spaces for the days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      calendarDays.push({
        date: null,
        formattedDate: null,
        isWeekend: false,
        isPast: false,
        isToday: false
      });
    }
    
    // Add the days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(year, month, day);
      const dayOfWeek = currentDate.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isPast = currentDate < new Date(new Date().setHours(0, 0, 0, 0));
      const isToday = currentDate.toDateString() === new Date().toDateString();
      
      calendarDays.push({
        date: day,
        formattedDate: currentDate.toISOString().split('T')[0],
        isWeekend,
        isPast,
        isToday
      });
    }
    
    // Add empty spaces to complete the grid rows if needed
    const totalDaysToShow = Math.ceil((startingDayOfWeek + daysInMonth) / 7) * 7;
    const remainingEmptyDays = totalDaysToShow - calendarDays.length;
    
    for (let i = 0; i < remainingEmptyDays; i++) {
      calendarDays.push({
        date: null,
        formattedDate: null,
        isWeekend: false,
        isPast: false,
        isToday: false
      });
    }
    
    return calendarDays;
  };
  
  // Navigate to the next month
  const goToNextMonth = () => {
    if (currentDisplayMonth === 11) {
      setCurrentDisplayMonth(0);
      setCurrentDisplayYear(currentDisplayYear + 1);
    } else {
      setCurrentDisplayMonth(currentDisplayMonth + 1);
    }
  };
  
  // Navigate to the previous month
  const goToPreviousMonth = () => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    // Don't allow going before the current month
    if (currentDisplayYear === currentYear && currentDisplayMonth === currentMonth) {
      return;
    }
    
    if (currentDisplayMonth === 0) {
      setCurrentDisplayMonth(11);
      setCurrentDisplayYear(currentDisplayYear - 1);
    } else {
      setCurrentDisplayMonth(currentDisplayMonth - 1);
    }
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
      navigation.navigate("LoginScreen");
    } catch (error) {
      console.error("Logout error:", error);
      Alert.alert("Error", "Failed to logout. Please try again.");
    }
  };

  const handleAddFamilyMember = async () => {
    // Validate inputs
    if (!newFamilyMember.name || !newFamilyMember.relation || !newFamilyMember.gender) {
      Alert.alert("Error", "Name, relationship, and gender are required.");
      return;
    }
    
    if (!user) {
      Alert.alert("Error", "You must be logged in to add family members.");
      return;
    }
    
    try {
      setLoading(true);
      
      // Add to local storage
      const newMember = await addFamilyMemberData(newFamilyMember);
      
      // Add to local state
      setFamilyMembers([...familyMembers, newMember]);
      
      // Reset form and close modal
      setNewFamilyMember({ name: '', relation: '', age: '', gender: '', medicalConditions: '' });
      setAddFamilyModalVisible(false);
      
      Alert.alert("Success", "Family member added successfully");
    } catch (error) {
      console.error("Error adding family member: ", error);
      Alert.alert("Error", "Failed to add family member");
    } finally {
      setLoading(false);
    }
  };

  const handleManageFamilyMember = (member) => {
    Alert.alert(
      "Manage Family Member",
      `What would you like to do with ${member.name}?`,
      [
        {
          text: "View Vaccines",
          onPress: () => console.log("View vaccines")
        },
        {
          text: "Book Appointment",
          onPress: () => handleHospitalSelect(member)
        },
        {
          text: "Remove",
          onPress: () => removeFamilyMember(member),
          style: "destructive"
        },
        {
          text: "Cancel",
          style: "cancel"
        }
      ]
    );
  };

  const removeFamilyMember = async (member) => {
    try {
      setLoading(true);
      
      // In a full implementation, we would call a function to remove from storage
      // For now, we'll just update the local state
      setFamilyMembers(familyMembers.filter(m => m.id !== member.id));
      
      Alert.alert("Success", "Family member removed successfully");
    } catch (error) {
      console.error("Error removing family member: ", error);
      Alert.alert("Error", "Failed to remove family member");
    } finally {
      setLoading(false);
    }
  };

  const viewDatabase = async () => {
    try {
      setLoading(true);
      
      // Get all users
      const usersPromise = getAllUsersData ? getAllUsersData() : [];
      // Get all hospitals
      const hospitalsPromise = getAllHospitalsData();
      // Get family members if needed
      const familyMembersPromise = getFamilyMembersData();
      
      // Wait for all data to be retrieved
      const [users, allHospitals, familyMembers] = await Promise.all([
        usersPromise, 
        hospitalsPromise, 
        familyMembersPromise
      ]);
      
      // Create a structured object with just the current database data
      const dbContent = {
        "Database Contents": "Current SQLite Database",
        "users": users || [],
        "hospitals": allHospitals || [],
        "family_members": familyMembers || []
      };
      
      setDatabaseContent(dbContent);
      setDatabaseModalVisible(true);
    } catch (error) {
      console.error("Error viewing database:", error);
      Alert.alert("Error", "Failed to load database content");
    } finally {
      setLoading(false);
    }
  };

  const searchHospitalsByLocation = async () => {
    if (!locationInput.trim()) {
      Alert.alert("Error", "Please enter a location to search");
      return;
    }
    
    try {
      setLoading(true);
      setLocationSearchActive(true);
      
      // Clean up the search input and ensure it's case-insensitive
      const searchTerm = locationInput.trim();
      console.log(`User searching for hospitals in: ${searchTerm}`);
      
      // Search hospitals by location
      const searchResults = await getHospitalsByLocationSearch(searchTerm);
      console.log(`Found ${searchResults.length} total hospitals for search: ${searchTerm}`);
      
      // Sort hospitals - registered ones first, then alphabetically
      const sortedHospitals = searchResults.sort((a, b) => {
        // Registered hospitals (with userId or isRegisteredHospital) come first
        if ((a.userId || a.isRegisteredHospital) && !(b.userId || b.isRegisteredHospital)) return -1;
        if (!(a.userId || a.isRegisteredHospital) && (b.userId || b.isRegisteredHospital)) return 1;
        
        // Then sort alphabetically by name
        return a.name.localeCompare(b.name);
      });
      
      // Log the hospitals we're showing
      console.log(`Showing ${sortedHospitals.length} hospitals for search: ${searchTerm}`);
      sortedHospitals.forEach((hospital, index) => {
        console.log(`Hospital ${index + 1}: ${hospital.name} (${hospital.location || hospital.address || 'No location'})${(hospital.userId || hospital.isRegisteredHospital) ? ' - REGISTERED' : ''}`);
      });
      
      // Store the search results
      setHospitals(sortedHospitals);
      
      // Show an informative message if no results found
      if (sortedHospitals.length === 0) {
        Alert.alert(
          "No Hospitals Found",
          `No hospitals found for "${searchTerm}". Please try a different location or add hospitals with this location to your database.`,
          [{ text: "OK" }]
        );
      }
    } catch (error) {
      console.error("Error searching hospitals:", error);
      Alert.alert("Error", "Failed to search hospitals: " + error.message);
      // Reset search state on error
      setLocationSearchActive(false);
    } finally {
      setLoading(false);
    }
  };

  const clearLocationSearch = () => {
    setLocationInput('');
    setLocationSearchActive(false);
    setHospitals([]);
  };

  const handleEdit = () => {
    setEditableUser({
      name: user.name,
      email: user.email,
      phone: user.phone,
      address: user.address,
    });
    setEditMode(true);
  };

  const handleSave = () => {
    // Here you would typically update the user information in your backend or local storage
    setUser(editableUser);
    setEditMode(false);
    Alert.alert('Success', 'Profile updated successfully');
  };

  const handleHospitalSelect = async (hospital) => {
    try {
      setLoading(true);
      setSelectedHospital(hospital);
      
      // Clear previous selections
      setSelectedVaccine(null);
      
      // Directly load all vaccines from the hospital without age filter
      const vaccines = await getAvailableVaccinesForHospital(hospital.id, null);
      setAvailableVaccines(vaccines);
      
      // Show appointment dialog
      setBookAppointmentModalVisible(true);
    } catch (error) {
      console.error("Error selecting hospital:", error);
      Alert.alert("Error", "Failed to select hospital: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const checkAvailableVaccines = async () => {
    try {
      if (!patientAge || isNaN(parseInt(patientAge))) {
        Alert.alert("Error", "Please enter a valid age");
        return;
      }
      
      setLoading(true);
      const age = parseInt(patientAge);
      
      const vaccines = await getAvailableVaccinesForHospital(selectedHospital.id, age);
      setAvailableVaccines(vaccines);
      
      if (vaccines.length === 0) {
        Alert.alert("No Vaccines", `No vaccines available for age ${age} at this hospital`);
      }
    } catch (error) {
      console.error("Error checking available vaccines:", error);
      Alert.alert("Error", "Failed to check available vaccines: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAppointment = async () => {
    try {
      if (!selectedFamilyMember && !selfAppointment) {
        Alert.alert("Error", "Please select a family member or yourself");
        return;
      }
      
      if (!selectedVaccine) {
        Alert.alert("Error", "Please select a vaccine");
        return;
      }
      
      if (!selectedDate || !selectedTime) {
        Alert.alert("Error", "Please select date and time");
        return;
      }
      
      setLoading(true);
      
      // Create appointment data
      const appointmentData = {
        hospitalId: selectedHospital.id,
        familyMemberId: selfAppointment ? null : selectedFamilyMember.id,
        vaccine: selectedVaccine.vaccineName,
        date: selectedDate,
        time: selectedTime
      };
      
      // Create appointment
      await createAppointmentData(appointmentData);
      
      // Close modals and reset selections
      setBookAppointmentModalVisible(false);
      setSelectedHospital(null);
      setSelectedFamilyMember(null);
      setSelfAppointment(false);
      setSelectedVaccine(null);
      setSelectedDate(null);
      setSelectedTime(null);
      setAvailableVaccines([]);
      
      Alert.alert("Success", "Appointment booked successfully");
    } catch (error) {
      console.error("Error creating appointment:", error);
      Alert.alert("Error", "Failed to book appointment: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserAppointments = async () => {
    try {
      setLoading(true);
      const appointments = await getUserAppointmentsData();
      setUserAppointments(appointments);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      Alert.alert('Error', 'Failed to load appointment history');
    } finally {
      setLoading(false);
    }
  };

  const openBookingHistory = async () => {
    await fetchUserAppointments();
    setBookingHistoryModalVisible(true);
  };

  const handleCancelAppointment = async (appointmentId) => {
    try {
      // Ask for confirmation before canceling
      Alert.alert(
        "Cancel Appointment",
        "Are you sure you want to cancel this appointment?",
        [
          {
            text: "No",
            style: "cancel"
          },
          {
            text: "Yes, Cancel",
            style: "destructive",
            onPress: async () => {
              try {
                setLoading(true);
                await cancelAppointmentData(appointmentId);
                // Refresh appointments
                await loadUpcomingAppointments();
                await fetchUserAppointments();
                Alert.alert("Success", "Appointment canceled successfully");
              } catch (error) {
                console.error("Error canceling appointment:", error);
                Alert.alert("Error", "Failed to cancel appointment: " + error.message);
              } finally {
                setLoading(false);
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error("Error initiating appointment cancellation:", error);
      Alert.alert("Error", "Something went wrong. Please try again.");
    }
  };

  // Local function to get completed vaccinations
  const getCompletedVaccinations = (appointments, user) => {
    try {
      // Filter appointments to only completed ones
      const completedAppointments = appointments.filter(
        appointment => appointment.status === 'completed'
      );
      
      console.log(`Found ${completedAppointments.length} completed appointments for certificates out of ${appointments.length} total`);
      
      return completedAppointments.map(appointment => ({
        id: appointment.id,
        patientName: appointment.familyMemberName || user?.name || 'Patient',
        vaccineName: appointment.vaccine,
        vaccinationDate: appointment.date,
        hospitalName: appointment.hospitalName,
        appointmentId: appointment.id
      }));
    } catch (error) {
      console.error('Error filtering completed vaccinations:', error);
      return [];
    }
  };

  // Add this useEffect to load certificates when user loads
  useEffect(() => {
    if (user) {
      loadCertificates();
    }
  }, [user]);
  
  // Add this function to load certificates
  const loadCertificates = async () => {
    try {
      const appointments = await getUserAppointmentsData();
      
      if (!appointments || !Array.isArray(appointments)) {
        console.log('No appointments data available for certificates');
        setCertificates([]);
        return;
      }
      
      // Use local function instead of imported one
      const completedVaccinations = getCompletedVaccinations(appointments, user);
      console.log(`Loaded ${completedVaccinations.length} certificates`);
      
      setCertificates(completedVaccinations.slice(0, 2)); // Show only 2 recent certificates
    } catch (error) {
      console.error("Error loading certificates:", error);
      setCertificates([]);
    }
  };

  const renderProfileModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={profileModalVisible}
      onRequestClose={() => setProfileModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>My Profile</Text>
            <TouchableOpacity onPress={() => setProfileModalVisible(false)}>
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
        </View>
          <ScrollView>
            <View style={styles.profileImageContainer}>
              <Image 
                source={require("../assets/icons/profile.png")} 
                style={styles.profileImage} 
              />
              <TouchableOpacity style={styles.editButton} onPress={handleEdit}>
                <Text style={styles.editButtonText}>{editMode ? 'Cancel' : 'Edit'}</Text>
              </TouchableOpacity>
        </View>
            {editMode ? (
              <View>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Name"
                  value={editableUser.name}
                  onChangeText={(text) => setEditableUser({ ...editableUser, name: text })}
                />
                <TextInput
                  style={styles.modalInput}
                  placeholder="Email"
                  value={editableUser.email}
                  onChangeText={(text) => setEditableUser({ ...editableUser, email: text })}
                />
                <TextInput
                  style={styles.modalInput}
                  placeholder="Phone"
                  value={editableUser.phone}
                  onChangeText={(text) => setEditableUser({ ...editableUser, phone: text })}
                />
                <TextInput
                  style={styles.modalInput}
                  placeholder="Address"
                  value={editableUser.address}
                  onChangeText={(text) => setEditableUser({ ...editableUser, address: text })}
                />
                <TouchableOpacity style={styles.modalAddButton} onPress={handleSave}>
                  <Text style={styles.modalAddButtonText}>Save</Text>
        </TouchableOpacity>
      </View>
            ) : (
              <View>
                <View style={styles.profileInfoItem}>
                  <Text style={styles.profileLabel}>Name</Text>
                  <Text style={styles.profileValue}>{user?.name || 'Not set'}</Text>
                </View>
                <View style={styles.profileInfoItem}>
                  <Text style={styles.profileLabel}>Email</Text>
                  <Text style={styles.profileValue}>{user?.email || 'Not set'}</Text>
                </View>
                <View style={styles.profileInfoItem}>
                  <Text style={styles.profileLabel}>Phone</Text>
                  <Text style={styles.profileValue}>{user?.phone || 'Not set'}</Text>
                </View>
                <View style={styles.profileInfoItem}>
                  <Text style={styles.profileLabel}>Address</Text>
                  <Text style={styles.profileValue}>{user?.address || 'Not set'}</Text>
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  const purgeAllData = async () => {
    try {
      setLoading(true);
      Alert.alert(
        "PURGE ALL DATA",
        "⚠️ WARNING: This will permanently delete ALL data but preserve the database structure. All users, hospitals, appointments, and family members will be deleted. Are you ABSOLUTELY sure?",
        [
          {
            text: "Cancel",
            style: "cancel",
            onPress: () => setLoading(false)
          },
          {
            text: "YES, DELETE EVERYTHING",
            style: "destructive",
            onPress: async () => {
              try {
                const result = await purgeAllDataAndReset();
                
                if (result) {
                  Alert.alert("Success", "All data has been deleted. Database structure preserved.");
                  // Reset local state after purge
                  setUser(null);
                  setFamilyMembers([]);
                  setHospitals([]);
                  // Close modal if open
                  setDatabaseModalVisible(false);
                  
                  // After purging, insert some test hospitals
                  Alert.alert(
                    "Add Test Data?",
                    "Would you like to add some test hospitals for debugging?",
                    [
                      { text: "No", style: "cancel" },
                      {
                        text: "Yes, Add Test Data",
                        onPress: async () => {
                          try {
                            const result = await insertTestHospitalsData();
                            Alert.alert("Success", `Added ${result} test hospitals to database.`);
                          } catch (error) {
                            Alert.alert("Error", `Failed to add test data: ${error.message}`);
                          }
                        }
                      }
                    ]
                  );
                } else {
                  Alert.alert("Error", "Failed to purge data.");
                }
              } catch (error) {
                Alert.alert("Error", `Error purging data: ${error.message}`);
              } finally {
                setLoading(false);
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error("Error initiating data purge:", error);
      Alert.alert("Error", "Failed to start data purge: " + error.message);
      setLoading(false);
    }
  };

  const renderMenu = () => {
    return (
        <View style={styles.dropdownMenu}>
        <TouchableOpacity style={styles.menuItem} onPress={() => setProfileModalVisible(true)}>
            <Image source={require("../assets/icons/profile.png")} style={styles.menuItemIcon} />
            <Text style={styles.menuItemText}>My Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={openBookingHistory}>
            <Image source={require("../assets/icons/history.png")} style={styles.menuItemIcon} />
            <Text style={styles.menuItemText}>Booking History</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem}>
          <Image source={require("../assets/icons/certificate.png")} style={styles.menuItemIcon} />
          <Text style={styles.menuItemText}>My Certificates</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem}>
          <Image source={require("../assets/icons/settings.png")} style={styles.menuItemIcon} />
          <Text style={styles.menuItemText}>Settings</Text>
          </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem} onPress={viewDatabase}>
          <Image source={require("../assets/icons/history.png")} style={styles.menuItemIcon} />
          <Text style={styles.menuItemText}>View Database</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem} onPress={purgeAllData}>
          <Image source={require("../assets/icons/database.png")} style={[styles.menuItemIcon, { tintColor: '#FF3B30' }]} />
          <Text style={[styles.menuItemText, { color: '#FF3B30' }]}>PURGE ALL DATA</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('RecoveryScreen')}>
          <Image source={require("../assets/icons/refresh.png")} style={styles.menuItemIcon} />
          <Text style={styles.menuItemText}>Database Recovery</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
            <Image source={require("../assets/icons/logout.png")} style={[styles.menuItemIcon, { tintColor: '#FF3B30' }]} />
            <Text style={[styles.menuItemText, { color: '#FF3B30' }]}>Logout</Text>
          </TouchableOpacity>
      </View>
    );
  };

  const renderHospitalCard = (hospital) => {
    // Check if hospital is a registered account (either has userId or isRegisteredHospital flag)
    const isRegistered = hospital.userId || hospital.isRegisteredHospital;
    
    return (
      <TouchableOpacity
        key={hospital.id}
        style={[
          styles.hospitalCard,
          isRegistered && styles.registeredHospitalCard
        ]}
        onPress={() => handleHospitalSelect(hospital)}
      >
        <View style={styles.hospitalCardContent}>
          <View style={styles.hospitalIconContainer}>
            <Ionicons name="medical" size={30} color={isRegistered ? "#006A4E" : "#555"} />
          </View>
          <View style={styles.hospitalInfo}>
            <Text style={styles.hospitalName}>{hospital.name}</Text>
            <Text style={styles.hospitalAddress}>
              {hospital.address || hospital.location || "No address available"}
            </Text>
            {isRegistered && (
              <View style={styles.registeredBadge}>
                <Text style={styles.registeredText}>Verified Hospital</Text>
        </View>
      )}
          </View>
          <View style={styles.arrowContainer}>
            <Ionicons name="chevron-forward" size={24} color="#aaa" />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderBookAppointmentModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={bookAppointmentModalVisible}
      onRequestClose={() => setBookAppointmentModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Book Appointment</Text>
            <TouchableOpacity onPress={() => setBookAppointmentModalVisible(false)}>
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>
          
          {loading ? (
            <ActivityIndicator size="large" color="#4A90E2" />
          ) : (
            <ScrollView>
              <Text style={styles.selectedHospitalName}>{selectedHospital?.name}</Text>
              <Text style={styles.selectedHospitalAddress}>{selectedHospital?.location || selectedHospital?.address || "No address"}</Text>
              
              <View style={styles.divider} />
              
              {/* Step 1: Patient Selection */}
              <Text style={styles.sectionTitle}>Step 1: Select Patient</Text>
              
              <TouchableOpacity 
                style={[styles.patientOption, selfAppointment && styles.patientOptionSelected]}
                onPress={() => {
                  setSelfAppointment(true);
                  setSelectedFamilyMember(null);
                  
                  // Auto-fill patient age if user has age field
                  if (user && user.age) {
                    setPatientAge(user.age.toString());
                  } else {
                    setPatientAge('');
                  }
                }}
              >
                <Text style={[styles.patientOptionText, selfAppointment && styles.patientOptionTextSelected]}>
                  For myself
                </Text>
              </TouchableOpacity>
              
              <Text style={styles.orText}>OR</Text>
              
              <Text style={styles.subsectionTitle}>Select Family Member:</Text>
              {familyMembers.length === 0 ? (
                <Text style={styles.emptyStateText}>No family members added</Text>
              ) : (
                familyMembers.map(member => (
                  <TouchableOpacity 
                    key={member.id}
                    style={[
                      styles.patientOption, 
                      selectedFamilyMember?.id === member.id && styles.patientOptionSelected
                    ]}
                    onPress={() => {
                      setSelectedFamilyMember(member);
                      setSelfAppointment(false);
                      
                      // Auto-fill patient age if family member has age field
                      if (member.age) {
                        setPatientAge(member.age.toString());
                      } else {
                        setPatientAge('');
                      }
                    }}
                  >
                    <Text style={[
                      styles.patientOptionText, 
                      selectedFamilyMember?.id === member.id && styles.patientOptionTextSelected
                    ]}>
                      {member.name} {member.age ? `(${member.age} years)` : ''}
                    </Text>
                  </TouchableOpacity>
                ))
              )}
              
              <View style={styles.divider} />
              
              {/* Step 2: Select Vaccine */}
              <Text style={styles.sectionTitle}>Step 2: Select Vaccine</Text>
              
              {availableVaccines.length > 0 ? (
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={selectedVaccine ? selectedVaccine.id : ''}
                    onValueChange={(itemValue) => {
                      const vaccine = availableVaccines.find(v => v.id === itemValue);
                      setSelectedVaccine(vaccine);
                    }}
                    style={styles.vaccinePicker}
                    itemStyle={styles.vaccinePickerItem}
                  >
                    <Picker.Item label="-- Select a vaccine --" value="" />
                    {availableVaccines.map(vaccine => (
                      <Picker.Item 
                        key={vaccine.id} 
                        label={vaccine.vaccineName} 
                        value={vaccine.id}
                        color={styles.vaccinePickerItemText.color}
                      />
                    ))}
                  </Picker>
                </View>
              ) : (
                <Text style={styles.emptyStateText}>
                  No vaccines available at this hospital
                </Text>
              )}
              
              {selectedVaccine && selectedVaccine.description && (
                <View style={styles.selectedVaccineContainer}>
                  <Text style={styles.selectedVaccineTitle}>{selectedVaccine.vaccineName}</Text>
                  <Text style={styles.vaccineDescription}>
                    {selectedVaccine.description}
                  </Text>
                  {selectedVaccine.minAge && selectedVaccine.maxAge && (
                    <Text style={styles.vaccineAgeInfo}>
                      Recommended for ages {selectedVaccine.minAge} to {selectedVaccine.maxAge}
                    </Text>
                  )}
                </View>
              )}
              
              <View style={styles.divider} />
              
              {/* Step 3: Select Date and Time */}
              <Text style={styles.sectionTitle}>Step 3: Select Date and Time</Text>
              
              <Text style={styles.subsectionTitle}>Select Date:</Text>
              <View style={styles.enhancedCalendarContainer}>
                {/* Month and Year Header with Navigation */}
                <View style={styles.calendarHeader}>
                  <TouchableOpacity 
                    onPress={goToPreviousMonth}
                    style={styles.monthNavButton}
                    disabled={
                      currentDisplayMonth === new Date().getMonth() && 
                      currentDisplayYear === new Date().getFullYear()
                    }
                  >
                    <Image 
                      source={require("../assets/icons/right-arrow.png")} 
                      style={[
                        styles.navArrowIcon, 
                        styles.leftArrowIcon, 
                        {
                          tintColor: currentDisplayMonth === new Date().getMonth() && 
                          currentDisplayYear === new Date().getFullYear() 
                            ? "#CCCCCC" 
                            : "#4A90E2"
                        }
                      ]} 
                    />
                  </TouchableOpacity>
                  
                  <Text style={styles.calendarMonthYear}>
                    {new Date(currentDisplayYear, currentDisplayMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </Text>
                  
                  <TouchableOpacity 
                    onPress={goToNextMonth}
                    style={styles.monthNavButton}
                  >
                    <Image 
                      source={require("../assets/icons/right-arrow.png")} 
                      style={[styles.navArrowIcon, {tintColor: "#4A90E2"}]} 
                    />
                  </TouchableOpacity>
                </View>
                
                {/* Weekday Labels */}
                <View style={styles.weekdayLabelsContainer}>
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                    <Text 
                      key={index} 
                      style={[
                        styles.weekdayLabel, 
                        index === 0 || index === 6 ? styles.weekendLabel : {}
                      ]}
                    >
                      {day}
                    </Text>
                  ))}
                </View>
                
                {/* Calendar Grid */}
                <View style={styles.enhancedCalendarGrid}>
                  {generateCalendarView().map((dateObj, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.calendarDateCell,
                        !dateObj.date && styles.emptyDateCell,
                        dateObj.isWeekend && styles.calendarDateWeekend,
                        dateObj.isPast && styles.pastDateCell,
                        dateObj.date && 
                          selectedDate === dateObj.formattedDate && 
                          styles.calendarDateSelected
                      ]}
                      disabled={!dateObj.date || dateObj.isPast || dateObj.isWeekend}
                      onPress={() => dateObj.date && setSelectedDate(dateObj.formattedDate)}
                    >
                      {dateObj.date ? (
                        <>
                          <Text style={[
                            styles.calendarDateText,
                            dateObj.isWeekend && styles.calendarDateTextWeekend,
                            dateObj.isPast && styles.pastDateText,
                            selectedDate === dateObj.formattedDate && styles.calendarDateTextSelected
                          ]}>
                            {dateObj.date}
                          </Text>
                          {dateObj.isToday && (
                            <View style={styles.todayIndicator} />
                          )}
                        </>
                      ) : <Text></Text>}
                    </TouchableOpacity>
                  ))}
                </View>
                
                {selectedDate && (
                  <View style={styles.selectedDateContainer}>
                    <Image 
                      source={require("../assets/icons/calendar.png")} 
                      style={[styles.selectedDateIcon, {tintColor: "#4A90E2", width: 20, height: 20}]} 
                    />
                    <Text style={styles.selectedDateValue}>
                      {new Date(selectedDate).toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </Text>
                  </View>
                )}
              </View>
              
              <Text style={styles.subsectionTitle}>Select Time:</Text>
              
              <View style={styles.timeOptionsContainer}>
                <Text style={styles.timeSlotTitle}>Morning</Text>
                <View style={styles.timeOptions}>
                  {["9:00 AM", "10:00 AM", "11:00 AM"].map(time => (
                    <TouchableOpacity 
                      key={time}
                      style={[
                        styles.timeOption, 
                        selectedTime === time && styles.timeOptionSelected
                      ]}
                      onPress={() => setSelectedTime(time)}
                    >
                      <Image 
                        source={require("../assets/icons/time.png")} 
                        style={[
                          styles.timeIcon, 
                          {
                            tintColor: selectedTime === time ? "#FFFFFF" : "#666666",
                            width: 16,
                            height: 16
                          }
                        ]} 
                      />
                      <Text style={[
                        styles.timeOptionText, 
                        selectedTime === time && styles.timeOptionTextSelected
                      ]}>
                        {time}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                
                <Text style={styles.timeSlotTitle}>Afternoon</Text>
                <View style={styles.timeOptions}>
                  {["1:00 PM", "2:00 PM", "3:00 PM"].map(time => (
                    <TouchableOpacity 
                      key={time}
                      style={[
                        styles.timeOption, 
                        selectedTime === time && styles.timeOptionSelected
                      ]}
                      onPress={() => setSelectedTime(time)}
                    >
                      <Image 
                        source={require("../assets/icons/time.png")} 
                        style={[
                          styles.timeIcon, 
                          {
                            tintColor: selectedTime === time ? "#FFFFFF" : "#666666",
                            width: 16,
                            height: 16
                          }
                        ]} 
                      />
                      <Text style={[
                        styles.timeOptionText, 
                        selectedTime === time && styles.timeOptionTextSelected
                      ]}>
                        {time}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              
              <TouchableOpacity 
                style={[
                  styles.createAppointmentButton,
                  // Disable button if required fields are not filled
                  (!selectedVaccine || !selectedDate || !selectedTime || (!selectedFamilyMember && !selfAppointment)) && 
                  styles.createAppointmentButtonDisabled
                ]}
                onPress={handleCreateAppointment}
                disabled={!selectedVaccine || !selectedDate || !selectedTime || (!selectedFamilyMember && !selfAppointment)}
              >
                <Text style={styles.createAppointmentButtonText}>Book Appointment</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );

  const renderBookingHistoryModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={bookingHistoryModalVisible}
      onRequestClose={() => setBookingHistoryModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Booking History</Text>
            <TouchableOpacity onPress={() => setBookingHistoryModalVisible(false)}>
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>
          
          {loading ? (
            <View style={{padding: 20, alignItems: 'center'}}>
              <ActivityIndicator size="large" color="#4A90E2" />
              <Text style={{marginTop: 10}}>Loading appointments...</Text>
            </View>
          ) : (
            <ScrollView style={{maxHeight: '85%'}}>
              {userAppointments.length === 0 ? (
                <View style={styles.emptyStateContainer}>
                  <Image 
                    source={require("../assets/icons/calendar.png")} 
                    style={[styles.emptyStateIcon, {tintColor: '#CCCCCC'}]} 
                  />
                  <Text style={styles.emptyStateText}>No appointments found</Text>
                  <Text style={styles.emptyStateSubText}>
                    You haven't booked any vaccination appointments yet.
                  </Text>
                </View>
              ) : (
                userAppointments.map((appointment) => (
                  <View key={appointment.id} style={styles.appointmentHistoryItem}>
                    <View style={styles.appointmentHistoryHeader}>
                      <Text style={styles.appointmentHistoryDate}>
                        {new Date(appointment.date).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short', 
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </Text>
                      <View style={[
                        styles.statusBadge, 
                        appointment.status === 'completed' ? 
                          styles.completedStatusBadge : 
                          styles.pendingStatusBadge
                      ]}>
                        <Text style={styles.statusBadgeText}>
                          {appointment.status === 'completed' ? 'Completed' : 'Pending'}
                        </Text>
                      </View>
                    </View>
                    
                    <View style={styles.appointmentHistoryBody}>
                      <Text style={styles.appointmentHistoryVaccine}>
                        {appointment.vaccine || 'General Vaccination'}
                      </Text>
                      
                      <View style={styles.appointmentHistoryDetail}>
                        <Image 
                          source={require("../assets/icons/medical.png")} 
                          style={styles.appointmentHistoryIcon} 
                          resizeMode="contain"
                        />
                        <Text style={styles.appointmentHistoryLabel}>Hospital:</Text>
                        <Text style={styles.appointmentHistoryValue}>
                          {appointment.hospitalName || 'Unknown Hospital'}
                        </Text>
                      </View>
                      
                      <View style={styles.appointmentHistoryDetail}>
                        <Image 
                          source={require("../assets/icons/time.png")} 
                          style={styles.appointmentHistoryIcon} 
                          resizeMode="contain"
                        />
                        <Text style={styles.appointmentHistoryLabel}>Time:</Text>
                        <Text style={styles.appointmentHistoryValue}>
                          {appointment.time || 'Not specified'}
                        </Text>
                      </View>
                      
                      <View style={styles.appointmentHistoryDetail}>
                        <Image 
                          source={require("../assets/icons/profile.png")} 
                          style={styles.appointmentHistoryIcon} 
                          resizeMode="contain"
                        />
                        <Text style={styles.appointmentHistoryLabel}>Patient:</Text>
                        <Text style={styles.appointmentHistoryValue}>
                          {appointment.familyMemberName || user.name || 'Self'}
                        </Text>
                      </View>
                      
                      {appointment.status === 'pending' && (
                        <TouchableOpacity 
                          style={styles.cancelHistoryButton}
                          onPress={() => handleCancelAppointment(appointment.id)}
                        >
                          <Text style={styles.cancelHistoryButtonText}>Cancel Appointment</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );

  // Loading state
  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <View style={styles.logoContainer}>
          <Image source={require("../assets/Vaxilogo.png")} style={styles.logo} />
        </View>
        <View style={styles.userContainer}>
          <Text style={styles.greeting}>Hello,</Text>
          <Text style={styles.userName}>{user.name || "User"} 👋</Text>
        </View>
        <TouchableOpacity onPress={() => setMenuVisible(!menuVisible)} style={styles.menuButton}>
          <Image source={require("../assets/icons/menu.png")} style={styles.menuIcon} />
        </TouchableOpacity>
      </View>

      {/* Dropdown Menu */}
      {menuVisible && renderMenu()}

      <ScrollView style={styles.content}>
        {/* Search Section */}
        <View style={styles.searchSection}>
          <Text style={styles.sectionTitle}>Find a Vaccination Center</Text>
          <View style={styles.searchContainer}>
            <Image source={require("../assets/icons/search-icon.png")} style={styles.searchIcon} />
            <TextInput 
              placeholder="Enter your location" 
              style={styles.searchInput}
              placeholderTextColor="#666"
              value={locationInput}
              onChangeText={setLocationInput}
              onSubmitEditing={searchHospitalsByLocation}
            />
            {locationInput ? (
              <TouchableOpacity onPress={clearLocationSearch}>
                <Image source={require("../assets/icons/close.png")} style={styles.clearIcon} />
              </TouchableOpacity>
            ) : null}
          </View>
          <TouchableOpacity 
            style={styles.searchButton} 
            onPress={searchHospitalsByLocation}
          >
            <Text style={styles.searchButtonText}>Search Hospitals</Text>
          </TouchableOpacity>
          
          {/* Hospital Search Results */}
          {locationSearchActive && (
            <View style={styles.searchResults}>
              {loading ? (
                <ActivityIndicator size="large" color="#4A90E2" />
              ) : hospitals.length > 0 ? (
                <>
                  <Text style={styles.searchResultsTitle}>
                    Found {hospitals.length} hospital{hospitals.length !== 1 ? 's' : ''} in {locationInput}
                  </Text>
                  <TouchableOpacity onPress={clearLocationSearch} style={styles.clearButton}>
                    <Text style={styles.clearButtonText}>Clear Search</Text>
                  </TouchableOpacity>
                  <ScrollView 
                    horizontal={false}
                    style={styles.hospitalsScrollView}
                    contentContainerStyle={styles.hospitalsScrollViewContent}
                  >
                    {hospitals.map((hospital, index) => (
                      renderHospitalCard(hospital)
                    ))}
                  </ScrollView>
                </>
              ) : (
                <View style={styles.noResultsContainer}>
                  <Text style={styles.noResultsText}>No hospitals found for "{locationInput}"</Text>
                  <TouchableOpacity onPress={clearLocationSearch} style={styles.clearButton}>
                    <Text style={styles.clearButtonText}>Clear Search</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.searchButton, {marginTop: 20}]} 
                    onPress={searchHospitalsByLocation}
                  >
                    <Text style={styles.searchButtonText}>Try Again</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Family Section - First */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Family Members</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          
          {familyMembers.length === 0 ? (
            <View style={styles.emptyStateContainer}>
              <Text style={styles.emptyStateText}>No family members added yet</Text>
            </View>
          ) : (
            familyMembers.map((member) => (
              <View key={member.id} style={styles.familyMemberItem}>
                <Image 
                  source={require("../assets/icons/profile.png")} 
                  style={styles.familyMemberAvatar} 
                />
                <View style={styles.familyMemberInfo}>
                  <Text style={styles.familyMemberName}>{member.name}</Text>
                  <Text style={styles.familyMemberRelation}>
                    {member.relation}{member.age ? ` • ${member.age} years` : ''} • {member.gender ? member.gender.charAt(0).toUpperCase() + member.gender.slice(1) : ''}
                  </Text>
                  {member.medicalConditions ? (
                    <Text style={styles.familyMemberMedical}>
                      Medical: {member.medicalConditions}
                    </Text>
                  ) : null}
                </View>
                <TouchableOpacity 
                  style={styles.familyMemberActionButton}
                  onPress={() => handleManageFamilyMember(member)}
                >
                  <Text style={styles.familyMemberActionText}>Manage</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
          
          {/* Add Family Member Button */}
          <TouchableOpacity 
            style={styles.addFamilyMemberButton}
            onPress={() => setAddFamilyModalVisible(true)}
          >
            <Image 
              source={require("../assets/icons/add-person.png")} 
              style={styles.addFamilyMemberIcon} 
            />
            <Text style={styles.addFamilyMemberText}>Add Family Member</Text>
          </TouchableOpacity>
        </View>

        {/* Upcoming Appointments Section - Second */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Upcoming Appointments</Text>
            <TouchableOpacity onPress={openBookingHistory}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          
          {upcomingAppointments.length === 0 ? (
            <View style={styles.emptyStateContainer}>
              <Text style={styles.emptyStateText}>No upcoming appointments</Text>
              <TouchableOpacity 
                style={styles.searchButton}
                onPress={() => {
                  setLocationInput('');
                  setLocationSearchActive(false);
                  setHospitals([]);
                  searchHospitalsByLocation('');
                }}
              >
                <Text style={styles.searchButtonText}>Find Hospitals</Text>
              </TouchableOpacity>
            </View>
          ) : (
            upcomingAppointments.map((appointment) => (
              <View key={appointment.id} style={styles.appointmentItem}>
                <View style={styles.appointmentHeader}>
                  <View style={styles.appointmentIconContainer}>
                    <Image 
                      source={require("../assets/icons/calendar.png")} 
                      style={styles.appointmentIcon} 
                      resizeMode="contain"
                    />
                  </View>
                  <View style={styles.appointmentInfo}>
                    <Text style={styles.appointmentVaccine}>{appointment.vaccine}</Text>
                    <Text style={styles.appointmentHospital}>{appointment.hospitalName}</Text>
                    <Text style={styles.appointmentDate}>
                      {new Date(appointment.date).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric'
                      })} • {appointment.time}
                    </Text>
                    {appointment.familyMemberName && (
                      <Text style={styles.appointmentPatient}>For: {appointment.familyMemberName}</Text>
                    )}
                  </View>
                </View>
                
                <View style={styles.appointmentActions}>
                  <TouchableOpacity 
                    style={styles.cancelButton}
                    onPress={() => handleCancelAppointment(appointment.id)}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>

        {/* My Certificates Section - Third */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>My Certificates</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Certificates')}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          
          {certificates.length > 0 ? (
            <View style={styles.certificatesContainer}>
              {certificates.map((certificate) => (
                <TouchableOpacity 
                  key={certificate.id} 
                  style={styles.certificateItem}
                  onPress={() => navigation.navigate('Certificates')}
                >
                  <View style={styles.certificateIconContainer}>
                    <Image 
                      source={require("../assets/icons/certificate.png")} 
                      style={styles.certificateIcon} 
                    />
                  </View>
                  <View style={styles.certificateInfo}>
                    <Text style={styles.certificateVaccine}>{certificate.vaccineName}</Text>
                    <Text style={styles.certificateDate}>
                      {new Date(certificate.vaccinationDate).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </Text>
                    <Text style={styles.certificateHospital}>{certificate.hospitalName}</Text>
                  </View>
                  <TouchableOpacity 
                    style={styles.viewCertificateBtn}
                    onPress={() => navigation.navigate('Certificates')}
                  >
                    <Text style={styles.viewCertificateBtnText}>View</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
              
              <TouchableOpacity 
                style={styles.allCertificatesButton}
                onPress={() => navigation.navigate('Certificates')}
              >
                <Text style={styles.allCertificatesButtonText}>All Certificates</Text>
                <Image 
                  source={require("../assets/icons/right-arrow.png")} 
                  style={styles.rightArrowIcon} 
                />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.emptyCertificates}>
              <Image 
                source={require("../assets/icons/certificate.png")} 
                style={[styles.emptyIcon, {tintColor: '#CCCCCC'}]} 
              />
              <Text style={styles.emptyText}>No completed vaccinations yet</Text>
              <TouchableOpacity 
                style={styles.emptyCertificateButton}
                onPress={() => navigation.navigate('Certificates')}
              >
                <Text style={styles.emptyCertificateButtonText}>View Certificates</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Vaccine Information Hub - Restored */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Vaccine Information Hub</Text>
            <TouchableOpacity onPress={() => navigation.navigate('VaccineInfoHub')}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.infoScroll}>
            <TouchableOpacity style={styles.infoCard}>
              <Image source={require("../assets/icons/infant.png")} style={styles.infoIcon} />
              <Text style={styles.infoTitle}>Infant Vaccines</Text>
              <Text style={styles.infoSubtitle}>Birth to 1 Year</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.infoCard}>
              <Image source={require("../assets/icons/child.png")} style={styles.infoIcon} />
              <Text style={styles.infoTitle}>Child Vaccines</Text>
              <Text style={styles.infoSubtitle}>1-12 Years</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.infoCard}>
              <Image source={require("../assets/icons/teen.png")} style={styles.infoIcon} />
              <Text style={styles.infoTitle}>Adolescent Vaccines</Text>
              <Text style={styles.infoSubtitle}>9-18 Years</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.infoCard}>
              <Image source={require("../assets/icons/pregnant.png")} style={styles.infoIcon} />
              <Text style={styles.infoTitle}>Pregnancy Vaccines</Text>
              <Text style={styles.infoSubtitle}>For Expecting Mothers</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </ScrollView>

      {/* AI Assistant Button */}
      <TouchableOpacity 
        style={styles.assistantButton}
        onPress={() => navigation.navigate('VaccineAssistant')}
      >
        <Image 
          source={require('../assets/icons/robot.png')} 
          style={{width: 24, height: 24, tintColor: '#FFFFFF'}} 
        />
      </TouchableOpacity>

      {/* Add Family Member Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={addFamilyModalVisible}
        onRequestClose={() => setAddFamilyModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Family Member</Text>
              <TouchableOpacity onPress={() => setAddFamilyModalVisible(false)}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalFormGroup}>
              <Text style={styles.modalLabel}>Full Name</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Enter name"
                value={newFamilyMember.name}
                onChangeText={(text) => setNewFamilyMember({...newFamilyMember, name: text})}
              />
            </View>
            
            <View style={styles.modalFormGroup}>
              <Text style={styles.modalLabel}>Relationship</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="E.g. Son, Daughter, Spouse"
                value={newFamilyMember.relation}
                onChangeText={(text) => setNewFamilyMember({...newFamilyMember, relation: text})}
              />
            </View>
            
            <View style={styles.modalFormGroup}>
              <Text style={styles.modalLabel}>Age (Optional)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Enter age"
                keyboardType="numeric"
                value={newFamilyMember.age}
                onChangeText={(text) => setNewFamilyMember({...newFamilyMember, age: text})}
              />
            </View>

            <TouchableOpacity 
              style={[styles.viewDbButton, {backgroundColor: '#FFA500', marginTop: 10}]}
              onPress={async () => {
                try {
                  setLoading(true);
                  const result = await migrateHospitalsFromUsersTable();
                  if (result > 0) {
                    Alert.alert("Success", `Migrated ${result} hospitals from users table to hospitals table.`);
                    // Refresh database view to show changes
                    await viewDatabase();
                  } else {
                    Alert.alert("Info", "No hospitals found to migrate.");
                  }
                } catch (error) {
                  Alert.alert("Error", `Failed to migrate hospitals: ${error.message}`);
                } finally {
                  setLoading(false);
                }
              }}
            >
              <Text style={styles.viewDbText}>Fix: Move Hospitals to Correct Table</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.viewDbButton, {backgroundColor: '#28A745', marginTop: 10}]}
              onPress={async () => {
                try {
                  setLoading(true);
                  const result = await fixHospitalsTable();
                  if (result) {
                    Alert.alert("Success", "Hospitals table schema fixed. You can now register hospitals.");
                    // Refresh database view to show changes
                    await viewDatabase();
                  } else {
                    Alert.alert("Error", "Failed to fix hospitals table.");
                  }
                } catch (error) {
                  Alert.alert("Error", `Failed to fix hospitals table: ${error.message}`);
                } finally {
                  setLoading(false);
                }
              }}
            >
              <Text style={styles.viewDbText}>Fix Hospitals Table</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {renderProfileModal()}
      {renderBookAppointmentModal()}
      {renderBookingHistoryModal()}

      {/* Database Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={databaseModalVisible}
        onRequestClose={() => setDatabaseModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, {maxHeight: '80%'}]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Current Database Contents</Text>
              <TouchableOpacity onPress={() => setDatabaseModalVisible(false)}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            {loading ? (
              <ActivityIndicator size="large" color="#4A90E2" />
            ) : (
              <ScrollView style={{maxHeight: '90%'}}>
                {Object.keys(databaseContent).map((key) => (
                  <View key={key} style={styles.dbItemContainer}>
                    <Text style={styles.dbItemKey}>{key}</Text>
                    <Text style={styles.dbItemValue}>
                      {typeof databaseContent[key] === 'object' 
                        ? JSON.stringify(databaseContent[key], null, 2)
                        : databaseContent[key]}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            )}
            
            <View style={{flexDirection: 'row', justifyContent: 'space-between', marginTop: 10}}>
              <TouchableOpacity 
                style={[styles.viewDbButton, {backgroundColor: '#FF3B30', flex: 1, marginRight: 5}]}
                onPress={purgeAllData}
              >
                <Text style={styles.viewDbText}>Purge All Data</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.viewDbButton, {backgroundColor: '#4A90E2', flex: 1, marginLeft: 5}]}
                onPress={() => setDatabaseModalVisible(false)}
              >
                <Text style={styles.viewDbText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F9FF",
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    paddingTop: 40,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  logo: {
    width: 60,
    height: 60,
    resizeMode: "contain",
  },
  userContainer: {
    flex: 1,
    marginLeft: 15,
  },
  greeting: {
    fontSize: 16,
    color: "#666",
  },
  userName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#4A90E2",
  },
  menuButton: {
    padding: 8,
  },
  menuIcon: {
    width: 24,
    height: 24,
    tintColor: "#4A90E2",
  },
  dropdownMenu: {
    backgroundColor: "white",
    margin: 20,
    borderRadius: 15,
    padding: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
  },
  menuItemIcon: {
    width: 20,
    height: 20,
    marginRight: 10,
    tintColor: "#4A90E2",
  },
  menuItemText: {
    fontSize: 16,
    color: "#333",
  },
  searchSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#4A90E2",
    marginBottom: 10,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    padding: 12,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchIcon: {
    width: 20,
    height: 20,
    tintColor: "#4A90E2",
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000',
  },
  scrollView: {
    flex: 1,
    padding: 20,
  },
  quickActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  quickActionButton: {
    flex: 1,
    marginHorizontal: 5,
    borderRadius: 15,
    padding: 15,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quickActionIcon: {
    width: 30,
    height: 30,
    tintColor: "white",
    marginBottom: 8,
  },
  quickActionText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  card: {
    backgroundColor: "white",
    borderRadius: 15,
    padding: 15,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 30,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  seeAllText: {
    color: "#4A90E2",
    fontSize: 14,
  },
  appointmentItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  appointmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  appointmentIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F7FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  appointmentIcon: {
    width: 20,
    height: 20,
    tintColor: '#4A90E2',
  },
  appointmentInfo: {
    flex: 1,
  },
  appointmentVaccine: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  appointmentHospital: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  appointmentDate: {
    fontSize: 12,
    color: '#888',
  },
  appointmentPatient: {
    fontSize: 12,
    color: '#4A90E2',
    marginTop: 2,
  },
  appointmentType: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  appointmentLocation: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },
  appointmentButton: {
    backgroundColor: "#4A90E2",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
  },
  appointmentButtonText: {
    color: "white",
    fontWeight: "600",
  },
  infoScroll: {
    marginTop: 10,
    paddingBottom: 5,
  },
  infoCard: {
    backgroundColor: '#F0F7FF',
    borderRadius: 10,
    padding: 15,
    marginRight: 12,
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#D0E1F9',
  },
  infoIcon: {
    width: 40,
    height: 40,
    marginBottom: 10,
    tintColor: '#4A90E2',
  },
  infoTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 4,
  },
  infoSubtitle: {
    fontSize: 10,
    color: '#666',
    textAlign: 'center',
  },
  aiButton: {
    position: "absolute",
    bottom: 30,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  aiButtonInner: {
    width: "100%",
    height: "100%",
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  aiIcon: {
    width: 35,
    height: 35,
    tintColor: "white",
  },
  familyMemberItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  familyMemberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E0E0E0",
    tintColor: "#4A90E2",
  },
  familyMemberInfo: {
    flex: 1,
    marginLeft: 15,
  },
  familyMemberName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  familyMemberRelation: {
    fontSize: 14,
    color: "#666",
  },
  familyMemberActionButton: {
    backgroundColor: "#4A90E2",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  familyMemberActionText: {
    color: "white",
    fontWeight: "bold",
  },
  addFamilyMemberButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 15,
    marginTop: 5,
    borderStyle: "dashed",
    borderWidth: 1,
    borderColor: "#4A90E2",
    borderRadius: 10,
  },
  addFamilyMemberIcon: {
    width: 24,
    height: 24,
    marginRight: 10,
    tintColor: "#4A90E2",
  },
  addFamilyMemberText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#4A90E2",
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4A90E2',
  },
  modalCloseText: {
    fontSize: 22,
    color: '#666',
  },
  modalFormGroup: {
    marginBottom: 15,
  },
  modalLabel: {
    fontSize: 16,
    marginBottom: 5,
    color: '#333',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  modalAddButton: {
    backgroundColor: '#4A90E2',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  modalAddButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyStateContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    fontStyle: 'italic',
  },
  genderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  genderOption: {
    flex: 1,
    padding: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#f9f9f9',
    marginHorizontal: 4,
    borderRadius: 8,
    alignItems: 'center',
  },
  genderOptionSelected: {
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2',
  },
  genderText: {
    fontSize: 14,
    color: '#333',
  },
  genderTextSelected: {
    color: 'white',
    fontWeight: 'bold',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
    paddingTop: 10,
  },
  familyMemberMedical: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F9FF',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#4A90E2',
  },
  dbItemContainer: {
    marginBottom: 15,
    padding: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  dbItemKey: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4A90E2',
    marginBottom: 5,
  },
  dbItemValue: {
    fontSize: 14,
    color: '#333',
    fontFamily: 'monospace',
  },
  // Add new styles for hospital search
  searchButton: {
    backgroundColor: "#4A90E2",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  searchButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  clearIcon: {
    width: 20,
    height: 20,
    tintColor: "#666",
  },
  searchResults: {
    backgroundColor: "#f9f9f9",
    paddingVertical: 15,
    paddingHorizontal: 10,
    marginTop: 10,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  searchResultsTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#333",
    textAlign: "center",
  },
  hospitalsScrollView: {
    maxHeight: 300,
  },
  hospitalCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    marginVertical: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    overflow: 'hidden',
    borderLeftWidth: 0,
  },
  registeredHospitalCard: {
    borderLeftWidth: 5,
    borderLeftColor: '#006A4E',
  },
  hospitalCardContent: {
    flexDirection: 'row',
    padding: 15,
  },
  hospitalIconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f1f8f6',
  },
  hospitalInfo: {
    flex: 1,
  },
  hospitalName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  hospitalAddress: {
    fontSize: 14,
    color: '#777',
    marginTop: 4,
  },
  registeredBadge: {
    backgroundColor: '#e6f7ef',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginTop: 5,
    alignSelf: 'flex-start',
  },
  registeredText: {
    color: '#006A4E',
    fontSize: 12,
    fontWeight: '600',
  },
  arrowContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  noResultsContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  noResultsText: {
    fontSize: 16,
    color: "#666",
    marginBottom: 10,
    textAlign: "center",
  },
  noResultsSubText: {
    fontSize: 14,
    color: "#888",
    textAlign: "center",
    padding: 10,
  },
  clearButton: {
    backgroundColor: "#4A90E2",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  clearButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  hospitalsScrollViewContent: {
    padding: 10,
  },
  viewDbButton: {
    backgroundColor: '#28A745',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  viewDbIcon: {
    width: 24,
    height: 24,
    marginRight: 10,
    tintColor: 'white',
  },
  viewDbText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Appointment booking styles
  selectedHospitalName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  selectedHospitalAddress: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 15,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  checkButton: {
    backgroundColor: '#4A90E2',
    padding: 12,
    borderRadius: 8,
  },
  checkButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  vaccineOption: {
    padding: 12,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  vaccineOptionSelected: {
    backgroundColor: '#E6F7FF',
    borderColor: '#4A90E2',
  },
  vaccineOptionName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  vaccineOptionNameSelected: {
    color: '#4A90E2',
  },
  vaccineOptionDescription: {
    fontSize: 14,
    color: '#666',
    backgroundColor: '#F0F7FF',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  dateButton: {
    padding: 12,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
  },
  dateButtonText: {
    fontSize: 16,
    color: '#333',
  },
  timeOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 15,
  },
  timeOption: {
    padding: 8,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  timeOptionSelected: {
    backgroundColor: '#E6F7FF',
    borderColor: '#4A90E2',
  },
  timeOptionText: {
    fontSize: 14,
    color: '#333',
  },
  timeOptionTextSelected: {
    color: '#4A90E2',
    fontWeight: 'bold',
  },
  createAppointmentButton: {
    backgroundColor: '#28A745',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  createAppointmentButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  createAppointmentButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  calendarContainer: {
    backgroundColor: '#F8F9FA',
    borderRadius: 10,
    padding: 10,
    marginBottom: 20,
  },
  monthLabelsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  monthLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    padding: 5,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 5,
  },
  calendarDate: {
    width: 40,
    height: 40,
    margin: 5,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  calendarDateWeekend: {
    backgroundColor: '#F0F0F0',
    borderColor: '#E0E0E0',
  },
  calendarDateSelected: {
    backgroundColor: '#4A90E2',
    borderColor: '#2A70C2',
  },
  calendarDateText: {
    fontSize: 14,
    color: '#333',
  },
  calendarDateTextWeekend: {
    color: '#AAA',
  },
  calendarDateTextSelected: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  selectedDateContainer: {
    backgroundColor: '#E8F4FF',
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
    alignItems: 'center',
  },
  selectedDateLabel: {
    fontSize: 14,
    color: '#666',
  },
  selectedDateValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 5,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#D0E1F9',
    borderRadius: 8,
    marginVertical: 10,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  vaccinePicker: {
    height: 50,
    width: '100%',
  },
  vaccinePickerItem: {
    fontSize: 16,
    height: 50,
  },
  vaccinePickerItemText: {
    color: '#000000',
    fontWeight: 'bold',
  },
  selectedVaccineContainer: {
    backgroundColor: '#F0F7FF',
    padding: 15,
    borderRadius: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#D0E1F9',
  },
  selectedVaccineTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 5,
  },
  vaccineDescription: {
    fontSize: 14,
    color: '#333',
    marginBottom: 5,
  },
  vaccineAgeInfo: {
    fontSize: 13,
    color: '#4A90E2',
    fontStyle: 'italic',
  },
  assistantButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#4A90E2',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 999,
  },
  appointmentHistoryItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  appointmentHistoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  appointmentHistoryDate: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4A90E2',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  completedStatusBadge: {
    backgroundColor: '#E8F5E9',
  },
  pendingStatusBadge: {
    backgroundColor: '#FFF8E1',
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  appointmentHistoryBody: {
    paddingTop: 5,
  },
  appointmentHistoryVaccine: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  appointmentHistoryDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  appointmentHistoryIcon: {
    width: 16,
    height: 16,
    marginRight: 6,
    tintColor: '#666',
  },
  appointmentHistoryLabel: {
    fontSize: 14,
    color: '#666',
    width: 70,
  },
  appointmentHistoryValue: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  emptyStateIcon: {
    width: 60,
    height: 60,
    marginBottom: 15,
  },
  emptyStateContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 10,
  },
  emptyStateSubText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
  appointmentPatient: {
    fontSize: 13,
    color: '#4A90E2',
    marginTop: 2,
    fontStyle: 'italic',
  },
  appointmentActions: {
    flexDirection: 'column',
    justifyContent: 'center',
    gap: 5,
  },
  cancelButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  cancelHistoryButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
    alignSelf: 'flex-end',
  },
  cancelHistoryButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  calendarMonthYear: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4A90E2',
    textAlign: 'center',
    flex: 1,
  },
  monthNavButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: '#F0F7FF',
    borderWidth: 1,
    borderColor: '#D0E1F9',
  },
  weekdayLabelsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  weekdayLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
    width: 40,
    textAlign: 'center',
  },
  weekendLabel: {
    color: '#FF9500',
  },
  enhancedCalendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 15,
  },
  calendarDateCell: {
    width: 40,
    height: 40,
    marginHorizontal: 5,
    marginVertical: 5,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  emptyDateCell: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  calendarDateWeekend: {
    backgroundColor: '#FFF8E1',
    borderColor: '#FFE0B2',
  },
  pastDateCell: {
    backgroundColor: '#F5F5F5',
    borderColor: '#E0E0E0',
  },
  calendarDateSelected: {
    backgroundColor: '#4A90E2',
    borderColor: '#2A70C2',
    transform: [{ scale: 1.1 }],
    elevation: 4,
  },
  calendarDateText: {
    fontSize: 16,
    color: '#333',
  },
  calendarDateTextWeekend: {
    color: '#FF9500',
  },
  pastDateText: {
    color: '#AAAAAA',
  },
  calendarDateTextSelected: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  todayIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF3B30',
    position: 'absolute',
    bottom: 4,
  },
  selectedDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F4FF',
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
  },
  selectedDateIcon: {
    marginRight: 8,
  },
  selectedDateValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  timeOptionsContainer: {
    marginBottom: 20,
  },
  timeSlotTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    marginTop: 5,
  },
  timeOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 15,
  },
  timeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 8,
    marginRight: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  timeOptionSelected: {
    backgroundColor: '#4A90E2',
    borderColor: '#2A70C2',
  },
  timeIcon: {
    marginRight: 5,
  },
  timeOptionText: {
    fontSize: 14,
    color: '#333',
  },
  timeOptionTextSelected: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  enhancedCalendarContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  navArrowIcon: {
    width: 24,
    height: 24,
  },
  leftArrowIcon: {
    transform: [{ rotate: '180deg' }],
  },
  // Add these new styles
  certificatesContainer: {
    marginTop: 10,
  },
  certificateItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  certificateIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F0F7FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  certificateIcon: {
    width: 25,
    height: 25,
    tintColor: '#4A90E2',
  },
  certificateInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  certificateVaccine: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  certificateDate: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  certificateHospital: {
    fontSize: 14,
    color: '#666',
  },
  emptyCertificates: {
    alignItems: 'center',
    padding: 20,
  },
  emptyIcon: {
    width: 60,
    height: 60,
    marginBottom: 15,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginBottom: 20,
  },
  emptyCertificateButton: {
    backgroundColor: '#4A90E2',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  emptyCertificateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  viewCertificateBtn: {
    backgroundColor: '#4A90E2',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginLeft: 8,
  },
  viewCertificateBtnText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  allCertificatesButton: {
    backgroundColor: '#F0F7FF',
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#D0E1F9',
  },
  allCertificatesButtonText: {
    color: '#4A90E2',
    fontSize: 14,
    fontWeight: 'bold',
    marginRight: 5,
  },
  rightArrowIcon: {
    width: 14,
    height: 14,
    tintColor: '#4A90E2',
  },
});

export default UserHomeScreen;

