/// <reference types="react" />

declare module 'react-native' {
  export interface ViewProps {
    children?: React.ReactNode;
    style?: unknown;
    className?: string;
  }
  export const View: React.FC<ViewProps>;

  export interface TextProps {
    children?: React.ReactNode;
    style?: unknown;
    className?: string;
    numberOfLines?: number;
  }
  export const Text: React.FC<TextProps>;

  export interface TextInputProps {
    value?: string;
    onChangeText?: (text: string) => void;
    placeholder?: string;
    placeholderTextColor?: string;
    className?: string;
    keyboardType?: 'default' | 'numeric' | 'email-address';
  }
  export const TextInput: React.FC<TextInputProps>;

  export interface ImageProps {
    source: { uri: string };
    style?: unknown;
    className?: string;
  }
  export const Image: React.FC<ImageProps>;

  export interface PressableProps {
    children?: React.ReactNode;
    onPress?: () => void;
    disabled?: boolean;
    hitSlop?: number;
    className?: string;
    style?: unknown;
  }
  export const Pressable: React.FC<PressableProps>;

  export interface ScrollViewProps {
    children?: React.ReactNode;
    className?: string;
  }
  export const ScrollView: React.FC<ScrollViewProps>;

  export interface FlatListProps<ItemT> {
    data: ItemT[];
    renderItem: (info: { item: ItemT; index: number }) => React.ReactElement | null;
    keyExtractor: (item: ItemT, index: number) => string;
    horizontal?: boolean;
    showsHorizontalScrollIndicator?: boolean;
    className?: string;
    contentContainerStyle?: unknown;
    refreshControl?: React.ReactElement;
    ListEmptyComponent?: React.ReactElement;
  }
  export class FlatList<ItemT> extends React.Component<FlatListProps<ItemT>> {}

  export interface ActivityIndicatorProps {
    size?: 'small' | 'large' | number;
    color?: string;
  }
  export const ActivityIndicator: React.FC<ActivityIndicatorProps>;

  export interface RefreshControlProps {
    refreshing: boolean;
    onRefresh: () => void;
  }
  export const RefreshControl: React.FC<RefreshControlProps>;

  export interface ModalProps {
    visible?: boolean;
    transparent?: boolean;
    animationType?: 'none' | 'slide' | 'fade';
    onRequestClose?: () => void;
    children?: React.ReactNode;
  }
  export const Modal: React.FC<ModalProps>;

  export const Alert: {
    alert: (title: string, message?: string, buttons?: unknown[]) => void;
  };

  export const StyleSheet: {
    create: <T extends Record<string, unknown>>(styles: T) => T;
  };
}

declare module 'react-native-reanimated' {
  export interface SharedValue<T> {
    value: T;
  }
  export function useSharedValue<T>(initialValue: T): SharedValue<T>;
  export function useAnimatedStyle<T extends Record<string, unknown>>(
    updater: () => T,
    dependencies?: unknown[],
  ): T;
  export function withSpring(toValue: number, config?: Record<string, unknown>): number;
  export function interpolate(
    value: number,
    inputRange: number[],
    outputRange: number[],
  ): number;
  export function runOnJS<A extends unknown[], R>(fn: (...args: A) => R): (...args: A) => R;

  export namespace Animated {
    export const View: React.FC<{
      children?: React.ReactNode;
      style?: unknown;
      className?: string;
    }>;
  }
  export default Animated;
}

declare module 'react-native-gesture-handler' {
  export interface GestureType {
    onEnd: (callback: (event: { translationX: number }) => void) => GestureType;
    onUpdate: (callback: (event: { translationX: number }) => void) => GestureType;
    numberOfTaps: (count: number) => GestureType;
  }
  export const Gesture: {
    Tap: () => GestureType;
    Pan: () => GestureType;
    Exclusive: (...gestures: GestureType[]) => GestureType;
  };
  export const GestureDetector: React.FC<{
    gesture: GestureType;
    children: React.ReactNode;
  }>;
}

declare module 'expo-av' {
  export namespace Audio {
    export interface SoundObject {
      sound: {
        playAsync: () => Promise<unknown>;
        unloadAsync: () => Promise<unknown>;
      };
    }
    export const Sound: {
      createAsync: (
        source: { uri: string },
        initialStatus?: { shouldPlay?: boolean; rate?: number; shouldCorrectPitch?: boolean },
      ) => Promise<SoundObject>;
    };
  }
}


