import React, { useRef } from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/context/ThemeContext';

type PinInputProps = {
  value: string;
  onChangeText: (text: string) => void;
  length?: number;
};

export const PinInput = ({
  value,
  onChangeText,
  length = 6,
}: PinInputProps) => {
  const { isDark } = useTheme();
  const inputs = useRef<Array<any>>([]);

  const handleChange = (text: string, index: number) => {
    const digits = text.replace(/\D/g, '');
    // Some Android keyboards deliver pasted/autofilled text to one field.
    // Distribute it across the fields instead of losing digits.
    if (digits.length > 1) {
      const next = value.split('');
      digits
        .slice(0, length - index)
        .split('')
        .forEach((digit, offset) => {
          next[index + offset] = digit;
        });
      onChangeText(next.join('').slice(0, length));
      inputs.current[Math.min(index + digits.length, length - 1)]?.focus();
      return;
    }
    const next = value.split('');
    next[index] = digits;
    const newValue = next.join('').slice(0, length);
    onChangeText(newValue);

    if (digits.length === 1 && index < length - 1) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (index: number, key: string) => {
    if (key === 'Backspace' && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const inputClasses = isDark
    ? 'bg-slate-800 text-white border border-slate-700'
    : 'bg-slate-100 text-slate-900 border border-slate-300';

  return (
    <View style={styles.container}>
      {Array.from({ length }).map((_, index) => (
        <TextInput
          key={index}
          ref={ref => {
            inputs.current[index] = ref;
          }}
          style={styles.input}
          className={inputClasses}
          value={value.length > index ? value[index] : ''}
          onChangeText={text => handleChange(text, index)}
          onKeyPress={({ nativeEvent }) =>
            handleKeyPress(index, nativeEvent.key)
          }
          keyboardType="number-pad"
          maxLength={1}
          textAlign="center"
          secureTextEntry
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
    paddingHorizontal: 2,
  },
  input: {
    width: 46,
    height: 52,
    borderRadius: 12,
    fontSize: 24,
    fontWeight: '600',
    marginHorizontal: 3,
  },
});
