import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { Flame } from 'lucide-react';
import { StreakDetailModal } from './StreakDetailModal';

interface StreakStatus {
  currentStreak: number;
  isCompletedToday: boolean;
}

interface StreakFlameWidgetProps {
  token: string | null;
  onRequireAuth: () => void;
}

export const StreakFlameWidget: React.FC<StreakFlameWidgetProps> = ({
  token,
  onRequireAuth,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

  const { data: streak } = useQuery({
    queryKey: ['streak-status', token],
    queryFn: async (): Promise<StreakStatus> => {
      if (!token) return { currentStreak: 0, isCompletedToday: false };
      const res = await axios.get('/api/v1/student/streak/status', {
        headers: authHeaders,
      });
      return res.data.data;
    },
    enabled: Boolean(token),
    refetchInterval: 60000,
  });

  const count = streak?.currentStreak || 0;
  const isDoneToday = streak?.isCompletedToday || false;

  return (
    <>
      <button
        onClick={() => {
          if (!token) {
            onRequireAuth();
            return;
          }
          setIsModalOpen(true);
        }}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all ${
          isDoneToday
            ? 'bg-amber-50 border-amber-300 text-amber-700 shadow-sm'
            : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300'
        }`}
        title={
          isDoneToday
            ? `Chuỗi ${count} ngày chuyên cần (Đã giữ lửa hôm nay 🔥)`
            : `Chuỗi ${count} ngày chuyên cần (Học 1 bài để giữ lửa)`
        }
      >
        <Flame
          className={`h-4 w-4 ${
            isDoneToday
              ? 'fill-amber-500 text-amber-500 animate-pulse'
              : 'text-slate-400'
          }`}
        />
        <span className="text-xs font-black">{count}</span>
      </button>

      {isModalOpen && (
        <StreakDetailModal
          token={token}
          onClose={() => setIsModalOpen(false)}
          onRequireAuth={onRequireAuth}
        />
      )}
    </>
  );
};
