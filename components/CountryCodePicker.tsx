
import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';

export interface CountryCode {
  code: string;
  country: string;
  flag: string;
  digits: number;
}

export const COUNTRY_CODES: CountryCode[] = [
  { code: '39', country: 'Italia', flag: '🇮🇹', digits: 10 },
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
  console.log('CountryCodePicker rendering with selectedCode:', selectedCode);
  console.log('Total country codes available:', COUNTRY_CODES.length);
  
  const selectedCountry = COUNTRY_CODES.find(c => c.code === selectedCode);
  
  return (
    <View style={styles.container}>
      {/* Visual indicator label */}
      <View style={styles.labelContainer}>
        <Text style={styles.label}>Prefisso</Text>
        <IconSymbol
          ios_icon_name="chevron.down"
          android_material_icon_name="arrow_drop_down"
          size={14}
          color={colors.textSecondary}
        />
      </View>
      
      {/* Picker wrapper with visual styling */}
      <View style={styles.pickerWrapper}>
        <Picker
          selectedValue={selectedCode}
          onValueChange={(itemValue) => {
            console.log('Country code changed to:', itemValue);
            onCodeChange(itemValue);
          }}
          style={styles.picker}
          itemStyle={styles.pickerItem}
          enabled={!disabled}
          mode="dropdown"
          dropdownIconColor={colors.primary}
        >
          {COUNTRY_CODES.map((country) => {
            const label = `${country.flag} +${country.code} ${country.country}`;
            console.log('Rendering picker item:', label, 'value:', country.code);
            return (
              <Picker.Item
                key={country.code}
                label={label}
                value={country.code}
                color={colors.text}
              />
            );
          })}
        </Picker>
      </View>
      
      {/* Display current selection below picker for clarity */}
      <View style={styles.selectedIndicator}>
        <Text style={styles.selectedFlag}>{selectedCountry?.flag}</Text>
        <Text style={styles.selectedCode}>+{selectedCode}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minWidth: 130,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    gap: 4,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pickerWrapper: {
    backgroundColor: colors.card,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.primary + '40',
    overflow: 'hidden',
    minHeight: 56,
    justifyContent: 'center',
  },
  picker: {
    color: colors.text,
    height: 56,
    ...Platform.select({
      android: {
        backgroundColor: 'transparent',
      },
      ios: {
        backgroundColor: 'transparent',
      },
    }),
  },
  pickerItem: {
    fontSize: 16,
    color: colors.text,
    height: 120,
  },
  selectedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    gap: 6,
    paddingVertical: 4,
  },
  selectedFlag: {
    fontSize: 20,
  },
  selectedCode: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
});
