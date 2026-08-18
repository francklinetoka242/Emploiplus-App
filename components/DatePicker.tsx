import React, { useState, useMemo } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type DatePickerProps = {
  selectedDate: string; // Format: YYYY-MM-DD
  onDateChange: (date: string) => void;
};

export function DatePicker({ selectedDate, onDateChange }: DatePickerProps) {
  const [isModalVisible, setIsModalVisible] = useState(false);
  
  // Parse the date
  const parsedDate = useMemo(() => {
    if (!selectedDate) return { year: new Date().getFullYear() - 30, month: 1, day: 1 };
    try {
      const [year, month, day] = selectedDate.split('-').map(Number);
      return { year, month, day };
    } catch {
      return { year: new Date().getFullYear() - 30, month: 1, day: 1 };
    }
  }, [selectedDate]);

  const [tempYear, setTempYear] = useState(parsedDate.year);
  const [tempMonth, setTempMonth] = useState(parsedDate.month);
  const [tempDay, setTempDay] = useState(parsedDate.day);

  // Generate arrays for year, month, and day
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => currentYear - 100 + i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  
  // Calculate days based on month and year
  const daysInMonth = (year: number, month: number) => {
    return new Date(year, month, 0).getDate();
  };
  const maxDays = daysInMonth(tempYear, tempMonth);
  const days = Array.from({ length: maxDays }, (_, i) => i + 1);

  const formatDisplayDate = () => {
    if (!selectedDate) return 'Sélectionner une date';
    try {
      const [year, month, day] = selectedDate.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      return date.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return 'Date invalide';
    }
  };

  const handleConfirm = () => {
    const formattedDate = `${tempYear}-${String(tempMonth).padStart(2, '0')}-${String(tempDay).padStart(2, '0')}`;
    onDateChange(formattedDate);
    setIsModalVisible(false);
  };

  const monthNames = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  return (
    <>
      <TouchableOpacity
        style={styles.pickerButton}
        onPress={() => setIsModalVisible(true)}
        activeOpacity={0.85}
      >
        <View style={styles.buttonContent}>
          <Ionicons name="calendar" size={18} color="#00009e" />
          <Text style={styles.pickerButtonText}>{formatDisplayDate()}</Text>
        </View>
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
              <Text style={styles.modalTitle}>Date de naissance</Text>
              <TouchableOpacity onPress={() => setIsModalVisible(false)} hitSlop={10}>
                <Ionicons name="close" size={24} color="#111827" />
              </TouchableOpacity>
            </View>

            <View style={styles.pickerContainer}>
              <View style={styles.pickerColumn}>
                <Text style={styles.columnLabel}>Jour</Text>
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  snapToInterval={40}
                  scrollEventThrottle={16}
                >
                  {days.map((day, index) => (
                    <TouchableOpacity
                      key={`${day}-${index}`}
                      style={[
                        styles.pickerItem,
                        tempDay === day && styles.pickerItemSelected,
                      ]}
                      onPress={() => setTempDay(day)}
                    >
                      <Text
                        style={[
                          styles.pickerItemText,
                          tempDay === day && styles.pickerItemTextSelected,
                        ]}
                      >
                        {String(day).padStart(2, '0')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.pickerColumn}>
                <Text style={styles.columnLabel}>Mois</Text>
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  snapToInterval={40}
                  scrollEventThrottle={16}
                >
                  {months.map((month, index) => (
                    <TouchableOpacity
                      key={`${month}-${index}`}
                      style={[
                        styles.pickerItem,
                        tempMonth === month && styles.pickerItemSelected,
                      ]}
                      onPress={() => setTempMonth(month)}
                    >
                      <Text
                        style={[
                          styles.pickerItemText,
                          tempMonth === month && styles.pickerItemTextSelected,
                        ]}
                      >
                        {monthNames[month - 1]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.pickerColumn}>
                <Text style={styles.columnLabel}>Année</Text>
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  snapToInterval={40}
                  scrollEventThrottle={16}
                >
                  {years.map((year, index) => (
                    <TouchableOpacity
                      key={`${year}-${index}`}
                      style={[
                        styles.pickerItem,
                        tempYear === year && styles.pickerItemSelected,
                      ]}
                      onPress={() => setTempYear(year)}
                    >
                      <Text
                        style={[
                          styles.pickerItemText,
                          tempYear === year && styles.pickerItemTextSelected,
                        ]}
                      >
                        {year}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setIsModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={handleConfirm}
              >
                <Text style={styles.confirmButtonText}>Confirmer</Text>
              </TouchableOpacity>
            </View>
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
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
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
    maxHeight: '80%',
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
  pickerContainer: {
    flexDirection: 'row',
    height: 220,
    marginVertical: 20,
  },
  pickerColumn: {
    flex: 1,
    alignItems: 'center',
  },
  columnLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 8,
  },
  pickerItem: {
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    minHeight: 40,
    justifyContent: 'center',
  },
  pickerItemSelected: {
    backgroundColor: '#eef2ff',
    borderRadius: 8,
  },
  pickerItemText: {
    fontSize: 16,
    color: '#374151',
  },
  pickerItemTextSelected: {
    color: '#00009e',
    fontWeight: '600',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingBottom: 24,
    paddingTop: 16,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#e2e8f0',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  confirmButton: {
    flex: 1,
    backgroundColor: '#00009e',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});
