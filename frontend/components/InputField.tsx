import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { TextInput, View } from 'react-native';

interface InputFieldProps {
  icon: string;
  multiline?: boolean;
  theme: {
    accent: string;
    bg: string;
    border: string;
    subText: string;
    text: string;
  };
  styles: any;
  placeholder?: string;
  value?: string;
  onChangeText?: (text: string) => void;
  keyboardType?: 'default' | 'numeric' | 'email-address' | 'phone-pad';
  editable?: boolean;
}

export function InputField({
  icon,
  multiline,
  theme,
  styles,
  ...props
}: InputFieldProps & React.ComponentProps<typeof TextInput>) {
  return (
    <View
      style={[
        styles.inputWrapper,
        multiline && { alignItems: 'flex-start', paddingTop: 12 },
      ]}
    >
      <MaterialIcons
        name={icon as any}
        size={20}
        color={theme.accent}
        style={{ marginRight: 10 }}
      />
      <TextInput
        style={[
          styles.input,
          multiline && { minHeight: 60, textAlignVertical: 'top' },
        ]}
        placeholderTextColor={theme.subText}
        multiline={multiline}
        {...props}
      />
    </View>
  );
}
