
import React, { useState } from 'react';
import { View, Text, StyleSheet, Platform, Pressable, Modal, FlatList, Dimensions } from 'react-native';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import * as Haptics from 'expo-haptics';

export interface CountryCode {
  code: string;
  country: string;
  flag: string;
  digits: number;
}

export const COUNTRY_CODES: CountryCode[] = [
  { code: '39', country: 'Italia', flag: '🇮🇹', digits: 9 },
  { code: '1', country: 'USA/Canada', flag: '🇺🇸', digits: 10 },
  { code: '44', country: 'Regno Unito', flag: '🇬🇧', digits: 10 },
  { code: '33', country: 'Francia', flag: '🇫🇷', digits: 9 },
  { code: '49', country: 'Germania', flag: '🇩🇪', digits: 10 },
  { code: '34', country: 'Spagna', flag: '🇪🇸', digits: 9 },
  { code: '41', country: 'Svizzera', flag: '🇨🇭', digits: 9 },
  { code: '43', country: 'Austria', flag: '🇦🇹', digits: 10 },
  { code: '32', country: 'Belgio', flag: '🇧🇪', digits: 9 },
  { code: '31', country: 'Paesi Bassi', flag: '🇳🇱', digits: 9 },
  { code: '351', country: 'Portogallo', flag: '🇵🇹', digits: 9 },
  { code: '30', country: 'Grecia', flag: '🇬🇷', digits: 10 },
  { code: '46', country: 'Svezia', flag: '🇸🇪', digits: 9 },
  { code: '47', country: 'Norvegia', flag: '🇳🇴', digits: 8 },
  { code: '45', country: 'Danimarca', flag: '🇩🇰', digits: 8 },
  { code: '358', country: 'Finlandia', flag: '🇫🇮', digits: 9 },
  { code: '353', country: 'Irlanda', flag: '🇮🇪', digits: 9 },
  { code: '48', country: 'Polonia', flag: '🇵🇱', digits: 9 },
  { code: '420', country: 'Rep. Ceca', flag: '🇨🇿', digits: 9 },
  { code: '36', country: 'Ungheria', flag: '🇭🇺', digits: 9 },
  { code: '40', country: 'Romania', flag: '🇷🇴', digits: 10 },
  { code: '359', country: 'Bulgaria', flag: '🇧🇬', digits: 9 },
  { code: '385', country: 'Croazia', flag: '🇭🇷', digits: 9 },
  { code: '386', country: 'Slovenia', flag: '🇸🇮', digits: 9 },
  { code: '421', country: 'Slovacchia', flag: '🇸🇰', digits: 9 },
  { code: '370', country: 'Lituania', flag: '🇱🇹', digits: 8 },
  { code: '371', country: 'Lettonia', flag: '🇱🇻', digits: 8 },
  { code: '372', country: 'Estonia', flag: '🇪🇪', digits: 7 },
  { code: '356', country: 'Malta', flag: '🇲🇹', digits: 8 },
  { code: '357', country: 'Cipro', flag: '🇨🇾', digits: 8 },
];

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface CountryCodePickerProps {
  selectedCode: string;
  onCodeChange: (code: string) => void;
  disabled?: boolean;
}

export default function CountryCodePicker({ 
  selectedCode, 
  onCodeChange, 
  disabled = false 
}: CountryCodePickerProps) {
  const [modalVisible, setModalVisible] = useState(false);
  
  console.log('CountryCodePicker rendering with selectedCode:', selectedCode);
  console.log('COUNTRY_CODES length:', COUNTRY_CODES.length);
  
  const selectedCountry = COUNTRY_CODES.find(c => c.code === selectedCode) || COUNTRY_CODES[0];

  const handleSelectCountry = (code: string) => {
    console.log('Country code selected:', code);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onCodeChange(code);
    setModalVisible(false);
  };

  const openModal = () => {
    if (!disabled) {
      console.log('Opening country code picker modal');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setModalVisible(true);
    }
  };

  const closeModal = () => {
    console.log('Closing country code picker modal');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setModalVisible(false);
  };

  const renderCountryItem = ({ item }: { item: CountryCode }) => {
    const isSelected = item.code === selectedCode;
    return (
      <Pressable
        style={[
          styles.countryItem,
          isSelected && styles.countryItemSelected
        ]}
        onPress={() => handleSelectCountry(item.code)}
      >
        <Text style={styles.countryFlag}>{item.flag}</Text>
        <View style={styles.countryInfo}>
          <Text style={styles.countryName}>{item.country}</Text>
          <Text style={styles.countryCode}>+{item.code}</Text>
        </View>
        {isSelected && (
          <IconSymbol
            ios_icon_name="checkmark.circle.fill"
            android_material_icon_name="check_circle"
            size={24}
            color={colors.primary}
          />
        )}
      </Pressable>
    );
  };

  return (
    <>
      <Pressable
        style={[
          styles.container,
          disabled && styles.containerDisabled
        ]}
        onPress={openModal}
        disabled={disabled}
      >
        <View style={styles.content}>
          <Text style={styles.flag}>{selectedCountry.flag}</Text>
          <Text style={styles.code}>+{selectedCountry.code}</Text>
          <IconSymbol
            ios_icon_name="chevron.down"
            android_material_icon_name="arrow_drop_down"
            size={18}
            color={disabled ? colors.textTertiary : colors.text}
          />
        </View>
      </Pressable>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <Pressable 
            style={styles.modalBackdrop} 
            onPress={closeModal}
          />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Seleziona Prefisso</Text>
              <Pressable
                style={styles.closeButton}
                onPress={closeModal}
              >
                <IconSymbol
                  ios_icon_name="xmark.circle.fill"
                  android_material_icon_name="cancel"
                  size={28}
                  color={colors.textSecondary}
                />
              </Pressable>
            </View>

            <FlatList
              data={COUNTRY_CODES}
              renderItem={renderCountryItem}
              keyExtractor={(item) => item.code}
              showsVerticalScrollIndicator={true}
              initialNumToRender={15}
              maxToRenderPerBatch={10}
              windowSize={10}
              removeClippedSubviews={false}
              contentContainerStyle={styles.countriesListContent}
              style={styles.flatListStyle}
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 16,
    minWidth: 110,
    height: 56,
    justifyContent: 'center',
  },
  containerDisabled: {
    opacity: 0.5,
    backgroundColor: colors.backgroundSecondary,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  flag: {
    fontSize: 24,
  },
  code: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: SCREEN_HEIGHT * 0.75,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  closeButton: {
    padding: 4,
  },
  flatListStyle: {
    flex: 1,
  },
  countriesListContent: {
    paddingBottom: 20,
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  countryItemSelected: {
    backgroundColor: colors.primary + '08',
  },
  countryFlag: {
    fontSize: 28,
  },
  countryInfo: {
    flex: 1,
  },
  countryName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  countryCode: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});
