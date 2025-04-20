import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, Image, ScrollView, TextInput, StyleSheet, ActivityIndicator, Modal, Alert } from "react-native";
import { getCurrentUser, logoutUser } from '../services/authService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAppointmentsByHospitalId, addReport, getReportsByCreator, getReportsByPatientId, deleteReport } from '../services/databaseService';
import { purgeAllDataAndReset, manageVaccineInventory, getHospitalInventory, removeVaccine, updateAppointmentStatusData, createWalkInAppointmentData } from '../services/dataService';
import { Picker } from '@react-native-picker/picker';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';

const vaccineData = [
  {
    id: 'bcg',
    name: 'BCG (Bacillus Calmette-Guérin)',
    disease: 'Tuberculosis',
    ageRange: { min: 0, max: 1 }, // At birth
  },
  {
    id: 'hepb',
    name: 'Hepatitis B',
    disease: 'Hepatitis B',
    ageRange: { min: 0, max: 15 }, // At birth, 6-14 weeks
  },
  {
    id: 'opv',
    name: 'OPV (Oral Polio Vaccine)',
    disease: 'Polio',
    ageRange: { min: 0, max: 15 }, // At birth, 6-14 weeks
  },
  {
    id: 'dtp',
    name: 'DTP (Diphtheria, Tetanus, Pertussis)',
    disease: 'Diphtheria, Tetanus, Whooping Cough',
    ageRange: { min: 6, max: 15 }, // 6-14 weeks
  },
  {
    id: 'hib',
    name: 'Hib (Haemophilus influenzae type b)',
    disease: 'Hib infections',
    ageRange: { min: 6, max: 15 }, // 6-14 weeks
  },
  {
    id: 'pcv',
    name: 'PCV (Pneumococcal Conjugate Vaccine)',
    disease: 'Pneumococcal diseases',
    ageRange: { min: 6, max: 36 }, // 6 weeks to 9 months
  },
  {
    id: 'rota',
    name: 'Rotavirus Vaccine',
    disease: 'Rotavirus diarrhea',
    ageRange: { min: 6, max: 10 }, // 6-10 weeks
  },
  {
    id: 'mmr',
    name: 'MMR (Measles, Mumps, Rubella)',
    disease: 'Measles, Mumps, Rubella',
    ageRange: { min: 9, max: 24 }, // 9-24 months
  },
  {
    id: 'td',
    name: 'Td (Tetanus, Diphtheria)',
    disease: 'Tetanus, Diphtheria',
    ageRange: { min: 60, max: 192 }, // 5-16 years
  },
  {
    id: 'hpv',
    name: 'HPV (Human Papillomavirus)',
    disease: 'Cervical cancer',
    ageRange: { min: 108, max: 168 }, // 9-14 years
  },
  {
    id: 'tt',
    name: 'TT (Tetanus Toxoid)',
    disease: 'Tetanus',
    ageRange: { min: 192, max: 540 }, // Pregnant women (assuming 16-45 years)
  },
  {
    id: 'influenza',
    name: 'Influenza Vaccine',
    disease: 'Seasonal Flu',
    ageRange: { min: 6, max: 1200 }, // 6 months and above
  },
  {
    id: 'covid',
    name: 'COVID-19 Vaccine',
    disease: 'COVID-19',
    ageRange: { min: 144, max: 1200 }, // 12 years and above
  },
  {
    id: 'meningitis',
    name: 'Meningococcal Vaccine',
    disease: 'Meningitis',
    ageRange: { min: 132, max: 192 }, // 11-16 years
  },
  {
    id: 'shingles',
    name: 'Shingles Vaccine',
    disease: 'Shingles',
    ageRange: { min: 600, max: 1200 }, // 50 years and above
  },
  {
    id: 'hepa',
    name: 'Hepatitis A Vaccine',
    disease: 'Hepatitis A',
    ageRange: { min: 12, max: 23 }, // 12-23 months
  },
  {
    id: 'rabies',
    name: 'Rabies Vaccine',
    disease: 'Rabies',
    ageRange: { min: 0, max: 1200 }, // Any age (post-exposure)
  },
  {
    id: 'yellowFever',
    name: 'Yellow Fever Vaccine',
    disease: 'Yellow Fever',
    ageRange: { min: 9, max: 1200 }, // 9 months and above
  },
  {
    id: 'typhoid',
    name: 'Typhoid Vaccine',
    disease: 'Typhoid',
    ageRange: { min: 24, max: 1200 }, // 2 years and above
  },
  {
    id: 'tdap',
    name: 'Tdap Vaccine',
    disease: 'Tetanus, Diphtheria, Pertussis',
    ageRange: { min: 192, max: 540 }, // During pregnancy (assuming 16-45 years)
  }
];

// Add these helper functions after the vaccineData array
const formatAgeForDisplay = (ageInMonths) => {
  if (ageInMonths === 0) return "Birth";
  if (ageInMonths < 1) return `${Math.round(ageInMonths * 4)} weeks`;
  if (ageInMonths < 24) return `${ageInMonths} months`;
  return `${Math.floor(ageInMonths / 12)} years`;
};

const getAgeRangeText = (min, max) => {
  if (min === 0 && max === 1) return "At birth";
  if (min === max) return formatAgeForDisplay(min);
  
  if (max >= 1200) {
    return `${formatAgeForDisplay(min)}+`;
  }
  
  return `${formatAgeForDisplay(min)} - ${formatAgeForDisplay(max)}`;
};

