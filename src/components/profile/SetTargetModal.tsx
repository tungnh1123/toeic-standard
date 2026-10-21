import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { X, Target, Calendar, Clock } from 'lucide-react-native';
import { useSetTargetScore } from '../../hooks/useStudentProfile';

export interface SetTargetModalProps {
  isVisible: boolean;
  currentTargetScore: number;
  currentTargetDate: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const SetTargetModal: React.FC<SetTargetModalProps> = ({
  isVisible,
  currentTargetScore,
  currentTargetDate,
  onClose,
  onSuccess,
}) => {
  const [targetScore, setTargetScore] = useState<string>(
    currentTargetScore ? currentTargetScore.toString() : '650',
  );
  const [targetDate, setTargetDate] = useState<string>(
    currentTargetDate || new Date().toISOString().split('T')[0],
  );
  const [dailyMinutes, setDailyMinutes] = useState<string>('30');

  const setTargetMutation = useSetTargetScore();

  const handleSave = async (): Promise<void> => {
    const scoreNum = parseInt(targetScore, 10);
    const minutesNum = parseInt(dailyMinutes, 10);

    if (isNaN(scoreNum) || scoreNum < 10 || scoreNum > 990) {
      Alert.alert('Lỗi nhập liệu', 'Mục tiêu điểm số phải từ 10 đến 990.');
      return;
    }

    if (scoreNum % 5 !== 0) {
      Alert.alert('Lỗi định dạng', 'Điểm thi TOEIC phải là bội số của 5.');
      return;
    }

    try {
      await setTargetMutation.mutateAsync({
        targetScore: scoreNum,
        targetExamDate: targetDate,
        dailyStudyMinutes: !isNaN(minutesNum) ? minutesNum : 30,
      });
      onSuccess();
      onClose();
    } catch (error: unknown) {
      const msg =
        typeof error === 'object' && error !== null && 'message' in error
          ? String((error as { message: unknown }).message)
          : 'Không thể cập nhật mục tiêu.';
      Alert.alert('Cập nhật thất bại', msg);
    }
  };

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end bg-black/40">
        <View className="bg-white rounded-t-3xl p-6 shadow-xl">
          <View className="flex-row justify-between items-center mb-6">
            <View className="flex-row items-center gap-2">
              <Target size={22} color="#2563eb" />
              <Text className="text-lg font-bold text-slate-800">
                Thiết lập mục tiêu TOEIC
              </Text>
            </View>
            <Pressable onPress={onClose} className="p-1">
              <X size={20} color="#64748b" />
            </Pressable>
          </View>

          {/* 1. Nhập điểm mục tiêu */}
          <View className="mb-4">
            <Text className="text-xs font-semibold text-slate-600 mb-1">
              Điểm mục tiêu (10 – 990, bội số của 5)
            </Text>
            <TextInput
              value={targetScore}
              onChangeText={setTargetScore}
              keyboardType="numeric"
              placeholder="Ví dụ: 750"
              className="border border-slate-200 rounded-xl px-4 py-3 text-slate-800 font-bold text-base"
            />
          </View>

          {/* 2. Ngày thi dự kiến */}
          <View className="mb-4">
            <View className="flex-row items-center gap-1 mb-1">
              <Calendar size={14} color="#64748b" />
              <Text className="text-xs font-semibold text-slate-600">
                Ngày thi dự kiến (YYYY-MM-DD)
              </Text>
            </View>
            <TextInput
              value={targetDate}
              onChangeText={setTargetDate}
              placeholder="2026-12-31"
              className="border border-slate-200 rounded-xl px-4 py-3 text-slate-800 text-sm"
            />
          </View>

          {/* 3. Thời gian học mỗi ngày */}
          <View className="mb-6">
            <View className="flex-row items-center gap-1 mb-1">
              <Clock size={14} color="#64748b" />
              <Text className="text-xs font-semibold text-slate-600">
                Thời gian học mỗi ngày (Phút)
              </Text>
            </View>
            <TextInput
              value={dailyMinutes}
              onChangeText={setDailyMinutes}
              keyboardType="numeric"
              placeholder="30"
              className="border border-slate-200 rounded-xl px-4 py-3 text-slate-800 text-sm"
            />
          </View>

          {/* Nút xác nhận */}
          <Pressable
            onPress={handleSave}
            disabled={setTargetMutation.isPending}
            className="w-full bg-blue-600 py-3.5 rounded-xl items-center justify-center flex-row"
          >
            {setTargetMutation.isPending ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text className="text-white font-bold text-base">Lưu mục tiêu</Text>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

