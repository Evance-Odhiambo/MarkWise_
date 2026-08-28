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
    const newValue =
      value.substring(0, index) + text + value.substring(index + 1);
    onChangeText(newValue);

    if (text.length === 1 && index < length - 1) {
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
    gap: 12,
  },
  input: {
    width: 56,
    height: 56,
    borderRadius: 12,
    fontSize: 24,
    fontWeight: '600',
  },
});
