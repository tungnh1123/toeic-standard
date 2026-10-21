import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import {
  X,
  Flame,
  ShieldCheck,
  Award,
  Lock,
  CheckCircle2,
  Calendar,
  Sparkles,
} from 'lucide-react';

interface StreakBadgeItem {
  id: string;
  code: string;
  title: string;
  description: string;
  milestoneDays: number;
  iconUrl: string;
  rewardExp: number;
  isUnlocked: boolean;
  unlockedAt: string | null;
}

interface StreakStatus {
  currentStreak: number;
  longestStreak: number;
  isCompletedToday: boolean;
  freezeCreditsRemaining: number;
  lastActivityDate: string;
  streakStartedDate: string;
  daysToNextMilestone: number;
  nextMilestoneBadge: StreakBadgeItem | null;
}

interface DayActivityItem {
  date: string;
  count: number;
  level: number;
  isFrozen: boolean;
}

interface StreakCalendar {
  totalActiveDays: number;
  activities: DayActivityItem[];
}

interface StreakDetailModalProps {
  token: string | null;
  onClose: () => void;
  onRequireAuth: () => void;
}

export const StreakDetailModal: React.FC<StreakDetailModalProps> = ({
  token,
  onClose,
  onRequireAuth,
}) => {
  const queryClient = useQueryClient();
  const [freezeToast, setFreezeToast] = useState<string | null>(null);

  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

  // 1. Tải trạng thái Streak
  const { data: streakStatus } = useQuery({
    queryKey: ['streak-status', token],
    queryFn: async (): Promise<StreakStatus> => {
      if (!token) {
        onRequireAuth();
        throw new Error('Vui lòng đăng nhập');
      }
      const res = await axios.get('/api/v1/student/streak/status', {
        headers: authHeaders,
      });
      return res.data.data;
    },
    enabled: Boolean(token),
  });

  // 2. Tải ma trận Heatmap 365 ngày
  const { data: calendarData } = useQuery({
    queryKey: ['streak-calendar', token],
    queryFn: async (): Promise<StreakCalendar> => {
      const res = await axios.get('/api/v1/student/streak/calendar', {
        headers: authHeaders,
      });
      return res.data.data;
    },
    enabled: Boolean(token),
  });

  // 3. Tải danh sách Huy hiệu
  const { data: badgesData } = useQuery({
    queryKey: ['streak-badges', token],
    queryFn: async () => {
      const res = await axios.get('/api/v1/student/streak/badges', {
        headers: authHeaders,
      });
      return res.data.data;
    },
    enabled: Boolean(token),
  });

  // 4. Mutation kích hoạt vé Streak Freeze
  const freezeMutation = useMutation({
    mutationFn: async () => {
      const res = await axios.post(
        '/api/v1/student/streak/freeze',
        {},
        { headers: authHeaders },
      );
      return res.data.data;
    },
    onSuccess: (data) => {
      setFreezeToast(data.message);
      setTimeout(() => setFreezeToast(null), 4000);
      queryClient.invalidateQueries({ queryKey: ['streak-status'] });
      queryClient.invalidateQueries({ queryKey: ['streak-calendar'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });

  // Build calendar map for quick lookup
  const activityMap = new Map<string, DayActivityItem>();
  calendarData?.activities.forEach((act) => {
    activityMap.set(act.date, act);
  });

  // Generate the last 14 weeks (98 days) for heatmap visualization
  const pastDays: string[] = [];
  const todayObj = new Date();
  for (let i = 97; i >= 0; i--) {
    const d = new Date(todayObj);
    d.setDate(d.getDate() - i);
    pastDays.push(d.toISOString().split('T')[0]);
  }

  const badges: StreakBadgeItem[] = badgesData?.badges || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-3xl bg-white shadow-2xl overflow-hidden my-6">
        {/* Header with Flame Animation */}
        <div className="relative overflow-hidden bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 p-6 sm:p-8 text-center text-white">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 flex h-9 w-9 items-center justify-center rounded-full bg-black/10 text-white hover:bg-black/20 transition"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-3xl bg-white/20 backdrop-blur-md shadow-inner animate-pulse">
            <Flame className="h-12 w-12 fill-white text-white drop-shadow-md" />
          </div>

          <h2 className="text-3xl font-black tracking-tight">
            Chuỗi {streakStatus?.currentStreak || 0} Ngày Chuyên Cần!
          </h2>

          <p className="mt-1 text-xs sm:text-sm font-semibold text-amber-100">
            {streakStatus?.isCompletedToday
              ? 'Tuyệt vời! Bạn đã hoàn thành bài học hôm nay để giữ lửa 🔥'
              : 'Hôm nay bạn chưa học, hãy hoàn thành 1 bài để duy trì chuỗi nhé!'}
          </p>

          {/* Quick Metrics */}
          <div className="mt-5 inline-flex items-center justify-center gap-4 rounded-2xl bg-white/15 px-5 py-2.5 text-xs font-bold backdrop-blur-md">
            <span>
              Kỷ lục: <strong className="text-white">{streakStatus?.longestStreak || 0} ngày</strong>
            </span>
            <span>•</span>
            <span>
              Bắt đầu: {streakStatus?.streakStartedDate || 'Hôm nay'}
            </span>
            <span>•</span>
            <span>
              Hoạt động: {calendarData?.totalActiveDays || 0} ngày
            </span>
          </div>

          {/* Next Milestone Badge Callout */}
          {streakStatus?.nextMilestoneBadge && (
            <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-1.5 text-xs font-bold text-white backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5 text-yellow-200" />
              <span>
                Còn {streakStatus.daysToNextMilestone} ngày nữa để mở khóa huy hiệu:{' '}
                <strong>{streakStatus.nextMilestoneBadge.title}</strong>
              </span>
            </div>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-8 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* 1. STREAK FREEZE CARD */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-blue-200 bg-blue-50/60 p-4 sm:p-5">
            <div className="flex items-start gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-extrabold text-sm text-blue-900">
                    Vé Bảo Lưu Chuỗi (Streak Freeze)
                  </h4>
                  <span className="rounded-full bg-blue-200/80 px-2 py-0.5 text-[10px] font-black text-blue-800">
                    {streakStatus?.freezeCreditsRemaining || 0}/2 Vé
                  </span>
                </div>
                <p className="text-xs text-blue-700/90 mt-0.5 leading-relaxed">
                  Tự động bảo vệ chuỗi ngày học không bị đứt đoạn khi bạn bận đột xuất hoặc quên học 1 ngày.
                </p>
              </div>
            </div>

            <button
              onClick={() => freezeMutation.mutate()}
              disabled={
                freezeMutation.isPending ||
                (streakStatus?.freezeCreditsRemaining || 0) <= 0
              }
              className={`shrink-0 rounded-xl px-4 py-2.5 text-xs font-extrabold shadow-sm transition-all ${
                (streakStatus?.freezeCreditsRemaining || 0) > 0
                  ? 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              {freezeMutation.isPending ? 'Đang kích hoạt...' : 'Kích hoạt vé'}
            </button>
          </div>

          {/* Toast Message */}
          {freezeToast && (
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs font-bold text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>{freezeToast}</span>
            </div>
          )}

          {/* 2. ACTIVITY HEATMAP (LỊCH CHUYÊN CẦN 14 TUẦN QUA) */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-orange-500" />
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                  Ma trận học tập gần đây (Activity Heatmap)
                </h3>
              </div>
              <span className="text-xs text-slate-400 font-semibold">
                {calendarData?.totalActiveDays || 0} ngày hoạt động
              </span>
            </div>

            {/* Heatmap Grid */}
            <div className="overflow-x-auto pb-2">
              <div className="grid grid-flow-col grid-rows-7 gap-1.5 w-max">
                {pastDays.map((dateStr) => {
                  const act = activityMap.get(dateStr);
                  const count = act?.count || 0;
                  const isFrozen = act?.isFrozen || false;

                  let bgClass = 'bg-slate-100 hover:ring-1 hover:ring-slate-300';
                  if (isFrozen) {
                    bgClass = 'bg-sky-400 hover:ring-1 hover:ring-sky-500';
                  } else if (count === 1) {
                    bgClass = 'bg-amber-300 hover:ring-1 hover:ring-amber-400';
                  } else if (count >= 2 && count <= 3) {
                    bgClass = 'bg-amber-500 hover:ring-1 hover:ring-amber-600';
                  } else if (count >= 4) {
                    bgClass = 'bg-orange-600 hover:ring-1 hover:ring-orange-700';
                  }

                  return (
                    <div
                      key={dateStr}
                      className={`h-3 w-3 rounded-sm transition-all cursor-pointer ${bgClass}`}
                      title={`${dateStr}: ${count} hoạt động ${isFrozen ? '(Vé Freeze)' : ''}`}
                    />
                  );
                })}
              </div>
            </div>

            {/* Heatmap Legend */}
            <div className="flex items-center justify-end gap-2 text-[10px] text-slate-400 font-bold pt-1">
              <span>Ít</span>
              <div className="h-2.5 w-2.5 rounded-sm bg-slate-100" />
              <div className="h-2.5 w-2.5 rounded-sm bg-amber-300" />
              <div className="h-2.5 w-2.5 rounded-sm bg-amber-500" />
              <div className="h-2.5 w-2.5 rounded-sm bg-orange-600" />
              <div className="h-2.5 w-2.5 rounded-sm bg-sky-400" title="Streak Freeze" />
              <span>Nhiều</span>
            </div>
          </div>

          {/* 3. HUY HIỆU THÀNH TỰU (MILESTONE BADGES) */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4 text-amber-500" />
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                  Huy hiệu thành tựu chuyên cần
                </h3>
              </div>
              <span className="text-xs text-slate-400 font-semibold">
                {badgesData?.unlockedCount || 0}/{badges.length} mở khóa
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {badges.map((b) => (
                <div
                  key={b.id}
                  className={`rounded-2xl border p-4 text-center transition-all ${
                    b.isUnlocked
                      ? 'border-amber-300 bg-gradient-to-b from-amber-50/60 to-yellow-50/40 shadow-sm'
                      : 'border-slate-200/80 bg-slate-50/50 opacity-60'
                  }`}
                >
                  <div
                    className={`mx-auto mb-2.5 flex h-12 w-12 items-center justify-center rounded-2xl ${
                      b.isUnlocked
                        ? 'bg-gradient-to-tr from-amber-400 to-orange-400 text-white shadow-md'
                        : 'bg-slate-200 text-slate-400'
                    }`}
                  >
                    {b.isUnlocked ? (
                      <Award className="h-6 w-6" />
                    ) : (
                      <Lock className="h-5 w-5" />
                    )}
                  </div>
                  <h4 className="font-extrabold text-xs text-slate-900 line-clamp-1">
                    {b.title}
                  </h4>
                  <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">
                    Mốc {b.milestoneDays} ngày (+{b.rewardExp} EXP)
                  </p>
                  <div className="mt-2">
                    <span
                      className={`rounded-md px-2 py-0.5 text-[9px] font-black uppercase ${
                        b.isUnlocked
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-200 text-slate-500'
                      }`}
                    >
                      {b.isUnlocked ? 'Đã đạt' : `Cần ${b.milestoneDays} ngày`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="border-t border-slate-200 bg-white p-4 sm:px-8 text-center">
          <button
            onClick={onClose}
            className="w-full sm:w-auto min-w-[200px] rounded-xl bg-slate-900 py-3 px-6 text-xs font-extrabold text-white hover:bg-slate-800 transition-colors"
          >
            Tuyệt vời! Tiếp tục học tập
          </button>
        </div>
      </div>
    </div>
  );
};
