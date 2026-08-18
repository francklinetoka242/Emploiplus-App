import React, { useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CONGO_CITIES } from '../lib/congo-locations';

type CityPickerProps = {
  selectedCity: string;
  onCityChange: (city: string) => void;
};

export function CityPicker({ selectedCity, onCityChange }: CityPickerProps) {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCities = CONGO_CITIES.filter((city) =>
    city.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <TouchableOpacity
        style={styles.pickerButton}
        onPress={() => setIsModalVisible(true)}
        activeOpacity={0.85}
      >
        <Text style={styles.pickerButtonText}>{selectedCity || 'Sélectionner une ville'}</Text>
        <Ionicons name="chevron-down" size={18} color="#64748B" />
      </TouchableOpacity>

      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sélectionner une ville</Text>
              <TouchableOpacity onPress={() => setIsModalVisible(false)} hitSlop={10}>
                <Ionicons name="close" size={24} color="#111827" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher une ville..."
              placeholderTextColor="#9ca3af"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />

            <ScrollView style={styles.citiesList} showsVerticalScrollIndicator={false}>
              {filteredCities.map((city, index) => (
                <TouchableOpacity
                  key={`${city}-${index}`}
                  style={[
                    styles.cityOption,
                    selectedCity === city && styles.cityOptionSelected,
                  ]}
                  onPress={() => {
                    onCityChange(city);
                    setIsModalVisible(false);
                    setSearchQuery('');
                  }}
                  activeOpacity={0.85}
                >
                  <Text
                    style={[
                      styles.cityOptionText,
                      selectedCity === city && styles.cityOptionTextSelected,
                    ]}
                  >
                    {city}
                  </Text>
                  {selectedCity === city && (
                    <Ionicons name="checkmark" size={20} color="#00009e" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  pickerButtonText: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 16,
    paddingHorizontal: 16,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  searchInput: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginVertical: 16,
    fontSize: 16,
    color: '#111827',
  },
  citiesList: {
    marginBottom: 24,
  },
  cityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  cityOptionSelected: {
    backgroundColor: '#eef2ff',
  },
  cityOptionText: {
    fontSize: 16,
    color: '#374151',
  },
  cityOptionTextSelected: {
    color: '#00009e',
    fontWeight: '600',
  },
});
