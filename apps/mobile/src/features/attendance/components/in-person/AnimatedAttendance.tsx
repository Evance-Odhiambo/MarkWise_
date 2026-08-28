import React, { ReactNode, useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { useTheme } from '../../../theme/context/ThemeContext';

interface AnimationContainerProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

interface ActiveAnimationProps extends AnimationContainerProps {
  active?: boolean;
}

/** A subtle scale pulse for success states and attention indicators. */
export function PulseView({
  children,
  style,
  active = true,
}: ActiveAnimationProps) {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!active) {
      scale.stopAnimation();
      scale.setValue(1);
      return undefined;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();

    return () => {
      animation.stop();
      scale.stopAnimation();
    };
  }, [active, scale]);

  return (
    <Animated.View style={[style, { transform: [{ scale }] }]}>
      {children}
    </Animated.View>
  );
}

/** Fades content in while sliding it up into place. */
export function FadeSlideIn({ children, style }: AnimationContainerProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    const animation = Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 500,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]);
    animation.start();

    return () => {
      animation.stop();
      opacity.stopAnimation();
      translateY.stopAnimation();
    };
  }, [opacity, translateY]);

  return (
    <Animated.View style={[style, { opacity, transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  );
}

/** Continuously rotates a loading indicator while an operation is active. */
export function SpinView({
  children,
  style,
  active = true,
}: ActiveAnimationProps) {
  const rotation = useRef(new Animated.Value(0)).current;
  const spin = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  useEffect(() => {
    if (!active) {
      rotation.stopAnimation();
      rotation.setValue(0);
      return undefined;
    }

    const animation = Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    animation.start();

    return () => {
      animation.stop();
      rotation.stopAnimation();
    };
  }, [active, rotation]);

  return (
    <Animated.View style={[style, { transform: [{ rotate: spin }] }]}>
      {children}
    </Animated.View>
  );
}

interface AutoProgressIndicatorProps {
  progress: number;
  message: string;
  style?: StyleProp<ViewStyle>;
}

/** Theme-aware progress bar used while automatic attendance is being verified. */
export function AutoProgressIndicator({
  progress,
  message,
  style,
}: AutoProgressIndicatorProps) {
  const { colors } = useTheme();
  const animatedProgress = useRef(new Animated.Value(0)).current;
  const boundedProgress = Math.max(0, Math.min(100, progress));

  useEffect(() => {
    const animation = Animated.timing(animatedProgress, {
      toValue: boundedProgress,
      duration: 300,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    });
    animation.start();

    return () => {
      animation.stop();
      animatedProgress.stopAnimation();
    };
  }, [animatedProgress, boundedProgress]);

  return (
    <View style={[styles.container, style]}>
      <View
        style={[
          styles.track,
          { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
        ]}
      >
        <Animated.View
          style={[
            styles.fill,
            {
              backgroundColor: colors.primary,
              width: animatedProgress.interpolate({
                inputRange: [0, 100],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        />
      </View>
      <Text style={[styles.message, { color: colors.textSecondary }]}>
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  track: {
    height: 8,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
  },
  fill: { height: '100%', borderRadius: 999 },
  message: { fontSize: 13 },
});
