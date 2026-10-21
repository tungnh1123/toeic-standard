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
}