const HomeScreenHospital = ({ navigation }) => {
  const [menuVisible, setMenuVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hospital, setHospital] = useState(null);
  const [databaseModalVisible, setDatabaseModalVisible] = useState(false);
  const [databaseContent, setDatabaseContent] = useState({});
  const [appointments, setAppointments] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredAppointments, setFilteredAppointments] = useState([]);
  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [inventory, setInventory] = useState([]);
  const [newVaccine, setNewVaccine] = useState({
    vaccineName: '',
    quantity: '0',
    minAge: '0',
    maxAge: '100',
    description: '',
    selectedVaccine: '',
    ageRangeDisplay: ''
  });
  const [patientModalVisible, setPatientModalVisible] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  
  // Add state for walk-in patient functionality
  const [addPatientModalVisible, setAddPatientModalVisible] = useState(false);
  const [walkInPatient, setWalkInPatient] = useState({
    patientName: '',
    patientAge: '',
    patientGender: 'male', // Default gender
    medicalConditions: '',
    vaccine: '',
  });
  
  // Report functionality state
  const [reportsModalVisible, setReportsModalVisible] = useState(false);
  const [addReportModalVisible, setAddReportModalVisible] = useState(false);
  const [allReportsModalVisible, setAllReportsModalVisible] = useState(false);
  const [reports, setReports] = useState([]);
  const [newReport, setNewReport] = useState({
    patientId: '',
    patientName: '',
    description: '',
    imageData: null,
    reportData: {
      diagnosis: '',
      treatment: '',
      notes: ''
    },
    date: new Date().toISOString().split('T')[0]
  });
  const [patientOptions, setPatientOptions] = useState([]);

  // Add this state for hospital profile
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    location: '',
    phone: '',
    description: ''
  });

  // Load hospital data on component mount
  useEffect(() => {
    const loadHospitalData = async () => {
      try {
        const user = await getCurrentUser();
        if (user && user.userType === "hospital") {
          setHospital(user);
          
          // Load appointments for this hospital from SQLite
          if (user.id) {
            console.log(`Loading appointments for hospital with ID: ${user.id}`);
            // Get appointments where this hospital is the provider
            const hospitalAppointments = await getAppointmentsByHospitalId(user.id);
            console.log(`Found ${hospitalAppointments.length} appointments for this hospital`);
            setAppointments(hospitalAppointments);
            setFilteredAppointments(hospitalAppointments);
          }
        } else {
          // Not logged in as hospital, redirect to login
          navigation.navigate("LoginScreen");
        }
      } catch (error) {
        console.error("Error loading hospital data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadHospitalData();
  }, [navigation]);

  // Function to handle search
  const handleSearch = (text) => {
    setSearchQuery(text);
    if (!text.trim()) {
      setFilteredAppointments(appointments);
      return;
    }
    
    const searchText = text.toLowerCase();
    const filtered = appointments.filter(appointment => {
      const patientName = (appointment.familyMemberName || '').toLowerCase();
      const patientId = (appointment.userId || '').toString().toLowerCase();
      const vaccine = (appointment.vaccine || '').toLowerCase();
      
      return patientName.includes(searchText) || 
             patientId.includes(searchText) || 
             vaccine.includes(searchText);
    });
    
    setFilteredAppointments(filtered);
  };

  const viewDatabase = async () => {
    try {
      setLoading(true);
      // Get all keys from AsyncStorage
      const keys = await AsyncStorage.getAllKeys();
      // Get all data for those keys
      const data = await AsyncStorage.multiGet(keys);
      
      // Create a structured object to display
      const dbContent = {};
      data.forEach(([key, value]) => {
        try {
          dbContent[key] = JSON.parse(value);
        } catch (e) {
          dbContent[key] = value;
        }
      });
      
      // Add SQLite data
      dbContent["sqlite_appointments"] = appointments;
      
      setDatabaseContent(dbContent);
      setDatabaseModalVisible(true);
    } catch (error) {
      console.error("Error viewing database:", error);
      Alert.alert("Error", "Failed to load database content");
    } finally {
      setLoading(false);
    }
  };

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
                  Alert.alert(
                    "Database Purged", 
                    "All data has been deleted. The database is now empty and ready for your new data. You will be logged out now.",
                    [{ 
                      text: "OK", 
                      onPress: async () => {
                        await logoutUser();
                        navigation.navigate("LoginScreen");
                      } 
                    }]
                  );
                } else {
                  Alert.alert("Error", "Failed to purge database. Please try again.");
                  setLoading(false);
                }
              } catch (error) {
                console.error("Error during data purge:", error);
                Alert.alert("Error", "Failed to purge database: " + error.message);
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

  const handleLogout = async () => {
    try {
      await logoutUser();
      navigation.navigate("LoginScreen");
    } catch (error) {
      console.error("Logout error:", error);
      Alert.alert("Error", "Failed to logout. Please try again.");
    }
  };

  const loadInventory = async () => {
    try {
      setLoading(true);
      const vaccines = await getHospitalInventory();
      setInventory(vaccines);
    } catch (error) {
      console.error('Error loading inventory:', error);
      Alert.alert('Error', 'Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  const handleVaccineSelection = (vaccineId) => {
    const selected = vaccineData.find(vaccine => vaccine.id === vaccineId);
    
    if (selected) {
      setNewVaccine({
        ...newVaccine,
        selectedVaccine: vaccineId,
        vaccineName: selected.name,
        minAge: selected.ageRange.min.toString(),
        maxAge: selected.ageRange.max.toString(),
        ageRangeDisplay: getAgeRangeText(selected.ageRange.min, selected.ageRange.max),
        description: `${selected.name} - Protects against ${selected.disease}`
      });
    }
  };

  const handleAddVaccine = async () => {
    if (!newVaccine.vaccineName) {
      Alert.alert('Error', 'Vaccine name is required');
      return;
    }
    
    try {
      setLoading(true);
      
      // Create vaccine data object with numeric values
      const vaccineData = {
        ...newVaccine,
        quantity: parseInt(newVaccine.quantity) || 0,
        minAge: parseInt(newVaccine.minAge) || 0,
        maxAge: parseInt(newVaccine.maxAge) || 100
      };
      
      await manageVaccineInventory(vaccineData);
      
      // Reset form and reload inventory
      setNewVaccine({
        vaccineName: '',
        quantity: '0',
        minAge: '0',
        maxAge: '100',
        description: '',
        selectedVaccine: '',
        ageRangeDisplay: ''
      });
      
      await loadInventory();
      
      Alert.alert('Success', 'Vaccine added to inventory');
    } catch (error) {
      console.error('Error adding vaccine:', error);
      Alert.alert('Error', `Failed to add vaccine: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveVaccine = async (id) => {
    try {
      setLoading(true);
      
      // Confirm deletion
      Alert.alert(
        'Confirm Deletion',
        'Are you sure you want to remove this vaccine from inventory?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => setLoading(false)
          },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              await removeVaccine(id);
              await loadInventory();
              Alert.alert('Success', 'Vaccine removed from inventory');
              setLoading(false);
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error removing vaccine:', error);
      Alert.alert('Error', `Failed to remove vaccine: ${error.message}`);
      setLoading(false);
    }
  };

  const handleUpdateInventory = (id, currentQuantity) => {
    // Find the vaccine to update
    const vaccineToUpdate = inventory.find(v => v.id === id);
    
    if (!vaccineToUpdate) {
      Alert.alert('Error', 'Vaccine not found');
      return;
    }
    
    // Show options for updating inventory
    Alert.alert(
      `Update ${vaccineToUpdate.vaccineName}`,
      `Current quantity: ${currentQuantity} doses`,
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Increase Count',
          onPress: () => {
            Alert.alert(
              'Increase Inventory Count',
              `How many doses of ${vaccineToUpdate.vaccineName} would you like to add?`,
              [
                { text: 'Cancel', style: 'cancel' },
                { 
                  text: '+1', 
                  onPress: () => updateVaccineQuantity(id, vaccineToUpdate, currentQuantity + 1)
                },
                { 
                  text: '+5', 
                  onPress: () => updateVaccineQuantity(id, vaccineToUpdate, currentQuantity + 5)
                },
                { 
                  text: '+10', 
                  onPress: () => updateVaccineQuantity(id, vaccineToUpdate, currentQuantity + 10)
                },
                { 
                  text: 'Custom', 
                  onPress: () => promptForCustomIncrease(id, vaccineToUpdate, currentQuantity)
                }
              ]
            );
          }
        },
        {
          text: 'Decrease Count',
          onPress: () => {
            Alert.alert(
              'Decrease Inventory Count',
              `How many doses of ${vaccineToUpdate.vaccineName} would you like to remove?`,
              [
                { text: 'Cancel', style: 'cancel' },
                { 
                  text: '-1', 
                  onPress: () => updateVaccineQuantity(id, vaccineToUpdate, Math.max(0, currentQuantity - 1))
                },
                { 
                  text: '-5', 
                  onPress: () => updateVaccineQuantity(id, vaccineToUpdate, Math.max(0, currentQuantity - 5))
                },
                { 
                  text: '-10', 
                  onPress: () => updateVaccineQuantity(id, vaccineToUpdate, Math.max(0, currentQuantity - 10))
                },
                { 
                  text: 'Custom', 
                  onPress: () => promptForCustomDecrease(id, vaccineToUpdate, currentQuantity)
                }
              ]
            );
          }
        },
        {
          text: 'Set Exact Amount',
          onPress: () => promptForExactAmount(id, vaccineToUpdate, currentQuantity)
        }
      ]
    );
  };

  // Helper function to prompt for custom increase amount
  const promptForCustomIncrease = (id, vaccineToUpdate, currentQuantity) => {
    setTimeout(() => {
      Alert.prompt(
        'Enter Amount to Add',
        'Enter the number of doses to add:',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Add',
            onPress: (amount) => {
              if (amount && !isNaN(parseInt(amount)) && parseInt(amount) >= 0) {
                const addAmount = parseInt(amount);
                updateVaccineQuantity(id, vaccineToUpdate, currentQuantity + addAmount);
              } else {
                Alert.alert('Error', 'Please enter a valid number');
              }
            }
          }
        ],
        'plain-text',
        ''
      );
    }, 300);
  };

  // Helper function to prompt for custom decrease amount
  const promptForCustomDecrease = (id, vaccineToUpdate, currentQuantity) => {
    setTimeout(() => {
      Alert.prompt(
        'Enter Amount to Remove',
        'Enter the number of doses to remove:',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            onPress: (amount) => {
              if (amount && !isNaN(parseInt(amount)) && parseInt(amount) >= 0) {
                const removeAmount = parseInt(amount);
                updateVaccineQuantity(id, vaccineToUpdate, Math.max(0, currentQuantity - removeAmount));
              } else {
                Alert.alert('Error', 'Please enter a valid number');
              }
            }
          }
        ],
        'plain-text',
        ''
      );
    }, 300);
  };

  // Helper function to prompt for exact amount
  const promptForExactAmount = (id, vaccineToUpdate, currentQuantity) => {
    setTimeout(() => {
      Alert.prompt(
        'Set Exact Quantity',
        'Enter the exact number of doses:',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Update',
            onPress: (amount) => {
              if (amount && !isNaN(parseInt(amount)) && parseInt(amount) >= 0) {
                updateVaccineQuantity(id, vaccineToUpdate, parseInt(amount));
              } else {
                Alert.alert('Error', 'Please enter a valid number');
              }
            }
          }
        ],
        'plain-text',
        currentQuantity.toString()
      );
    }, 300);
  };

  // Helper function to update vaccine quantity
  const updateVaccineQuantity = async (id, vaccineToUpdate, newQuantity) => {
    try {
      setLoading(true);
      
      // Update the quantity
      await manageVaccineInventory({
        ...vaccineToUpdate,
        quantity: newQuantity
      });
      
      await loadInventory();
      Alert.alert('Success', `Inventory updated: ${vaccineToUpdate.vaccineName} now has ${newQuantity} doses`);
    } catch (error) {
      console.error('Error updating inventory:', error);
      Alert.alert('Error', `Failed to update inventory: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Load inventory when the component mounts
  useEffect(() => {
    loadInventory();
  }, []);

  // Add this function right after loadInventory
  const calculateTotalVaccineCount = () => {
    if (!inventory || inventory.length === 0) return 0;
    return inventory.reduce((total, vaccine) => total + (vaccine.quantity || 0), 0);
  };

  // Add function to handle appointment status update
  const handleUpdateStatus = async (appointmentId, status) => {
    try {
      setLoading(true);
      const result = await updateAppointmentStatusData(appointmentId, status);
      
      if (result) {
        // Update the appointment in local state
        const updatedAppointments = appointments.map(appointment => {
          if (appointment.id === appointmentId) {
            return { ...appointment, status };
          }
          return appointment;
        });
        
        setAppointments(updatedAppointments);
        
        // Also update the selected appointment if modal is open
        if (selectedAppointment && selectedAppointment.id === appointmentId) {
          setSelectedAppointment({ ...selectedAppointment, status });
        }
        
        Alert.alert('Success', `Appointment status updated to ${status}`);
      } else {
        Alert.alert('Error', 'Failed to update appointment status');
      }
    } catch (error) {
      console.error('Error updating appointment status:', error);
      Alert.alert('Error', `Failed to update status: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Add function to view patient details
  const handleViewPatient = (appointment) => {
    setSelectedAppointment(appointment);
    setPatientModalVisible(true);
  };

  // Add function to handle adding a walk-in patient
  const handleAddWalkInPatient = async () => {
    // Validate required fields
    if (!walkInPatient.patientName) {
      Alert.alert('Error', 'Patient name is required');
      return;
    }
    
    try {
      setLoading(true);
      
      // Create walk-in appointment
      const newAppointment = await createWalkInAppointmentData(walkInPatient);
      
      // Add appointment to state
      setAppointments(prev => [newAppointment, ...prev]);
      
      // Reset form and close modal
      setWalkInPatient({
        patientName: '',
        patientAge: '',
        patientGender: 'male',
        medicalConditions: '',
        vaccine: '',
      });
      setAddPatientModalVisible(false);
      
      Alert.alert('Success', `Walk-in patient ${newAppointment.familyMemberName} added successfully`);
    } catch (error) {
      console.error('Error adding walk-in patient:', error);
      Alert.alert('Error', `Failed to add walk-in patient: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Add function to refresh appointments
  const refreshAppointments = async () => {
    try {
      setLoading(true);
      if (hospital?.id) {
        const updatedAppointments = await getAppointmentsByHospitalId(hospital.id);
        setAppointments(updatedAppointments);
        setFilteredAppointments(
          searchQuery ? updatedAppointments.filter(app => {
            const patientName = (app.familyMemberName || '').toLowerCase();
            const patientId = (app.userId || '').toString().toLowerCase();
            const vaccine = (app.vaccine || '').toLowerCase();
            const searchText = searchQuery.toLowerCase();
            
            return patientName.includes(searchText) || 
                  patientId.includes(searchText) || 
                  vaccine.includes(searchText);
          }) : updatedAppointments
        );
      }
    } catch (error) {
      console.error('Error refreshing appointments:', error);
      Alert.alert('Error', 'Failed to refresh appointments');
    } finally {
      setLoading(false);
    }
  };

  // Function to handle adding a new report
  const handleAddReport = async () => {
    try {
      if (!newReport.patientId || !newReport.patientName) {
        Alert.alert('Missing Information', 'Please select a patient');
        return;
      }

      if (!newReport.description.trim()) {
        Alert.alert('Missing Information', 'Please add a description');
        return;
      }

      setLoading(true);

      // Prepare report data for SQLite
      const reportToAdd = {
        patientId: newReport.patientId,
        patientName: newReport.patientName,
        description: newReport.description,
        reportData: newReport.reportData,
        imageData: newReport.imageData,
        createdBy: hospital?.id,
        createdByType: 'hospital',
        createdAt: new Date().toISOString()
      };

      // Add report to SQLite database
      const savedReport = await addReport(reportToAdd);
      
      // Update reports state
      setReports(prevReports => [savedReport, ...prevReports]);
      
      // Reset form
      setNewReport({
        patientId: '',
        patientName: '',
        description: '',
        imageData: null,
        reportData: {
          diagnosis: '',
          treatment: '',
          notes: ''
        },
        date: new Date().toISOString().split('T')[0]
      });
      
      setAddReportModalVisible(false);
      setAllReportsModalVisible(true);
      
      Alert.alert('Success', 'Report added successfully');
    } catch (error) {
      console.error('Error adding report:', error);
      Alert.alert('Error', 'Failed to add report');
    } finally {
      setLoading(false);
    }
  };

  // Function to delete a report
  const handleDeleteReport = async (reportId) => {
    try {
      Alert.alert(
        'Delete Report',
        'Are you sure you want to delete this report?',
        [
          {
            text: 'Cancel',
            style: 'cancel'
          },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              setLoading(true);
              
              // Delete from SQLite
              await deleteReport(reportId);
              
              // Update state
              setReports(prevReports => 
                prevReports.filter(report => report.id !== reportId)
              );
              
              Alert.alert('Success', 'Report deleted successfully');
              setLoading(false);
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error deleting report:', error);
      Alert.alert('Error', 'Failed to delete report');
      setLoading(false);
    }
  };

  // Add this function to load reports when needed
  const loadReports = async () => {
    try {
      setLoading(true);
      
      if (hospital?.id) {
        // Get reports created by this hospital
        const hospitalReports = await getReportsByCreator(hospital.id, 'hospital');
        setReports(hospitalReports);
      }
    } catch (error) {
      console.error('Error loading reports:', error);
      Alert.alert('Error', 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  // Function to open reports modal
  const openReportsModal = () => {
    loadReports();
    
    // Create list of patients from appointments for the dropdown
    const patients = appointments.map(appointment => ({
      id: appointment.familyMemberId || appointment.id,
      name: appointment.familyMemberName || 'Unknown Patient'
    }));
    
    // Remove duplicates (a patient might have multiple appointments)
    const uniquePatients = Array.from(new Map(patients.map(patient => 
      [patient.name, patient])).values());
      
    setPatientOptions(uniquePatients);
    setReportsModalVisible(true);
  };
  
  // Function to open add report modal
  const openAddReportModal = () => {
    setReportsModalVisible(false);
    setAddReportModalVisible(true);
  };
  
  // Function to open all reports modal
  const openAllReportsModal = () => {
    setReportsModalVisible(false);
    setAllReportsModalVisible(true);
  };
  
  // Function to handle patient selection for report
  const handlePatientSelect = (patientId, patientName) => {
    setNewReport({
      ...newReport,
      patientId,
      patientName
    });
  };

  // First, let's modify the handleDocumentPick function to show a placeholder message instead of actually picking a document
  const handleDocumentPick = () => {
    Alert.alert(
      'Feature Disabled',
      'Document uploading is currently disabled.',
      [{ text: 'OK' }]
    );
  };

  // Update image capture functionality
  const captureImage = () => {
    launchCamera({
      mediaType: 'photo',
      includeBase64: true,
      quality: 0.8,
    }, response => {
      if (response.didCancel) {
        console.log('User cancelled camera');
      } else if (response.errorCode) {
        console.log('Camera error: ', response.errorMessage);
        Alert.alert('Error', 'Failed to capture image');
      } else {
        // Successfully captured image
        const asset = response.assets[0];
        setNewReport({
          ...newReport,
          imageData: asset.base64
        });
        Alert.alert('Success', 'Image captured successfully');
      }
    });
  };

  // Update image library functionality
  const selectFromLibrary = () => {
    launchImageLibrary({
      mediaType: 'photo',
      includeBase64: true,
      quality: 0.8,
    }, response => {
      if (response.didCancel) {
        console.log('User cancelled photo library');
      } else if (response.errorCode) {
        console.log('ImagePicker error: ', response.errorMessage);
        Alert.alert('Error', 'Failed to select image');
      } else {
        // Successfully selected image
        const asset = response.assets[0];
        setNewReport({
          ...newReport,
          imageData: asset.base64
        });
        Alert.alert('Success', 'Image selected successfully');
      }
    });
  };

  // Replace handleImagePickerResponse with a stub
  const handleImagePickerResponse = (response) => {
    // Placeholder function - no functionality needed
    console.log('Document picker functionality is disabled');
  };

  // Add this function to open the profile modal
  const openProfileModal = () => {
    // Initialize profile data with current hospital data
    setProfileData({
      name: hospital?.name || '',
      email: hospital?.email || '',
      location: hospital?.location || '',
      phone: hospital?.phone || '',
      description: hospital?.description || ''
    });
    setEditingProfile(false);
    setProfileModalVisible(true);
  };

  // Add this function to handle profile updates
  const updateHospitalProfile = async () => {
    try {
      setLoading(true);
      
      // Here you would update the hospital profile in your database
      // This is a placeholder - you'll need to implement the actual database update
      Alert.alert('Success', 'Profile updated successfully');
      
      // Update the local hospital state
      setHospital({
        ...hospital,
        ...profileData
      });
      
      setEditingProfile(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#1E3A8A" />
        <Text style={{ marginTop: 10, fontSize: 16, color: '#1E3A8A' }}>Loading...</Text>
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
        <View style={styles.hospitalContainer}>
          <Text style={styles.welcomeText}>Welcome,</Text>
          <Text style={styles.hospitalName}>{hospital?.name || "Hospital"}</Text>
        </View>
        <TouchableOpacity onPress={() => setMenuVisible(!menuVisible)} style={styles.menuButton}>
          <Image source={require("../assets/icons/menu.png")} style={styles.menuIcon} />
        </TouchableOpacity>
      </View>

      {/* Dropdown Menu */}
      {menuVisible && (
        <View style={styles.dropdownMenu}>
          <TouchableOpacity style={styles.menuItem} onPress={openProfileModal}>
            <Image source={require("../assets/icons/profile.png")} style={styles.menuItemIcon} />
            <Text style={styles.menuItemText}>Hospital Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem}>
            <Image source={require("../assets/icons/staff.png")} style={styles.menuItemIcon} />
            <Text style={styles.menuItemText}>Staff Management</Text>
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
          <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
            <Image source={require("../assets/icons/logout.png")} style={[styles.menuItemIcon, { tintColor: '#FF3B30' }]} />
            <Text style={[styles.menuItemText, { color: '#FF3B30' }]}>Logout</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Quick Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{appointments.length}</Text>
          <Text style={styles.statLabel}>Total Appointments</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            {appointments.filter(app => app.status === 'pending').length}
          </Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            {appointments.filter(app => app.status === 'completed').length}
          </Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
      </View>

      {/* Search Section */}
      <View style={styles.searchSection}>
        <Text style={styles.sectionTitle}>Search Patients</Text>
        <View style={styles.searchContainer}>
          <Image source={require("../assets/icons/search-icon.png")} style={styles.searchIcon} />
          <TextInput 
            placeholder="Enter patient name or ID" 
            style={styles.searchInput}
            placeholderTextColor="#666"
            onChangeText={handleSearch}
            value={searchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity 
              style={styles.clearButton} 
              onPress={() => {
                setSearchQuery('');
                setFilteredAppointments(appointments);
              }}
            >
              <Text style={styles.clearButtonText}>×</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Main Content */}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity 
            style={[styles.quickActionButton, { backgroundColor: '#1E3A8A' }]}
            onPress={() => navigation.navigate('UserHome')}
          >
            <Image source={require("../assets/icons/calendar.png")} style={styles.quickActionIcon} />
            <Text style={styles.quickActionText}>Schedule</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.quickActionButton, { backgroundColor: '#1E3A8A' }]}
            onPress={() => setAddPatientModalVisible(true)}
          >
            <Image source={require("../assets/icons/patient.png")} style={styles.quickActionIcon} />
            <Text style={styles.quickActionText}>Add Patient</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.quickActionButton, { backgroundColor: '#1E3A8A' }]}
            onPress={openReportsModal}
          >
            <Image source={require("../assets/icons/report.png")} style={styles.quickActionIcon} />
            <Text style={styles.quickActionText}>Reports</Text>
          </TouchableOpacity>
        </View>

        {/* Today's Appointments */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Today's Appointments</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          
          {filteredAppointments.length > 0 ? (
            filteredAppointments.map((appointment, index) => (
              <View key={appointment.id || index} style={styles.appointmentItem}>
            <View style={styles.appointmentInfo}>
                  <Text style={styles.appointmentTime}>{appointment.time || '09:00 AM'}</Text>
                  <Text style={styles.appointmentName}>
                    {appointment.familyMemberName || 'Patient'} 
                    {appointment.userId && <Text style={styles.smallText}> (ID: {appointment.userId})</Text>}
                  </Text>
                  <Text style={styles.appointmentType}>{appointment.vaccine || 'General Checkup'}</Text>
                  <Text style={styles.appointmentStatus}>
                    Status: <Text style={styles[`status${appointment.status ? appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1) : 'Pending'}`]}>
                      {appointment.status || 'pending'}
                    </Text>
                  </Text>
            </View>
                <TouchableOpacity 
                  style={styles.appointmentButton}
                  onPress={() => handleViewPatient(appointment)}
                >
              <Text style={styles.appointmentButtonText}>View</Text>
            </TouchableOpacity>
          </View>
            ))
          ) : (
            <View style={styles.noAppointments}>
              <Text style={styles.noAppointmentsText}>No appointments scheduled for today</Text>
            </View>
          )}
        </View>

        {/* Vaccine Inventory */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Vaccine Inventory</Text>
            <TouchableOpacity onPress={() => {
              loadInventory();
              setShowInventoryModal(true);
            }}>
              <Text style={styles.seeAllText}>Manage</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.inventoryDashboard}>
            <View style={styles.totalCountCard}>
              <Text style={styles.totalCountLabel}>Total Vaccines</Text>
              <Text style={styles.totalCountNumber}>{calculateTotalVaccineCount()}</Text>
            </View>
          </View>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.inventoryScroll}>
            {inventory.length === 0 ? (
              <View style={styles.emptyInventoryCard}>
                <Text style={styles.emptyInventoryText}>No vaccines in inventory</Text>
                <TouchableOpacity 
                  style={styles.addInventoryButton}
                  onPress={() => {
                    loadInventory();
                    setShowInventoryModal(true);
                  }}
                >
                  <Text style={styles.addInventoryButtonText}>Add Vaccines</Text>
            </TouchableOpacity>
              </View>
            ) : (
              inventory.map(vaccine => (
                <TouchableOpacity 
                  key={vaccine.id} 
                  style={styles.inventoryCard}
                  onPress={() => handleUpdateInventory(vaccine.id, vaccine.quantity)}
                >
                  <Image 
                    source={
                      vaccine.vaccineName.toLowerCase().includes('covid') ? 
                        require("../assets/icons/covid.png") : 
                      vaccine.vaccineName.toLowerCase().includes('flu') ? 
                        require("../assets/icons/flu.png") : 
                        require("../assets/icons/vaccine.png")
                    } 
                    style={styles.inventoryIcon} 
                  />
                  <Text style={styles.inventoryTitle}>{vaccine.vaccineName}</Text>
                  <Text style={styles.inventoryCount}>{vaccine.quantity} doses</Text>
                  <Text style={styles.inventoryAges}>Ages: {getAgeRangeText(parseInt(vaccine.minAge), parseInt(vaccine.maxAge))}</Text>
            </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>
      </ScrollView>

      {/* Emergency Contact Button */}
      <TouchableOpacity style={styles.emergencyButton}>
        <View style={[styles.emergencyButtonInner, { backgroundColor: '#DC2626' }]}>
          <Image source={require("../assets/icons/emergency.png")} style={styles.emergencyIcon} />
        </View>
      </TouchableOpacity>

      {/* Database Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={databaseModalVisible}
        onRequestClose={() => setDatabaseModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { width: '90%', maxHeight: '80%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Database Contents</Text>
              <TouchableOpacity onPress={() => setDatabaseModalVisible(false)}>
                <Text style={styles.modalCloseText}>✕</Text>
      </TouchableOpacity>
            </View>
            
            <ScrollView style={{ maxHeight: 500 }}>
              {Object.entries(databaseContent).map(([key, value]) => (
                <View key={key} style={styles.dbItemContainer}>
                  <Text style={styles.dbItemKey}>{key}</Text>
                  <Text style={styles.dbItemValue}>
                    {typeof value === 'object' 
                      ? JSON.stringify(value, null, 2) 
                      : value}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Inventory Modal */}
      <Modal
        visible={showInventoryModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowInventoryModal(false)}
        statusBarTranslucent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, {width: '92%'}]}>
            <View style={[styles.modalHeader, {backgroundColor: '#F0F7FF', borderRadius: 8, padding: 10}]}>
              <Text style={styles.modalTitle}>Vaccine Inventory Management</Text>
              <TouchableOpacity onPress={() => setShowInventoryModal(false)}>
                <Text style={[styles.modalCloseText, {fontSize: 24, fontWeight: 'bold'}]}>✕</Text>
              </TouchableOpacity>
            </View>
            
            {loading ? (
              <View style={{padding: 40, alignItems: 'center', backgroundColor: '#FFFFFF'}}>
                <ActivityIndicator size="large" color="#4A90E2" style={{marginVertical: 20}} />
                <Text style={{fontSize: 16, color: '#666'}}>Loading inventory...</Text>
              </View>
            ) : (
              <ScrollView style={{backgroundColor: '#FFFFFF'}} contentContainerStyle={{padding: 10}} showsVerticalScrollIndicator={false}>
                {/* Inventory Summary */}
                <View style={styles.inventorySummary}>
                  <View style={styles.summaryCard}>
                    <Text style={styles.summaryValue}>{inventory.length}</Text>
                    <Text style={styles.summaryLabel}>Vaccine Types</Text>
                  </View>
                  <View style={styles.summaryCard}>
                    <Text style={styles.summaryValue}>{calculateTotalVaccineCount()}</Text>
                    <Text style={styles.summaryLabel}>Total Doses</Text>
                  </View>
                </View>
                
                {/* Inventory List */}
                <View style={styles.inventoryListContainer}>
                  <Text style={styles.inventoryListHeader}>Current Inventory</Text>
                  <View style={{maxHeight: 250}}>
                    {inventory.length === 0 ? (
                      <View style={styles.emptyStateContainer}>
                        <Text style={styles.emptyStateText}>No vaccines in inventory</Text>
                      </View>
                    ) : (
                      inventory.map(vaccine => (
                        <View key={vaccine.id} style={styles.inventoryItem}>
                          <View style={styles.inventoryItemDetails}>
                            <Text style={styles.inventoryItemName}>{vaccine.vaccineName}</Text>
                            <View style={styles.inventoryMeta}>
                              <View style={styles.quantityBadge}>
                                <Text style={styles.quantityText}>{vaccine.quantity} doses</Text>
                              </View>
                              <Text style={styles.ageRangeText}>
                                Ages: {getAgeRangeText(parseInt(vaccine.minAge), parseInt(vaccine.maxAge))}
                              </Text>
                            </View>
                            {vaccine.description ? (
                              <Text style={styles.inventoryItemDescription}>
                                {vaccine.description}
                              </Text>
                            ) : null}
                          </View>
                          <View style={styles.inventoryItemActions}>
                            <TouchableOpacity 
                              style={[styles.actionButton, {backgroundColor: '#4A90E2'}]}
                              onPress={() => handleUpdateInventory(vaccine.id, vaccine.quantity)}
                            >
                              <Text style={styles.actionButtonText}>Update</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                              style={[styles.actionButton, {backgroundColor: '#FF3B30', marginLeft: 5}]}
                              onPress={() => handleRemoveVaccine(vaccine.id)}
                            >
                              <Text style={styles.actionButtonText}>Remove</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))
                    )}
                  </View>
                </View>
                
                {/* Add New Vaccine Form */}
                <View style={styles.addVaccineContainer}>
                  <View style={styles.divider} />
                  <Text style={styles.addVaccineTitle}>Add New Vaccine</Text>
                  
                  <View style={styles.formContainer}>
                    <Text style={styles.inputLabel}>Select Vaccine</Text>
                    <View style={styles.pickerContainer}>
                      <Picker
                        selectedValue={newVaccine.selectedVaccine}
                        style={styles.picker}
                        onValueChange={handleVaccineSelection}
                        mode="dropdown"
                      >
                        <Picker.Item label="-- Select a vaccine --" value="" />
                        {vaccineData.map(vaccine => (
                          <Picker.Item key={vaccine.id} label={vaccine.name} value={vaccine.id} />
                        ))}
                      </Picker>
                    </View>
                    
                    <Text style={styles.inputLabel}>Vaccine Name</Text>
                    <TextInput
                      style={styles.vaccineFormInput}
                      value={newVaccine.vaccineName}
                      onChangeText={(text) => setNewVaccine({...newVaccine, vaccineName: text})}
                      editable={!newVaccine.selectedVaccine}
                    />
                    
                    <View style={styles.rowInputContainer}>
                      <View style={styles.columnInput}>
                        <Text style={styles.inputLabel}>Quantity</Text>
                        <TextInput
                          style={styles.vaccineFormInput}
                          placeholder="0"
                          keyboardType="numeric"
                          value={newVaccine.quantity}
                          onChangeText={(text) => setNewVaccine({...newVaccine, quantity: text})}
                        />
                      </View>
                      {newVaccine.selectedVaccine ? (
                        <View style={styles.columnInput}>
                          <Text style={styles.inputLabel}>Age Range</Text>
                          <View style={[styles.vaccineFormInput, styles.disabledInput, {justifyContent: 'center'}]}>
                            <Text style={{color: '#666'}}>{newVaccine.ageRangeDisplay}</Text>
                          </View>
                        </View>
                      ) : (
                        <>
                          <View style={styles.columnInput}>
                            <Text style={styles.inputLabel}>Min Age</Text>
                            <TextInput
                              style={styles.vaccineFormInput}
                              placeholder="0"
                              keyboardType="numeric"
                              value={newVaccine.minAge}
                              onChangeText={(text) => setNewVaccine({...newVaccine, minAge: text})}
                            />
                          </View>
                          <View style={styles.columnInput}>
                            <Text style={styles.inputLabel}>Max Age</Text>
                            <TextInput
                              style={styles.vaccineFormInput}
                              placeholder="100"
                              keyboardType="numeric"
                              value={newVaccine.maxAge}
                              onChangeText={(text) => setNewVaccine({...newVaccine, maxAge: text})}
                            />
                          </View>
                        </>
                      )}
                    </View>
                    
                    <Text style={styles.inputLabel}>Description (optional)</Text>
                    <TextInput
                      style={[styles.vaccineFormInput, {textAlignVertical: 'top', height: 80}]}
                      placeholder="Enter description of the vaccine"
                      multiline
                      value={newVaccine.description}
                      onChangeText={(text) => setNewVaccine({...newVaccine, description: text})}
                    />
                    
                    <TouchableOpacity 
                      style={styles.addVaccineButton}
                      onPress={handleAddVaccine}
                    >
                      <Text style={styles.addVaccineButtonText}>Add to Inventory</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Add the patient details modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={patientModalVisible}
        onRequestClose={() => setPatientModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Patient Details</Text>
              <TouchableOpacity onPress={() => setPatientModalVisible(false)}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            {selectedAppointment ? (
              <ScrollView>
                <View style={styles.patientDetailSection}>
                  <Text style={styles.patientDetailLabel}>Patient Name:</Text>
                  <Text style={styles.patientDetailValue}>
                    {selectedAppointment.familyMemberName || 'Self'}
                  </Text>
                </View>
                
                {selectedAppointment.patientRelation && (
                  <View style={styles.patientDetailSection}>
                    <Text style={styles.patientDetailLabel}>Relation to Account Holder:</Text>
                    <Text style={styles.patientDetailValue}>{selectedAppointment.patientRelation}</Text>
                  </View>
                )}
                
                {selectedAppointment.patientAge && (
                  <View style={styles.patientDetailSection}>
                    <Text style={styles.patientDetailLabel}>Age:</Text>
                    <Text style={styles.patientDetailValue}>{selectedAppointment.patientAge} years</Text>
                  </View>
                )}
                
                {selectedAppointment.patientGender && (
                  <View style={styles.patientDetailSection}>
                    <Text style={styles.patientDetailLabel}>Gender:</Text>
                    <Text style={styles.patientDetailValue}>
                      {selectedAppointment.patientGender.charAt(0).toUpperCase() + 
                       selectedAppointment.patientGender.slice(1)}
                    </Text>
                  </View>
                )}
                
                {selectedAppointment.patientMedicalConditions && (
                  <View style={styles.patientDetailSection}>
                    <Text style={styles.patientDetailLabel}>Medical Conditions:</Text>
                    <Text style={styles.patientDetailValue}>
                      {selectedAppointment.patientMedicalConditions}
                    </Text>
                  </View>
                )}

                <View style={styles.patientDetailSection}>
                  <Text style={styles.patientDetailLabel}>Account Holder:</Text>
                  <Text style={styles.patientDetailValue}>{selectedAppointment.userName || 'Unknown'}</Text>
                </View>
                
                <View style={styles.patientDetailSection}>
                  <Text style={styles.patientDetailLabel}>Vaccine:</Text>
                  <Text style={styles.patientDetailValue}>{selectedAppointment.vaccine || 'Not specified'}</Text>
                </View>
                
                <View style={styles.patientDetailSection}>
                  <Text style={styles.patientDetailLabel}>Appointment Date:</Text>
                  <Text style={styles.patientDetailValue}>{selectedAppointment.date}</Text>
                </View>
                
                <View style={styles.patientDetailSection}>
                  <Text style={styles.patientDetailLabel}>Time:</Text>
                  <Text style={styles.patientDetailValue}>{selectedAppointment.time}</Text>
                </View>
                
                <View style={styles.patientDetailSection}>
                  <Text style={styles.patientDetailLabel}>Status:</Text>
                  <Text style={[
                    styles.patientDetailValue, 
                    styles[`status${selectedAppointment.status ? selectedAppointment.status.charAt(0).toUpperCase() + selectedAppointment.status.slice(1) : 'Pending'}`]
                  ]}>
                    {selectedAppointment.status || 'Pending'}
                  </Text>
                </View>
                
                <View style={styles.statusButtonsContainer}>
                  <TouchableOpacity 
                    style={[
                      styles.statusButton, 
                      styles.pendingButton,
                      selectedAppointment.status === 'pending' && styles.activeStatusButton
                    ]}
                    onPress={() => handleUpdateStatus(selectedAppointment.id, 'pending')}
                    disabled={selectedAppointment.status === 'pending'}
                  >
                    <Text style={styles.statusButtonText}>Mark as Pending</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[
                      styles.statusButton, 
                      styles.completedButton,
                      selectedAppointment.status === 'completed' && styles.activeStatusButton
                    ]}
                    onPress={() => handleUpdateStatus(selectedAppointment.id, 'completed')}
                    disabled={selectedAppointment.status === 'completed'}
                  >
                    <Text style={styles.statusButtonText}>Mark as Completed</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            ) : (
              <ActivityIndicator size="large" color="#1E3A8A" />
            )}
          </View>
        </View>
      </Modal>

      {/* Add Patient Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={addPatientModalVisible}
        onRequestClose={() => setAddPatientModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Walk-in Patient</Text>
              <TouchableOpacity onPress={() => setAddPatientModalVisible(false)}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={{maxHeight: '80%'}}>
              {/* Patient Name */}
              <View style={styles.modalFormGroup}>
                <Text style={styles.modalLabel}>Patient Name <Text style={{color: 'red'}}>*</Text></Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Enter patient's full name"
                  value={walkInPatient.patientName}
                  onChangeText={(text) => setWalkInPatient({...walkInPatient, patientName: text})}
                />
              </View>
              
              {/* Patient Age */}
              <View style={styles.modalFormGroup}>
                <Text style={styles.modalLabel}>Age</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Enter age"
                  keyboardType="numeric"
                  value={walkInPatient.patientAge}
                  onChangeText={(text) => setWalkInPatient({...walkInPatient, patientAge: text})}
                />
              </View>
              
              {/* Patient Gender */}
              <View style={styles.modalFormGroup}>
                <Text style={styles.modalLabel}>Gender</Text>
                <View style={styles.genderContainer}>
                  <TouchableOpacity 
                    style={[
                      styles.genderOption, 
                      walkInPatient.patientGender === 'male' && styles.genderOptionSelected
                    ]}
                    onPress={() => setWalkInPatient({...walkInPatient, patientGender: 'male'})}
                  >
                    <Text style={[
                      styles.genderText, 
                      walkInPatient.patientGender === 'male' && styles.genderTextSelected
                    ]}>Male</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[
                      styles.genderOption, 
                      walkInPatient.patientGender === 'female' && styles.genderOptionSelected
                    ]}
                    onPress={() => setWalkInPatient({...walkInPatient, patientGender: 'female'})}
                  >
                    <Text style={[
                      styles.genderText, 
                      walkInPatient.patientGender === 'female' && styles.genderTextSelected
                    ]}>Female</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[
                      styles.genderOption, 
                      walkInPatient.patientGender === 'other' && styles.genderOptionSelected
                    ]}
                    onPress={() => setWalkInPatient({...walkInPatient, patientGender: 'other'})}
                  >
                    <Text style={[
                      styles.genderText, 
                      walkInPatient.patientGender === 'other' && styles.genderTextSelected
                    ]}>Other</Text>
                  </TouchableOpacity>
                </View>
              </View>
              
              {/* Vaccine Selection */}
              <View style={styles.modalFormGroup}>
                <Text style={styles.modalLabel}>Vaccine</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={walkInPatient.vaccine}
                    style={styles.picker}
                    onValueChange={(itemValue) => 
                      setWalkInPatient({...walkInPatient, vaccine: itemValue})
                    }
                  >
                    <Picker.Item label="Select a vaccine" value="" />
                    {vaccineData.map(vaccine => (
                      <Picker.Item 
                        key={vaccine.id} 
                        label={vaccine.name} 
                        value={vaccine.name} 
                      />
                    ))}
                  </Picker>
                </View>
              </View>
              
              {/* Medical Conditions */}
              <View style={styles.modalFormGroup}>
                <Text style={styles.modalLabel}>Medical Conditions (Optional)</Text>
                <TextInput
                  style={[styles.modalInput, styles.textArea]}
                  placeholder="Enter any relevant medical conditions, allergies, etc."
                  multiline={true}
                  numberOfLines={3}
                  textAlignVertical="top"
                  value={walkInPatient.medicalConditions}
                  onChangeText={(text) => setWalkInPatient({...walkInPatient, medicalConditions: text})}
                />
              </View>
              
              <TouchableOpacity 
                style={styles.modalAddButton}
                onPress={handleAddWalkInPatient}
              >
                <Text style={styles.modalAddButtonText}>Add Walk-in Patient</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Reports Options Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={reportsModalVisible}
        onRequestClose={() => setReportsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { width: '80%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reports</Text>
              <TouchableOpacity onPress={() => setReportsModalVisible(false)}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity 
              style={styles.reportOptionButton}
              onPress={openAddReportModal}
            >
              <Image source={require("../assets/icons/add-circle.png")} style={styles.reportOptionIcon} />
              <Text style={styles.reportOptionText}>Add New Report</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.reportOptionButton, { marginTop: 15 }]}
              onPress={openAllReportsModal}
            >
              <Image source={require("../assets/icons/view.png")} style={styles.reportOptionIcon} />
              <Text style={styles.reportOptionText}>View All Reports</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      
      {/* Add Report Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={addReportModalVisible}
        onRequestClose={() => setAddReportModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Report</Text>
              <TouchableOpacity onPress={() => setAddReportModalVisible(false)}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={{ maxHeight: '80%' }}>
              {/* Patient Selection */}
              <View style={styles.modalFormGroup}>
                <Text style={styles.modalLabel}>Patient Name <Text style={{color: 'red'}}>*</Text></Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={newReport.patientId}
                    style={styles.picker}
                    onValueChange={(itemValue, itemIndex) => {
                      if (itemValue && patientOptions[itemIndex-1]) {
                        handlePatientSelect(
                          itemValue, 
                          patientOptions[itemIndex-1].name
                        );
                      }
                    }}
                  >
                    <Picker.Item label="Select a patient" value="" />
                    {patientOptions.map(patient => (
                      <Picker.Item 
                        key={patient.id} 
                        label={patient.name} 
                        value={patient.id} 
                      />
                    ))}
                  </Picker>
                </View>
              </View>
              
              {/* Description */}
              <View style={styles.modalFormGroup}>
                <Text style={styles.modalLabel}>Description (Optional)</Text>
                <TextInput
                  style={[styles.modalInput, styles.textArea]}
                  placeholder="Enter report description"
                  multiline={true}
                  numberOfLines={4}
                  textAlignVertical="top"
                  value={newReport.description}
                  onChangeText={(text) => setNewReport({...newReport, description: text})}
                />
              </View>
              
              {/* Diagnosis */}
              <View style={styles.modalFormGroup}>
                <Text style={styles.modalLabel}>Diagnosis</Text>
                <TextInput
                  style={[styles.modalInput, styles.textArea]}
                  placeholder="Enter diagnosis details"
                  multiline={true}
                  numberOfLines={2}
                  textAlignVertical="top"
                  value={newReport.reportData.diagnosis}
                  onChangeText={(text) => setNewReport({
                    ...newReport, 
                    reportData: {...newReport.reportData, diagnosis: text}
                  })}
                />
              </View>

              {/* Treatment */}
              <View style={styles.modalFormGroup}>
                <Text style={styles.modalLabel}>Treatment Plan</Text>
                <TextInput
                  style={[styles.modalInput, styles.textArea]}
                  placeholder="Enter treatment details"
                  multiline={true}
                  numberOfLines={2}
                  textAlignVertical="top"
                  value={newReport.reportData.treatment}
                  onChangeText={(text) => setNewReport({
                    ...newReport, 
                    reportData: {...newReport.reportData, treatment: text}
                  })}
                />
              </View>
              
              <TouchableOpacity 
                style={styles.modalAddButton}
                onPress={handleAddReport}
              >
                <Text style={styles.modalAddButtonText}>Add Report</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
      
      {/* View All Reports Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={allReportsModalVisible}
        onRequestClose={() => setAllReportsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>All Reports</Text>
              <TouchableOpacity onPress={() => setAllReportsModalVisible(false)}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={{ maxHeight: '80%' }}>
              {reports.length > 0 ? (
                reports.map((report) => (
                  <View key={report.id} style={styles.reportItem}>
                    <View style={styles.reportHeader}>
                      <Text style={styles.reportPatientName}>{report.patientName}</Text>
                      <Text style={styles.reportDate}>{report.date}</Text>
                    </View>
                    
                    <View style={styles.reportContent}>
                      {report.fileAttached && (
                        <View style={styles.attachmentContainer}>
                          {report.fileType && report.fileType.startsWith('image/') ? (
                            <Image 
                              source={{ uri: report.fileUri }} 
                              style={styles.documentThumbnail} 
                              resizeMode="cover"
                            />
                          ) : (
                            <View style={styles.attachmentIndicator}>
                              <Image source={require("../assets/icons/file.png")} style={styles.attachmentIcon} />
                              <Text style={styles.attachmentText}>Document attached</Text>
                            </View>
                          )}
                        </View>
                      )}
                      
                      {report.description ? (
                        <Text style={styles.reportDescription}>{report.description}</Text>
                      ) : (
                        <Text style={styles.noDescriptionText}>No description provided</Text>
                      )}
                    </View>
                    
                    <View style={styles.reportActions}>
                      <TouchableOpacity style={styles.viewReportButton}>
                        <Text style={styles.viewReportText}>View Details</Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity 
                        style={styles.deleteReportButton}
                        onPress={() => handleDeleteReport(report.id)}
                      >
                        <Text style={styles.deleteReportText}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              ) : (
                <View style={styles.emptyReportsContainer}>
                  <Image source={require("../assets/icons/report.png")} style={[styles.emptyIcon, {tintColor: '#CCCCCC'}]} />
                  <Text style={styles.emptyReportsText}>No reports available</Text>
                  <TouchableOpacity 
                    style={styles.addFirstReportButton}
                    onPress={() => {
                      setAllReportsModalVisible(false);
                      setTimeout(() => {
                        openAddReportModal();
                      }, 300);
                    }}
                  >
                    <Text style={styles.addFirstReportText}>Add First Report</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Add the hospital profile modal at the end of the return statement */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={profileModalVisible}
        onRequestClose={() => setProfileModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingProfile ? 'Edit Hospital Profile' : 'Hospital Profile'}
              </Text>
              <TouchableOpacity onPress={() => setProfileModalVisible(false)}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={{ maxHeight: '80%' }}>
              {/* Hospital Name */}
              <View style={styles.profileField}>
                <Text style={styles.profileLabel}>Hospital Name</Text>
                {editingProfile ? (
                  <TextInput
                    style={styles.profileInput}
                    value={profileData.name}
                    onChangeText={(text) => setProfileData({...profileData, name: text})}
                    placeholder="Enter hospital name"
                  />
                ) : (
                  <Text style={styles.profileValue}>{profileData.name || 'Not provided'}</Text>
                )}
              </View>
              
              {/* Email */}
              <View style={styles.profileField}>
                <Text style={styles.profileLabel}>Email</Text>
                {editingProfile ? (
                  <TextInput
                    style={styles.profileInput}
                    value={profileData.email}
                    onChangeText={(text) => setProfileData({...profileData, email: text})}
                    placeholder="Enter email"
                    keyboardType="email-address"
                  />
                ) : (
                  <Text style={styles.profileValue}>{profileData.email || 'Not provided'}</Text>
                )}
              </View>
              
              {/* Location */}
              <View style={styles.profileField}>
                <Text style={styles.profileLabel}>Location</Text>
                {editingProfile ? (
                  <TextInput
                    style={styles.profileInput}
                    value={profileData.location}
                    onChangeText={(text) => setProfileData({...profileData, location: text})}
                    placeholder="Enter location"
                  />
                ) : (
                  <Text style={styles.profileValue}>{profileData.location || 'Not provided'}</Text>
                )}
              </View>
              
              {/* Phone Number */}
              <View style={styles.profileField}>
                <Text style={styles.profileLabel}>Phone Number</Text>
                {editingProfile ? (
                  <TextInput
                    style={styles.profileInput}
                    value={profileData.phone}
                    onChangeText={(text) => setProfileData({...profileData, phone: text})}
                    placeholder="Enter phone number"
                    keyboardType="phone-pad"
                  />
                ) : (
                  <Text style={styles.profileValue}>{profileData.phone || 'Not provided'}</Text>
                )}
              </View>
              
              {/* Description */}
              <View style={styles.profileField}>
                <Text style={styles.profileLabel}>Description</Text>
                {editingProfile ? (
                  <TextInput
                    style={[styles.profileInput, styles.textArea]}
                    value={profileData.description}
                    onChangeText={(text) => setProfileData({...profileData, description: text})}
                    placeholder="Enter hospital description"
                    multiline={true}
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                ) : (
                  <Text style={styles.profileValue}>{profileData.description || 'Not provided'}</Text>
                )}
              </View>
              
              {/* Action Buttons */}
              <View style={styles.profileActions}>
                {editingProfile ? (
                  <>
                    <TouchableOpacity 
                      style={[styles.profileButton, styles.cancelButton]}
                      onPress={() => setEditingProfile(false)}
                    >
                      <Text style={styles.profileButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={[styles.profileButton, styles.saveButton]}
                      onPress={updateHospitalProfile}
                    >
                      <Text style={styles.profileButtonText}>Save</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <TouchableOpacity 
                    style={[styles.profileButton, styles.editButton]}
                    onPress={() => setEditingProfile(true)}
                  >
                    <Text style={styles.profileButtonText}>Edit Profile</Text>
                  </TouchableOpacity>
                )}
              </View>
            </ScrollView>
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
  hospitalContainer: {
    flex: 1,
    marginLeft: 15,
  },
  welcomeText: {
    fontSize: 16,
    color: "#666",
  },
  hospitalName: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1E3A8A",
  },
  menuButton: {
    padding: 8,
  },
  menuIcon: {
    width: 24,
    height: 24,
    tintColor: "#1E3A8A",
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
    tintColor: "#1E3A8A",
  },
  menuItemText: {
    fontSize: 16,
    color: "#333",
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 20,
  },
  statCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 15,
    width: "30%",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1E3A8A",
  },
  statLabel: {
    fontSize: 12,
    color: "#666",
    marginTop: 5,
    textAlign: "center",
  },
  searchSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1E3A8A",
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
    tintColor: "#1E3A8A",
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
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
    marginBottom: 15,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  seeAllText: {
    color: "#1E3A8A",
    fontSize: 14,
  },
  appointmentItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  appointmentInfo: {
    flex: 1,
  },
  appointmentTime: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1E3A8A",
  },
  appointmentName: {
    fontSize: 14,
    color: "#333",
    marginTop: 4,
  },
  appointmentType: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  appointmentButton: {
    backgroundColor: "#1E3A8A",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
  },
  appointmentButtonText: {
    color: "white",
    fontWeight: "600",
  },
  inventoryScroll: {
    flexDirection: "row",
  },
  inventoryCard: {
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    padding: 15,
    marginRight: 15,
    width: 120,
    alignItems: "center",
  },
  inventoryIcon: {
    width: 40,
    height: 40,
    tintColor: "#1E3A8A",
    marginBottom: 8,
  },
  inventoryTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
  },
  inventoryCount: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
    marginTop: 4,
  },
  emergencyButton: {
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
  emergencyButtonInner: {
    width: "100%",
    height: "100%",
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  emergencyIcon: {
    width: 35,
    height: 35,
    tintColor: "white",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  modalContent: {
    width: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.8,
    shadowRadius: 15,
    elevation: 24,
    maxHeight: '80%',
    zIndex: 1001,
    borderWidth: 2,
    borderColor: '#1E3A8A',
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
    color: '#1E3A8A',
  },
  modalCloseText: {
    fontSize: 24,
    color: '#666',
    fontWeight: 'bold',
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
    color: '#1E3A8A',
    marginBottom: 5,
  },
  dbItemValue: {
    fontSize: 14,
    color: '#333',
    fontFamily: 'monospace',
  },
  noAppointments: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noAppointmentsText: {
    fontSize: 16,
    color: '#666',
  },
  smallText: {
    fontSize: 12,
    color: '#888',
  },
  appointmentStatus: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  statusPending: {
    color: '#FFA000',
    fontWeight: 'bold',
  },
  statusCompleted: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  // Inventory modal styles
  inventoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
  },
  inventoryItemDetails: {
    flex: 1,
  },
  inventoryItemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  inventoryItemDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  inventoryItemActions: {
    flexDirection: 'row',
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  actionButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 15,
  },
  modalInput: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  emptyStateText: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
    paddingVertical: 20,
  },
  addButton: {
    backgroundColor: '#28A745',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  dashboardCard: {
    backgroundColor: '#28A745',
    borderRadius: 15,
    padding: 15,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  cardIcon: {
    width: 20,
    height: 20,
    tintColor: 'white',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 12,
    color: 'white',
  },
  inventoryDashboard: {
    marginBottom: 15,
  },
  totalCountCard: {
    backgroundColor: '#F0F7FF',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#D0E1F9',
  },
  totalCountLabel: {
    fontSize: 14,
    color: '#1E3A8A',
    fontWeight: '600',
  },
  totalCountNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E3A8A',
    marginTop: 5,
  },
  inventorySummary: {
    flexDirection: 'row',
    marginBottom: 20,
    justifyContent: 'space-around',
  },
  summaryCard: {
    backgroundColor: '#F0F7FF',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    width: '45%',
    borderWidth: 2,
    borderColor: '#D0E1F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1E3A8A',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  inventoryCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 15,
    marginRight: 15,
    width: 120,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  emptyInventoryCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 15,
    marginRight: 15,
    width: 200,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    height: 150,
  },
  emptyInventoryText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 10,
  },
  addInventoryButton: {
    backgroundColor: '#28A745',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addInventoryButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 12,
  },
  inventoryMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  quantityBadge: {
    backgroundColor: '#EBF5FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginRight: 8,
  },
  quantityText: {
    fontSize: 12,
    color: '#1E3A8A',
    fontWeight: '600',
  },
  ageRangeText: {
    fontSize: 12,
    color: '#666',
  },
  emptyStateContainer: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  inventoryListContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  inventoryListHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E3A8A',
    marginBottom: 10,
  },
  addVaccineContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 15,
    marginTop: 0,
    marginBottom: 20,
  },
  addVaccineTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E3A8A',
    marginBottom: 15,
  },
  formContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 15,
    borderWidth: 2,
    borderColor: '#D0E1F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  rowInputContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  columnInput: {
    flex: 1,
    marginHorizontal: 5,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E3A8A',
    marginBottom: 5,
  },
  vaccineFormInput: {
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderWidth: 1,
    borderColor: '#D0E1F9',
    borderRadius: 8,
    fontSize: 14,
    marginBottom: 10,
  },
  addVaccineButton: {
    backgroundColor: '#28A745',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  addVaccineButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#CCCCCC',
    borderRadius: 8,
    marginTop: 5,
    backgroundColor: '#FFFFFF',
  },
  picker: {
    height: 50,
    color: '#000000',
  },
  disabledInput: {
    backgroundColor: '#F0F0F0',
    color: '#666',
  },
  patientDetailSection: {
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    paddingBottom: 10,
  },
  patientDetailLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  patientDetailValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  statusButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  statusButton: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  pendingButton: {
    backgroundColor: '#FFA000',
  },
  completedButton: {
    backgroundColor: '#4CAF50',
  },
  activeStatusButton: {
    opacity: 0.5,
  },
  statusButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  // Gender selection
  genderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 5,
  },
  genderOption: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    marginHorizontal: 3,
    borderRadius: 5,
  },
  genderOptionSelected: {
    backgroundColor: '#1E3A8A',
  },
  genderText: {
    color: '#333',
    fontWeight: '500',
  },
  genderTextSelected: {
    color: '#FFFFFF',
  },
  modalFormGroup: {
    marginBottom: 15,
  },
  modalLabel: {
    fontSize: 14,
    color: '#444',
    marginBottom: 5,
    fontWeight: '500',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#CCCCCC',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  modalAddButton: {
    backgroundColor: '#1E3A8A',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  modalAddButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Report styles
  reportOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F7FF',
    padding: 15,
    borderRadius: 8,
    marginBottom: 5,
    borderWidth: 1,
    borderColor: '#D0E1F9',
  },
  reportOptionIcon: {
    width: 24,
    height: 24,
    marginRight: 10,
    tintColor: '#1E3A8A',
  },
  reportOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E3A8A',
  },
  fileUploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#AAAAAA',
    justifyContent: 'center',
  },
  uploadIcon: {
    width: 24,
    height: 24,
    marginRight: 10,
    tintColor: '#666666',
  },
  uploadText: {
    fontSize: 14,
    color: '#666666',
  },
  reportItem: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  reportPatientName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E3A8A',
  },
  reportDate: {
    fontSize: 12,
    color: '#666666',
  },
  reportContent: {
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingTop: 10,
  },
  attachmentIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  attachmentIcon: {
    width: 16,
    height: 16,
    marginRight: 5,
    tintColor: '#28A745',
  },
  attachmentText: {
    fontSize: 12,
    color: '#28A745',
  },
  reportDescription: {
    fontSize: 14,
    color: '#333333',
    marginTop: 5,
  },
  noDescriptionText: {
    fontSize: 14,
    color: '#999999',
    fontStyle: 'italic',
  },
  viewReportButton: {
    alignSelf: 'flex-end',
    backgroundColor: '#1E3A8A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    marginTop: 10,
  },
  viewReportText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyReportsContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIcon: {
    width: 48,
    height: 48,
    marginBottom: 10,
  },
  emptyReportsText: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 15,
  },
  addFirstReportButton: {
    backgroundColor: '#28A745',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addFirstReportText: {
    color: 'white',
    fontWeight: '600',
  },
  fileInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  selectedFileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0F7FF',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D0E1F9',
  },
  fileIcon: {
    width: 24,
    height: 24,
    marginRight: 10,
    tintColor: '#1E3A8A',
  },
  fileDetails: {
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    color: '#333333',
    fontWeight: '500',
  },
  fileSize: {
    fontSize: 12,
    color: '#666666',
    marginTop: 2,
  },
  removeFileButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FF3B30',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  removeFileText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  documentPreview: {
    width: 100,
    height: 100,
    marginRight: 10,
  },
  documentThumbnail: {
    width: 80,
    height: 80,
    borderRadius: 6,
    marginBottom: 10,
  },
  attachmentContainer: {
    marginBottom: 10,
  },
  reportActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
  },
  deleteReportButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    marginLeft: 8,
  },
  deleteReportText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  profileField: {
    marginBottom: 20,
  },
  profileLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    fontWeight: '500',
  },
  profileValue: {
    fontSize: 16,
    color: '#333',
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  profileInput: {
    fontSize: 16,
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1E3A8A',
  },
  profileActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  profileButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginHorizontal: 10,
    minWidth: 100,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#6C757D',
  },
  saveButton: {
    backgroundColor: '#28A745',
  },
  editButton: {
    backgroundColor: '#1E3A8A',
  },
  profileButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  clearButton: {
    padding: 10,
    marginLeft: 10,
    borderRadius: 15,
    backgroundColor: '#CCCCCC',
  },
  clearButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default HomeScreenHospital;
