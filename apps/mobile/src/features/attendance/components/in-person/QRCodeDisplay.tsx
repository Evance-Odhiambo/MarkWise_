import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import QRCodeGenerator from '../../../native/NativeQRCodeGenerator';

type Props = { value: string; size?: number };

export const QRCodeDisplay = ({ value, size = 260 }: Props) => {
  const [uri, setUri] = useState<string | null>(null);
  const [error, setError] = useState(false);

  const generate = () => {
    if (!value) return;
    setError(false);
    void QRCodeGenerator.generateBase64(value, size, size)
      .then(base64 => setUri(`data:image/png;base64,${base64}`))
      .catch(() => setError(true));
  };

  useEffect(() => {
    generate();
  }, [value, size]);

  if (error)
    return (
      <TouchableOpacity
        onPress={generate}
        style={{
          width: size,
          height: size,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text>QR generation failed. Tap to retry.</Text>
      </TouchableOpacity>
    );
  if (!uri)
    return (
      <View
        style={{
          width: size,
          height: size,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ActivityIndicator />
      </View>
    );
  return (
    <Image
      source={{ uri }}
      style={{ width: size, height: size }}
      resizeMode="contain"
    />
  );
};
