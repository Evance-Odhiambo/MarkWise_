import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import QRCodeGenerator from '../../../native/NativeQRCodeGenerator';

type Props = { value: string; size?: number };

export const QRCodeDisplay = ({ value, size = 260 }: Props) => {
  const [uri, setUri] = useState<string | null>(null);
  const [nextUri, setNextUri] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const generationRef = useRef(0);
  const nextOpacity = useRef(new Animated.Value(0)).current;

  const generate = () => {
    if (!value) return;
    const generation = ++generationRef.current;
    setError(false);
    void QRCodeGenerator.generateBase64(value, size, size)
      .then(base64 => {
        if (generation !== generationRef.current) return;
        const generatedUri = `data:image/png;base64,${base64}`;

        // Keep the current QR mounted while the next bitmap is prepared.
        // This prevents a blank frame during native QR generation.
        if (!uri) {
          setUri(generatedUri);
          return;
        }

        setNextUri(generatedUri);
        nextOpacity.setValue(0);
        Animated.timing(nextOpacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }).start(({ finished }) => {
          if (!finished || generation !== generationRef.current) return;
          setUri(generatedUri);
          setNextUri(null);
          nextOpacity.setValue(0);
        });
      })
      .catch(() => {
        if (generation === generationRef.current && !uri) setError(true);
      });
  };

  useEffect(() => {
    setNextUri(null);
    nextOpacity.setValue(0);
    generate();
    return () => {
      generationRef.current += 1;
      nextOpacity.stopAnimation();
    };
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
    <View style={{ width: size, height: size }}>
      <Image
        source={{ uri }}
        style={{ width: size, height: size }}
        resizeMode="contain"
      />
      {nextUri && (
        <Animated.Image
          source={{ uri: nextUri }}
          style={{
            position: 'absolute',
            width: size,
            height: size,
            opacity: nextOpacity,
          }}
          resizeMode="contain"
        />
      )}
    </View>
  );
};
