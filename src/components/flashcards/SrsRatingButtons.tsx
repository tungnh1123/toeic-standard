import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';

export interface SrsRatingButtonsProps {
  currentInterval?: number;
  easeFactor?: number;
  disabled?: boolean;
  onRate: (rating: 1 | 2 | 3 | 4) => void;
}

export const SrsRatingButtons: React.FC<SrsRatingButtonsProps> = ({
  currentInterval = 0,
  easeFactor = 2.50,
  disabled = false,
  onRate,
}) => {
  // Dự đoán khoảng cách số ngày ôn tập để hiển thị nhãn phụ
  const predictDays = (rating: number): string => {
    if (rating === 1) return 'Học lại';
    if (rating === 2) return '1 ngày';
    if (rating === 3) {
      if (currentInterval === 0) return '1 ngày';
      if (currentInterval === 1) return '6 ngày';
      return `${Math.round(currentInterval * easeFactor)} ngày`;
    }
    // rating === 4 (Dễ)
    const boostEf = easeFactor + 0.1;
    if (currentInterval === 0) return '4 ngày';
    return `${Math.round(Math.max(6, currentInterval * boostEf))} ngày`;
  };

  return (
    <View style={styles.container}>
      {/* 1. NÚT QUÊN */}
      <Pressable
        onPress={() => !disabled && onRate(1)}
        disabled={disabled}
        style={[styles.btn, styles.btnForgot, disabled && styles.btnDisabled]}
      >
        <Text style={styles.btnTitle}>Quên (1)</Text>
        <Text style={styles.btnSub}>{predictDays(1)}</Text>
      </Pressable>

      {/* 2. NÚT KHÓ */}
      <Pressable
        onPress={() => !disabled && onRate(2)}
        disabled={disabled}
        style={[styles.btn, styles.btnHard, disabled && styles.btnDisabled]}
      >
        <Text style={styles.btnTitle}>Khó (2)</Text>
        <Text style={styles.btnSub}>{predictDays(2)}</Text>
      </Pressable>

      {/* 3. NÚT TỐT */}
      <Pressable
        onPress={() => !disabled && onRate(3)}
        disabled={disabled}
        style={[styles.btn, styles.btnGood, disabled && styles.btnDisabled]}
      >
        <Text style={styles.btnTitle}>Tốt (3)</Text>
        <Text style={styles.btnSub}>{predictDays(3)}</Text>
      </Pressable>

      {/* 4. NÚT DỄ */}
      <Pressable
        onPress={() => !disabled && onRate(4)}
        disabled={disabled}
        style={[styles.btn, styles.btnEasy, disabled && styles.btnDisabled]}
      >
        <Text style={styles.btnTitle}>Dễ (4)</Text>
        <Text style={styles.btnSub}>{predictDays(4)}</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    width: '100%',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  btnForgot: {
    backgroundColor: '#ef4444',
  },
  btnHard: {
    backgroundColor: '#f59e0b',
  },
  btnGood: {
    backgroundColor: '#3b82f6',
  },
  btnEasy: {
    backgroundColor: '#10b981',
  },
  btnTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  btnSub: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
  },
});
