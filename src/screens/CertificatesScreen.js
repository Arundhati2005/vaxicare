import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  Alert,
  Modal,
  Share
} from 'react-native';
import { getUserAppointmentsData } from '../services/dataService';
import { getCurrentUser } from '../services/authService';
import Ionicons from 'react-native-vector-icons/Ionicons';

const CertificatesScreen = ({ navigation }) => {
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [generatingCertificate, setGeneratingCertificate] = useState(false);
  const [selectedCertificate, setSelectedCertificate] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [loadingError, setLoadingError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  // Local function to get completed vaccinations
  const getCompletedVaccinations = (appointments, user) => {
    try {
      // Filter appointments to only completed ones
      const completedAppointments = appointments.filter(
        appointment => appointment.status === 'completed'
      );
      
      console.log(`Found ${completedAppointments.length} completed appointments out of ${appointments.length} total`);
      
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

  useEffect(() => {
    // Initialize and load data
    const initialize = async () => {
      try {
        setLoading(true);
        setLoadingError(null);
        const currentUser = await getCurrentUser();
        setUser(currentUser);
        
        await loadCertificates(currentUser);
      } catch (error) {
        console.error('Error initializing certificates screen:', error);
        setLoadingError(error.message || 'Failed to load certificates');
        Alert.alert(
          'Error',
          'Failed to load certificates. Please try again later.',
          [
            {text: 'OK'},
            {text: 'Retry', onPress: () => setRetryCount(prev => prev + 1)}
          ]
        );
      } finally {
        setLoading(false);
      }
    };

    initialize();
  }, [retryCount]);

  const loadCertificates = async (currentUser) => {
    try {
      // Get all user appointments
      console.log('Loading user appointments for certificates...');
      let appointments = [];
      
      try {
        appointments = await getUserAppointmentsData();
        
        // Validate appointments data
        if (!appointments) {
          console.log('No appointments returned from getUserAppointmentsData');
          appointments = [];
        }
      } catch (appointmentError) {
        console.error('Error fetching appointments:', appointmentError);
        appointments = [];
      }
      
      console.log(`Fetched ${appointments.length} total appointments`);
      
      // Filter to completed vaccinations using the local function
      const completedVaccinations = getCompletedVaccinations(appointments, currentUser || user);
      console.log(`Found ${completedVaccinations.length} completed vaccinations`);
      
      setCertificates(completedVaccinations);
    } catch (error) {
      console.error('Error loading certificates:', error);
      setLoadingError(error.message || 'Failed to load certificates');
      Alert.alert('Error', 'Failed to load certificates');
    }
  };

  const handleViewCertificate = (certificate) => {
    setSelectedCertificate(certificate);
    setModalVisible(true);
  };

  const handleShareCertificateDetails = async (certificate) => {
    try {
      setGeneratingCertificate(true);
      
      // Format date for sharing
      const formattedDate = new Date(certificate.vaccinationDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      // Create a simple text message with certificate details
      const certificateText = 
        `🔵 VaxiCare Vaccination Certificate 🔵\n\n` +
        `Patient: ${certificate.patientName}\n` +
        `Vaccine: ${certificate.vaccineName}\n` +
        `Date: ${formattedDate}\n` +
        `Facility: ${certificate.hospitalName}\n\n` +
        `Certificate ID: VAX-${certificate.appointmentId}\n\n` +
        `This certificate serves as an official record of vaccination.\n` +
        `For any inquiries, please contact VaxiCare support.`;
      
      // Share the text information
      await Share.share({
        message: certificateText,
        title: 'VaxiCare Vaccination Certificate'
      });
      
    } catch (error) {
      console.error('Error sharing certificate:', error);
      Alert.alert(
        'Error',
        'Failed to share certificate information. Please try again later.'
      );
    } finally {
      setGeneratingCertificate(false);
    }
  };

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
  };

  const renderCertificateItem = ({ item }) => {
    // Format date
    const formattedDate = new Date(item.vaccinationDate).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
    
    return (
      <TouchableOpacity 
        style={styles.certificateItem}
        onPress={() => handleViewCertificate(item)}
      >
        <View style={styles.certificateHeader}>
          <View style={styles.certificateIconContainer}>
            <Image 
              source={require('../assets/icons/certificate.png')} 
              style={styles.certificateIcon} 
            />
          </View>
          <View style={styles.certificateInfo}>
            <Text style={styles.vaccineName}>{item.vaccineName}</Text>
            <Text style={styles.patientName}>Patient: {item.patientName}</Text>
            <Text style={styles.hospitalName}>{item.hospitalName}</Text>
            <Text style={styles.vaccinationDate}>{formattedDate}</Text>
          </View>
        </View>
        
        <TouchableOpacity 
          style={styles.downloadButton}
          onPress={() => handleViewCertificate(item)}
          disabled={generatingCertificate}
        >
          {generatingCertificate ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Image 
                source={require('../assets/icons/certificate.png')} 
                style={styles.downloadIcon} 
              />
              <Text style={styles.downloadText}>View Certificate</Text>
            </>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const renderCertificateDetails = () => {
    if (!selectedCertificate) return null;

    const formattedDate = new Date(selectedCertificate.vaccinationDate).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Vaccination Certificate</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.certificatePreview}>
              <Image 
                source={require('../assets/Vaxilogo.png')} 
                style={styles.certificateLogo} 
                resizeMode="contain"
              />
              
              <Text style={styles.certificateTitle}>
                Vaccination Certificate
              </Text>
              
              <View style={styles.certificateDetailsContainer}>
                <Text style={styles.certificateText}>
                  This is to certify that <Text style={styles.certificateBold}>{selectedCertificate.patientName}</Text> has successfully received the <Text style={styles.certificateBold}>{selectedCertificate.vaccineName}</Text> vaccine on <Text style={styles.certificateBold}>{formattedDate}</Text> at <Text style={styles.certificateBold}>{selectedCertificate.hospitalName}</Text>. The vaccination has been completed as per the prescribed schedule, and the record has been duly registered with VaxiCare.
                </Text>
              </View>
              
              <Image 
                source={require('../assets/icons/medal.png')} 
                style={styles.medalIcon} 
                resizeMode="contain"
              />
              
              <Text style={styles.certificateFooter}>
                Certificate ID: VAX-{selectedCertificate.appointmentId}
              </Text>
            </View>
            
            <TouchableOpacity 
              style={styles.shareButton}
              onPress={() => handleShareCertificateDetails(selectedCertificate)}
              disabled={generatingCertificate}
            >
              {generatingCertificate ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.shareButtonText}>Share Certificate Details</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Certificates</Text>
      </View>
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
          <Text style={styles.loadingText}>Loading certificates...</Text>
        </View>
      ) : loadingError ? (
        <View style={styles.errorContainer}>
          <Image 
            source={require('../assets/icons/info.png')} 
            style={styles.errorIcon} 
          />
          <Text style={styles.errorTitle}>Error Loading Certificates</Text>
          <Text style={styles.errorText}>{loadingError}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={handleRetry}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : certificates.length > 0 ? (
        <FlatList
          data={certificates}
          renderItem={renderCertificateItem}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.listContainer}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Image 
            source={require('../assets/icons/certificate.png')} 
            style={styles.emptyIcon} 
          />
          <Text style={styles.emptyTitle}>No Certificates Yet</Text>
          <Text style={styles.emptyText}>
            You don't have any completed vaccination records yet. Certificates will appear here once your vaccination is marked as completed by the healthcare provider.
          </Text>
        </View>
      )}
      
      {renderCertificateDetails()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  header: {
    backgroundColor: '#4A90E2',
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 15,
  },
  listContainer: {
    padding: 15,
  },
  certificateItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    marginBottom: 15,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  certificateHeader: {
    flexDirection: 'row',
    marginBottom: 15,
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
  },
  vaccineName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  patientName: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  hospitalName: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  vaccinationDate: {
    fontSize: 12,
    color: '#888',
  },
  downloadButton: {
    backgroundColor: '#4A90E2',
    padding: 10,
    borderRadius: 5,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  downloadIcon: {
    width: 16,
    height: 16,
    tintColor: '#FFFFFF',
    marginRight: 8,
  },
  downloadText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    tintColor: '#CCC',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalCloseText: {
    fontSize: 22,
    color: '#999',
  },
  certificatePreview: {
    padding: 20,
    borderWidth: 1,
    borderColor: '#4A90E2',
    borderRadius: 8,
    marginBottom: 20,
    alignItems: 'center',
  },
  certificateLogo: {
    width: 120,
    height: 60,
    marginBottom: 15,
  },
  certificateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4A90E2',
    marginBottom: 20,
    textAlign: 'center',
  },
  certificateDetailsContainer: {
    marginVertical: 20,
  },
  certificateText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 22,
    textAlign: 'center',
  },
  certificateBold: {
    fontWeight: 'bold',
  },
  medalIcon: {
    width: 50,
    height: 50,
    marginVertical: 15,
  },
  certificateFooter: {
    fontSize: 12,
    color: '#999',
    marginTop: 10,
  },
  shareButton: {
    backgroundColor: '#4A90E2',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
  },
  shareButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  errorIcon: {
    width: 50,
    height: 50,
    tintColor: '#FF3B30',
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#4A90E2',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default CertificatesScreen; 