import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Image } from 'react-native';

const VaccineInfoHub = ({ navigation }) => {
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Vaccine data
  const vaccines = [
    {
      id: 'bcg',
      name: 'BCG (Bacillus Calmette-Guérin)',
      disease: 'Tuberculosis',
      age: 'At birth',
      category: 'infant',
      description: 'Protects against severe forms of tuberculosis',
      schedule: 'Single dose at birth',
      sideEffects: 'Mild fever, swelling at injection site',
    },
    {
      id: 'hepb',
      name: 'Hepatitis B',
      disease: 'Hepatitis B',
      age: 'At birth, 6 weeks, 10 weeks, 14 weeks',
      category: 'infant',
      description: 'Protects against Hepatitis B virus infection',
      schedule: 'Birth dose + 3 doses at 6, 10, and 14 weeks',
      sideEffects: 'Mild fever, soreness at injection site',
    },
    {
      id: 'opv',
      name: 'OPV (Oral Polio Vaccine)',
      disease: 'Polio',
      age: 'At birth, 6 weeks, 10 weeks, 14 weeks',
      category: 'infant',
      description: 'Protects against poliovirus',
      schedule: 'Birth dose + 3 doses at 6, 10, and 14 weeks',
      sideEffects: 'None usually',
    },
    {
      id: 'dtp',
      name: 'DTP (Diphtheria, Tetanus, Pertussis)',
      disease: 'Diphtheria, Tetanus, Whooping Cough',
      age: '6 weeks, 10 weeks, 14 weeks',
      category: 'infant',
      description: 'Combination vaccine for three diseases',
      schedule: '3 doses at 6, 10, and 14 weeks',
      sideEffects: 'Fever, swelling at injection site',
    },
    {
      id: 'hib',
      name: 'Hib (Haemophilus influenzae type b)',
      disease: 'Hib infections',
      age: '6 weeks, 10 weeks, 14 weeks',
      category: 'infant',
      description: 'Protects against Hib infections',
      schedule: '3 doses at 6, 10, and 14 weeks',
      sideEffects: 'Mild fever, soreness',
    },
    {
      id: 'pcv',
      name: 'PCV (Pneumococcal Conjugate Vaccine)',
      disease: 'Pneumococcal diseases',
      age: '6 weeks, 14 weeks, 9 months',
      category: 'infant',
      description: 'Protects against pneumococcal infections',
      schedule: '3 doses at 6, 14 weeks and 9 months',
      sideEffects: 'Mild fever, swelling',
    },
    {
      id: 'rota',
      name: 'Rotavirus Vaccine',
      disease: 'Rotavirus diarrhea',
      age: '6 weeks, 10 weeks',
      category: 'infant',
      description: 'Protects against rotavirus infection',
      schedule: '2 doses at 6 and 10 weeks',
      sideEffects: 'Mild diarrhea, fever',
    },
    {
      id: 'mmr',
      name: 'MMR (Measles, Mumps, Rubella)',
      disease: 'Measles, Mumps, Rubella',
      age: '9-12 months, 16-24 months',
      category: 'child',
      description: 'Combination vaccine for three diseases',
      schedule: '2 doses at 9-12 months and 16-24 months',
      sideEffects: 'Mild fever, rash',
    },
    {
      id: 'td',
      name: 'Td (Tetanus, Diphtheria)',
      disease: 'Tetanus, Diphtheria',
      age: '5-6 years, 10 years, 16 years',
      category: 'child',
      description: 'Booster doses for tetanus and diphtheria',
      schedule: 'At 5-6 years, 10 years, and 16 years',
      sideEffects: 'Mild fever, soreness',
    },
    {
      id: 'hpv',
      name: 'HPV (Human Papillomavirus)',
      disease: 'Cervical cancer',
      age: '9-14 years (girls)',
      category: 'adolescent',
      description: 'Protects against HPV infections',
      schedule: '2 doses 6 months apart',
      sideEffects: 'Mild fever, soreness',
    },
    {
      id: 'tt',
      name: 'TT (Tetanus Toxoid)',
      disease: 'Tetanus',
      age: 'Pregnant women',
      category: 'pregnant',
      description: 'Protects mother and newborn from tetanus',
      schedule: '2 doses during pregnancy',
      sideEffects: 'Mild fever, soreness',
    },
    {
      id: 'influenza',
      name: 'Influenza Vaccine',
      disease: 'Seasonal Flu',
      age: '6 months and above',
      category: 'all',
      description: 'Protects against seasonal influenza',
      schedule: 'Annual vaccination',
      sideEffects: 'Mild fever, soreness',
    },
    {
      id: 'covid',
      name: 'COVID-19 Vaccine',
      disease: 'COVID-19',
      age: '12 years and above',
      category: 'all',
      description: 'Protects against COVID-19',
      schedule: '2 doses + booster as recommended',
      sideEffects: 'Mild fever, soreness, fatigue',
    },
    {
      id: 'meningitis',
      name: 'Meningococcal Vaccine',
      disease: 'Meningitis',
      age: '11-12 years, booster at 16 years',
      category: 'adolescent',
      description: 'Protects against meningococcal disease',
      schedule: '2 doses at 11-12 years and booster at 16 years',
      sideEffects: 'Mild fever, soreness',
    },
    {
      id: 'shingles',
      name: 'Shingles Vaccine',
      disease: 'Shingles',
      age: '50 years and above',
      category: 'all',
      description: 'Protects against shingles',
      schedule: '2 doses 2-6 months apart',
      sideEffects: 'Redness, soreness at injection site',
    },
    {
      id: 'hepa',
      name: 'Hepatitis A Vaccine',
      disease: 'Hepatitis A',
      age: '12-23 months',
      category: 'child',
      description: 'Protects against Hepatitis A virus',
      schedule: '2 doses 6 months apart',
      sideEffects: 'Mild fever, soreness',
    },
    {
      id: 'rabies',
      name: 'Rabies Vaccine',
      disease: 'Rabies',
      age: 'Post-exposure',
      category: 'disease',
      description: 'Protects against rabies virus',
      schedule: 'As recommended',
      sideEffects: 'Soreness, mild fever',
    },
    {
      id: 'yellowFever',
      name: 'Yellow Fever Vaccine',
      disease: 'Yellow Fever',
      age: '9 months and above',
      category: 'disease',
      description: 'Protects against yellow fever virus',
      schedule: 'Single dose',
      sideEffects: 'Mild fever, headache',
    },
    {
      id: 'typhoid',
      name: 'Typhoid Vaccine',
      disease: 'Typhoid',
      age: '2 years and above',
      category: 'disease',
      description: 'Protects against typhoid fever',
      schedule: 'Every 2 years',
      sideEffects: 'Soreness, mild fever',
    },
    {
      id: 'tdap',
      name: 'Tdap Vaccine',
      disease: 'Tetanus, Diphtheria, Pertussis',
      age: 'During each pregnancy',
      category: 'pregnant',
      description: 'Protects against tetanus, diphtheria, and pertussis',
      schedule: 'Single dose',
      sideEffects: 'Mild fever, soreness',
    },
    {
      id: 'influenzaPregnancy',
      name: 'Influenza Vaccine (Pregnancy)',
      disease: 'Seasonal Flu',
      age: 'During pregnancy',
      category: 'pregnant',
      description: 'Protects against seasonal influenza',
      schedule: 'Annual vaccination',
      sideEffects: 'Mild fever, soreness',
    },
  ];

  const categories = [
    { id: 'all', name: 'All Vaccines' },
    { id: 'infant', name: 'Infant Vaccines' },
    { id: 'child', name: 'Child Vaccines' },
    { id: 'adolescent', name: 'Adolescent Vaccines' },
    { id: 'pregnant', name: 'Pregnancy Vaccines' },
    { id: 'disease', name: 'Disease-Specific Vaccines' },
  ];

  const filteredVaccines = selectedCategory === 'all' 
    ? vaccines 
    : vaccines.filter(vaccine => vaccine.category === selectedCategory || (selectedCategory === 'disease' && ['meningitis', 'shingles', 'hepa'].includes(vaccine.id)));

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Image source={require('../assets/icons/back.png')} style={styles.backIcon} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Vaccine Information Hub</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Category Filter */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.categoryContainer}
      >
        {categories.map(category => (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.categoryButton,
              selectedCategory === category.id && styles.selectedCategory
            ]}
            onPress={() => setSelectedCategory(category.id)}
          >
            <Text style={[
              styles.categoryText,
              selectedCategory === category.id && styles.selectedCategoryText
            ]}>
              {category.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Vaccine List */}
      <ScrollView style={styles.vaccineList}>
        {filteredVaccines.map(vaccine => (
          <View key={vaccine.id} style={styles.vaccineCard}>
            <View style={styles.vaccineHeader}>
              <Text style={styles.vaccineName}>{vaccine.name}</Text>
              <View style={styles.ageBadge}>
                <Text style={styles.ageText}>{vaccine.age}</Text>
              </View>
            </View>
            
            <View style={styles.vaccineDetails}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Disease:</Text>
                <Text style={styles.detailValue}>{vaccine.disease}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Schedule:</Text>
                <Text style={styles.detailValue}>{vaccine.schedule}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Description:</Text>
                <Text style={styles.detailValue}>{vaccine.description}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Side Effects:</Text>
                <Text style={styles.detailValue}>{vaccine.sideEffects}</Text>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F9FF',
    paddingBottom: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 50,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backIcon: {
    width: 24,
    height: 24,
    tintColor: '#1E3A8A',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E3A8A',
  },
  categoryContainer: {
   flexDirection: 'row',
    padding: 0,
    backgroundColor: 'white',
    marginBottom: 0,
    height:0,
  },
  categoryButton: {
    width: 150,
    height: 350,
    justifyContent: 'center',
    alignItems: 'center',
    //fontSize:200,
    borderRadius: 10,
    marginHorizontal: 5,
    backgroundColor: '#F3F4F6',
  },
  selectedCategory: {
    backgroundColor: '#1E3A8A',
  },
  categoryText: {
    color: '#666',
    fontSize: 15,
    textAlign: 'center',
  },
  selectedCategoryText: {
    color: 'white',
  },
  vaccineList: {
    flex: 1,
    padding: 0,
    marginTop: 0,
  },
  vaccineCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  vaccineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  vaccineName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E3A8A',
    flex: 1,
  },
  ageBadge: {
    backgroundColor: '#E6F0FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  ageText: {
    color: '#1E3A8A',
    fontSize: 12,
    fontWeight: '600',
  },
  vaccineDetails: {
    marginTop: 10,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  detailLabel: {
    width: 100,
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  detailValue: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
});

export default VaccineInfoHub; 