import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Target, Flame, Calendar, Clock, Edit3 } from 'lucide-react-native';
import { useStudentProfile } from '../../hooks/useStudentProfile';
import { SetTargetModal } from './SetTargetModal';

export const ProfileScreen: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const { data, isLoading, refetch } = useStudentProfile();

  if (isLoading) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (!data) {
    return (
      <View className="flex-1 bg-white items-center justify-center p-6">
        <Text className="text-slate-500 text-sm">Không thể nạp thông tin hồ sơ.</Text>
      </View>
    );
  }

  const { user, goal } = data;

  return (
    <ScrollView className="flex-1 bg-slate-50">
      {/* 1. Header học viên */}
      <View className="bg-white p-6 border-b border-slate-200 items-center">
        <Image
          source={{
            uri: user.avatarUrl || 'https://via.placeholder.com/150',
          }}
          className="w-24 h-24 rounded-full border-2 border-blue-600 mb-3"
        />
        <Text className="text-xl font-bold text-slate-800">{user.fullName}</Text>
        <Text className="text-xs text-slate-400 mt-0.5">{user.email}</Text>

        <View className="flex-row items-center bg-amber-50 px-3 py-1.5 rounded-full mt-3 border border-amber-200">
          <Flame size={16} color="#d97706" />
          <Text className="text-xs font-bold text-amber-700 ml-1">
            Chuỗi {user.currentStreak} ngày chuyên cần
          </Text>
        </View>
      </View>

      {/* 2. Khối tiến trình mục tiêu TOEIC */}
      <View className="m-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <View className="flex-row justify-between items-center mb-4">
          <View className="flex-row items-center gap-2">
            <Target size={20} color="#2563eb" />
            <Text className="text-base font-bold text-slate-800">Mục tiêu TOEIC</Text>
          </View>
          <Pressable onPress={() => setIsModalOpen(true)} className="p-1">
            <Edit3 size={18} color="#2563eb" />
          </Pressable>
        </View>

        {/* Điểm so sánh */}
        <View className="flex-row justify-between items-end mb-2">
          <View>
            <Text className="text-xs text-slate-400">Điểm hiện tại</Text>
            <Text className="text-2xl font-extrabold text-slate-700">
              {goal.currentScore}
            </Text>
          </View>
          <View className="items-end">
            <Text className="text-xs text-slate-400">Điểm mục tiêu</Text>
            <Text className="text-2xl font-extrabold text-blue-600">
              {goal.targetScore}
            </Text>
          </View>
        </View>

        {/* Thanh tiến độ */}
        <View className="w-full bg-slate-100 h-3 rounded-full overflow-hidden mb-4">
          <View
            style={{ width: `${goal.progressPercentage}%` }}
            className="bg-blue-600 h-full rounded-full"
          />
        </View>

        {/* Ngày thi & thời gian học */}
        <View className="bg-slate-50 p-3 rounded-xl flex-row justify-between">
          <View className="flex-row items-center gap-1.5">
            <Calendar size={16} color="#64748b" />
            <Text className="text-xs text-slate-600">
              {goal.daysRemaining !== null
                ? `Còn ${goal.daysRemaining} ngày`
                : 'Chưa đặt ngày thi'}
            </Text>
          </View>
          <View className="flex-row items-center gap-1.5">
            <Clock size={16} color="#64748b" />
            <Text className="text-xs text-slate-600">
              {goal.dailyStudyMinutes} phút / ngày
            </Text>
          </View>
        </View>
      </View>

      {/* Modal cập nhật mục tiêu */}
      <SetTargetModal
        isVisible={isModalOpen}
        currentTargetScore={goal.targetScore}
        currentTargetDate={goal.targetExamDate}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          setIsModalOpen(false);
          refetch();
        }}
      />
    </ScrollView>
  );
};

