import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import {
  RotateCw,
  Award,
  AlertTriangle,
  TrendingUp,
  Brain,
  BookOpen,
  Headphones,
  FileText,
  Mic,
  PenTool,
  Clock,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { SkillRadarHexagonChart, SkillScoreItem } from './SkillRadarHexagonChart';

interface RecommendationItem {
  skillCode: string;
  skillName: string;
  recommendationTitle: string;
  recommendationType: 'FLASHCARD_DECK' | 'GRAMMAR_LESSON' | 'TOEIC_PRACTICE' | 'ASSIGNMENT';
  targetId: string;
  actionUrl: string;
}

interface SkillRadarData {
  skills: SkillScoreItem[];
  overallScore: number;
  estimatedCefr: string;
  estimatedToeicScore: number;
  targetToeicScore: number;
  scoreGap: number;
  weakestSkills: string[];
  recommendations: RecommendationItem[];
  lastCalculatedAt: string;
}

interface WeakSkillDetail {
  skillCode: string;
  skillName: string;
  currentScore: number;
  targetBenchmark: number;
  gap: number;
  reasonSummary: string;
  recommendations: RecommendationItem[];
}

interface WeaknessDiagnosisData {
  primaryWeakness: WeakSkillDetail;
  secondaryWeakness: WeakSkillDetail;
  diagnosisSummary: string;
  suggestedDailyMinutes: number;
}

interface HardWordItem {
  cardId: string;
  term: string;
  vietnameseMeaning: string;
  partOfSpeech: string;
  deckId: string;
  deckTitle: string;
  easeFactor: number;
  intervalDays: number;
  repetitionCount: number;
  dueDate: string;
}

interface HardWordsData {
  totalHardWords: number;
  words: HardWordItem[];
}

interface SkillHistorySnapshot {
  date: string;
  vocabScore: number;
  grammarScore: number;
  listeningScore: number;
  readingScore: number;
  writingScore: number;
  speakingScore: number;
  overallScore: number;
  estimatedToeicScore: number;
}

interface SkillHistoryData {
  totalSnapshots: number;
  history: SkillHistorySnapshot[];
}

interface SkillRadarViewProps {
  token: string | null;
  onNavigateToTab?: (tab: 'decks' | 'notebooks' | 'grammar' | 'profile') => void;
  onRequireAuth?: () => void;
}

export const SkillRadarView: React.FC<SkillRadarViewProps> = ({
  token,
  onNavigateToTab,
  onRequireAuth,
}) => {
  const queryClient = useQueryClient();
  const [activeSubTab, setActiveSubTab] = useState<'diagnosis' | 'hardWords' | 'history'>('diagnosis');

  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

  // 1. Query Skill Radar
  const {
    data: radarData,
    isLoading: isRadarLoading,
    isRefetching: isRadarRefetching,
  } = useQuery<SkillRadarData>({
    queryKey: ['skillRadar', token],
    queryFn: async () => {
      const res = await axios.get('/api/v1/student/skill-radar/me', {
        headers: authHeaders,
      });
      return res.data.data;
    },
    enabled: !!token,
  });

  // 2. Query Weakness Diagnosis
  const { data: diagnosisData, isLoading: isDiagnosisLoading } = useQuery<WeaknessDiagnosisData>({
    queryKey: ['skillDiagnosis', token],
    queryFn: async () => {
      const res = await axios.get('/api/v1/student/skill-radar/diagnose', {
        headers: authHeaders,
      });
      return res.data.data;
    },
    enabled: !!token,
  });

  // 3. Query Hard Words Report
  const { data: hardWordsData, isLoading: isHardWordsLoading } = useQuery<HardWordsData>({
    queryKey: ['hardWordsReport', token],
    queryFn: async () => {
      const res = await axios.get('/api/v1/student/skill-radar/hard-words', {
        headers: authHeaders,
      });
      return res.data.data;
    },
    enabled: !!token,
  });

  // 4. Query Growth History
  const { data: historyData, isLoading: isHistoryLoading } = useQuery<SkillHistoryData>({
    queryKey: ['skillHistory', token],
    queryFn: async () => {
      const res = await axios.get('/api/v1/student/skill-radar/history', {
        headers: authHeaders,
      });
      return res.data.data;
    },
    enabled: !!token,
  });

  // 5. Recalculate Mutation
  const recalculateMutation = useMutation({
    mutationFn: async () => {
      const res = await axios.post(
        '/api/v1/student/skill-radar/recalculate',
        {},
        { headers: authHeaders },
      );
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skillRadar'] });
      queryClient.invalidateQueries({ queryKey: ['skillDiagnosis'] });
      queryClient.invalidateQueries({ queryKey: ['skillHistory'] });
      queryClient.invalidateQueries({ queryKey: ['hardWordsReport'] });
    },
  });

  if (!token) {
    return (
      <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm">
        <Brain className="mx-auto text-blue-500 mb-4" size={48} />
        <h2 className="text-xl font-bold text-slate-800 mb-2">
          Đăng nhập để xem Radar Năng Lực 6D
        </h2>
        <p className="text-slate-500 text-sm mb-6 max-w-md mx-auto">
          Hệ thống sẽ tổng hợp kết quả học Flashcard SM-2, Quiz Ngữ pháp và bài thi thử để xây dựng hồ sơ năng lực cá nhân.
        </p>
        <button
          onClick={onRequireAuth}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2.5 rounded-xl shadow transition"
        >
          Đăng nhập ngay
        </button>
      </div>
    );
  }

  const getSkillIcon = (code: string) => {
    switch (code) {
      case 'VOCABULARY':
        return <BookOpen size={16} className="text-emerald-500" />;
      case 'GRAMMAR':
        return <Brain size={16} className="text-blue-500" />;
      case 'LISTENING':
        return <Headphones size={16} className="text-indigo-500" />;
      case 'READING':
        return <FileText size={16} className="text-violet-500" />;
      case 'WRITING':
        return <PenTool size={16} className="text-rose-500" />;
      case 'SPEAKING':
        return <Mic size={16} className="text-amber-500" />;
      default:
        return <Award size={16} className="text-slate-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* HERO SECTION / SUMMARY CARDS */}
      <div className="bg-gradient-to-br from-indigo-900 via-blue-900 to-slate-900 rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-xs font-semibold text-blue-200 mb-2">
                <Sparkles size={13} className="text-amber-400" />
                Chuẩn hóa Thang điểm ETS TOEIC & CEFR
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                Bảng Phân Tích Radar 6 Kỹ Năng
              </h1>
              <p className="text-slate-300 text-sm mt-1">
                Đánh giá toàn diện Từ vựng, Ngữ pháp, Nghe, Đọc, Viết & Nói với mô hình AI Spaced Repetition & ETS Scoring.
              </p>
            </div>

            <button
              onClick={() => recalculateMutation.mutate()}
              disabled={recalculateMutation.isPending || isRadarRefetching}
              className="self-start md:self-auto bg-white/10 hover:bg-white/20 active:bg-white/30 text-white font-bold text-xs px-4 py-2.5 rounded-xl border border-white/20 transition flex items-center gap-2 backdrop-blur-md shadow-sm disabled:opacity-50"
            >
              <RotateCw
                size={14}
                className={recalculateMutation.isPending || isRadarRefetching ? 'animate-spin' : ''}
              />
              {recalculateMutation.isPending ? 'Đang tính toán...' : 'Tính toán lại chỉ số'}
            </button>
          </div>

          {/* 4 Score Badges */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* TOEIC EST */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
              <span className="text-xs font-semibold text-blue-200">Dự đoán điểm TOEIC</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-black text-amber-300">
                  {radarData?.estimatedToeicScore ?? '...'}
                </span>
                <span className="text-xs text-slate-300 font-bold">/ 990</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Làm tròn bội số 5 chuẩn ETS
              </div>
            </div>

            {/* CEFR LEVEL */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
              <span className="text-xs font-semibold text-blue-200">Quy đổi Khung CEFR</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-black text-emerald-300">
                  {radarData?.estimatedCefr ?? 'A1'}
                </span>
                <span className="text-xs text-slate-300">Quốc tế</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                {radarData?.estimatedCefr === 'C1' || radarData?.estimatedCefr === 'C2'
                  ? 'Cao cấp (Proficient)'
                  : radarData?.estimatedCefr === 'B2'
                    ? 'Trung cao cấp (Vantage)'
                    : radarData?.estimatedCefr === 'B1'
                      ? 'Trung cấp (Threshold)'
                      : 'Cơ bản (Waystage)'}
              </div>
            </div>

            {/* TARGET GAP */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
              <span className="text-xs font-semibold text-blue-200">Mục tiêu cá nhân</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-black text-white">
                  {radarData?.targetToeicScore ?? 750}
                </span>
                <span className="text-xs text-rose-300 font-bold">
                  {radarData?.scoreGap && radarData.scoreGap > 0
                    ? `còn ${radarData.scoreGap} đ`
                    : 'Đã đạt! 🎉'}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Khoảng cách cần bứt phá
              </div>
            </div>

            {/* OVERALL SCORE */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
              <span className="text-xs font-semibold text-blue-200">Năng lực tổng hợp</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-black text-cyan-300">
                  {radarData?.overallScore ? `${Math.round(radarData.overallScore)}%` : '...'}
                </span>
                <span className="text-xs text-slate-300">Thang 100</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Trung bình trọng số 6 kỹ năng
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN TWO-COLUMN LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: SVG RADAR CHART & 6 SKILLS BREAKDOWN (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Radar Chart Card */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col items-center">
            <div className="w-full flex items-center justify-between mb-2">
              <h2 className="font-extrabold text-slate-800 text-base">
                Biểu đồ Lục giác Radar 6D
              </h2>
              <span className="text-xs text-slate-400 font-medium">
                Thang chuẩn 0 - 100
              </span>
            </div>

            {isRadarLoading ? (
              <div className="h-80 flex items-center justify-center text-slate-400 text-sm">
                Đang nạp dữ liệu Radar...
              </div>
            ) : (
              <div className="py-2">
                <SkillRadarHexagonChart
                  skills={radarData?.skills || []}
                  size={320}
                />
              </div>
            )}

            <div className="text-center text-xs text-slate-400 mt-2">
              Chạm hoặc rê chuột vào các đỉnh để xem điểm chi tiết
            </div>
          </div>

          {/* 6 Skills Breakdown List */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
            <h3 className="font-extrabold text-slate-800 text-sm mb-4">
              Điểm số chi tiết từng kỹ năng
            </h3>

            <div className="space-y-3.5">
              {radarData?.skills?.map((item) => {
                const isWeakest = radarData.weakestSkills?.includes(item.skillCode);
                return (
                  <div key={item.skillCode} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        {getSkillIcon(item.skillCode)}
                        <span className="font-bold text-slate-700">
                          {item.skillName}
                        </span>
                        {isWeakest && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-rose-100 text-rose-700">
                            Điểm yếu
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 font-bold">
                        <span className="text-slate-800">{Math.round(item.score)}%</span>
                        <span className="text-slate-400 font-normal text-[11px]">
                          ({item.levelLabel})
                        </span>
                      </div>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          item.score >= 75
                            ? 'bg-emerald-500'
                            : item.score >= 50
                              ? 'bg-blue-500'
                              : 'bg-rose-500'
                        }`}
                        style={{ width: `${Math.max(4, Math.min(100, item.score))}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: DIAGNOSIS, HARD WORDS & HISTORY (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Sub Navigation Tabs */}
          <div className="bg-white rounded-2xl p-1.5 border border-slate-200 shadow-sm flex gap-1">
            <button
              onClick={() => setActiveSubTab('diagnosis')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                activeSubTab === 'diagnosis'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <AlertTriangle size={14} />
              Chẩn đoán 2 Điểm yếu
            </button>
            <button
              onClick={() => setActiveSubTab('hardWords')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                activeSubTab === 'hardWords'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Brain size={14} />
              Từ khó cần ôn ({hardWordsData?.totalHardWords || 0})
            </button>
            <button
              onClick={() => setActiveSubTab('history')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                activeSubTab === 'history'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <TrendingUp size={14} />
              Lịch sử tăng trưởng
            </button>
          </div>

          {/* TAB 1: WEAKNESS DIAGNOSIS */}
          {activeSubTab === 'diagnosis' && (
            <div className="space-y-4">
              {isDiagnosisLoading ? (
                <div className="bg-white rounded-3xl p-10 text-center text-slate-400 text-sm border border-slate-200">
                  Đang phân tích điểm yếu học tập...
                </div>
              ) : (
                <>
                  {/* Diagnosis Summary Banner */}
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
                    <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={18} />
                    <div>
                      <h4 className="text-xs font-extrabold text-amber-900 uppercase tracking-wider">
                        Phân tích trọng tâm từ Hệ thống
                      </h4>
                      <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                        {diagnosisData?.diagnosisSummary}
                      </p>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 mt-2">
                        <Clock size={13} />
                        Khuyến nghị: {diagnosisData?.suggestedDailyMinutes} phút học tập mỗi ngày
                      </div>
                    </div>
                  </div>

                  {/* Primary Weakness Card (W1) */}
                  {diagnosisData?.primaryWeakness && (
                    <div className="bg-white rounded-3xl p-6 border-2 border-rose-200 shadow-sm relative overflow-hidden">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-rose-600 text-white">
                            Điểm yếu số 1
                          </span>
                          <h3 className="font-extrabold text-slate-800 text-base">
                            {diagnosisData.primaryWeakness.skillName}
                          </h3>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-black text-rose-600">
                            {diagnosisData.primaryWeakness.currentScore}/100
                          </div>
                          <span className="text-[11px] text-slate-400 font-semibold">
                            Cách mốc chuẩn: -{diagnosisData.primaryWeakness.gap}đ
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 mb-4">
                        {diagnosisData.primaryWeakness.reasonSummary}
                      </p>

                      {/* Action Recommendations */}
                      <div className="space-y-2">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                          Gợi ý khắc phục ưu tiên:
                        </span>
                        {diagnosisData.primaryWeakness.recommendations.map((rec, idx) => (
                          <div
                            key={idx}
                            className="p-3 rounded-xl bg-rose-50/60 border border-rose-100 flex items-center justify-between gap-3 hover:bg-rose-50 transition"
                          >
                            <div className="text-xs">
                              <span className="font-bold text-rose-900 block">
                                {rec.recommendationTitle}
                              </span>
                              <span className="text-[10px] text-rose-700">
                                Loại: {rec.recommendationType}
                              </span>
                            </div>
                            <button
                              onClick={() => {
                                if (rec.recommendationType === 'FLASHCARD_DECK' && onNavigateToTab) {
                                  onNavigateToTab('decks');
                                } else if (rec.recommendationType === 'GRAMMAR_LESSON' && onNavigateToTab) {
                                  onNavigateToTab('grammar');
                                }
                              }}
                              className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg shrink-0 flex items-center gap-1 shadow-sm transition"
                            >
                              Luyện ngay
                              <ArrowRight size={13} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Secondary Weakness Card (W2) */}
                  {diagnosisData?.secondaryWeakness && (
                    <div className="bg-white rounded-3xl p-6 border-2 border-amber-200 shadow-sm relative overflow-hidden">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-amber-500 text-white">
                            Điểm yếu số 2
                          </span>
                          <h3 className="font-extrabold text-slate-800 text-base">
                            {diagnosisData.secondaryWeakness.skillName}
                          </h3>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-black text-amber-600">
                            {diagnosisData.secondaryWeakness.currentScore}/100
                          </div>
                          <span className="text-[11px] text-slate-400 font-semibold">
                            Cách mốc chuẩn: -{diagnosisData.secondaryWeakness.gap}đ
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 mb-4">
                        {diagnosisData.secondaryWeakness.reasonSummary}
                      </p>

                      {/* Action Recommendations */}
                      <div className="space-y-2">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                          Gợi ý khắc phục ưu tiên:
                        </span>
                        {diagnosisData.secondaryWeakness.recommendations.map((rec, idx) => (
                          <div
                            key={idx}
                            className="p-3 rounded-xl bg-amber-50/60 border border-amber-100 flex items-center justify-between gap-3 hover:bg-amber-50 transition"
                          >
                            <div className="text-xs">
                              <span className="font-bold text-amber-900 block">
                                {rec.recommendationTitle}
                              </span>
                              <span className="text-[10px] text-amber-700">
                                Loại: {rec.recommendationType}
                              </span>
                            </div>
                            <button
                              onClick={() => {
                                if (rec.recommendationType === 'FLASHCARD_DECK' && onNavigateToTab) {
                                  onNavigateToTab('decks');
                                } else if (rec.recommendationType === 'GRAMMAR_LESSON' && onNavigateToTab) {
                                  onNavigateToTab('grammar');
                                }
                              }}
                              className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg shrink-0 flex items-center gap-1 shadow-sm transition"
                            >
                              Luyện ngay
                              <ArrowRight size={13} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* TAB 2: HARD WORDS REPORT (EF <= 1.70) */}
          {activeSubTab === 'hardWords' && (
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-slate-800 text-base">
                    Sổ Từ Khó Tự Động (Troubled Words)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Hệ số nhớ thấp Ease Factor ≤ 1.70 trong thuật toán Spaced Repetition SM-2
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-700">
                  {hardWordsData?.totalHardWords || 0} từ
                </span>
              </div>

              {isHardWordsLoading ? (
                <div className="py-12 text-center text-slate-400 text-sm">
                  Đang lọc từ khó...
                </div>
              ) : !hardWordsData?.words || hardWordsData.words.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-sm bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <Brain size={32} className="mx-auto text-slate-300 mb-2" />
                  Không có từ vựng nào bị đánh dấu khó (EF ≤ 1.70). Trí nhớ từ vựng của bạn rất ổn định!
                </div>
              ) : (
                <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto pr-1">
                  {hardWordsData.words.map((w) => (
                    <div key={w.cardId} className="py-3 flex items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800 text-sm">{w.term}</span>
                          {w.partOfSpeech && (
                            <span className="text-[10px] px-1.5 py-0.2 bg-slate-100 text-slate-500 rounded font-semibold">
                              {w.partOfSpeech}
                            </span>
                          )}
                          <span className="text-[10px] text-slate-400">
                            Bộ: {w.deckTitle}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-0.5">
                          {w.vietnameseMeaning}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-xs font-black text-rose-600">
                          EF {w.easeFactor.toFixed(2)}
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          Chu kỳ: {w.intervalDays} ngày
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: GROWTH SNAPSHOTS HISTORY */}
          {activeSubTab === 'history' && (
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
              <div>
                <h3 className="font-extrabold text-slate-800 text-base">
                  Lịch Sử Snapshots Tăng Trưởng
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Lưu vết tiến trình phát triển 6 kỹ năng và biến động dự đoán TOEIC
                </p>
              </div>

              {isHistoryLoading ? (
                <div className="py-12 text-center text-slate-400 text-sm">
                  Đang tải lịch sử...
                </div>
              ) : !historyData?.history || historyData.history.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-sm bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  Chưa có snapshot lịch sử nào. Hãy bấm "Tính toán lại chỉ số" để tạo bản ghi đầu tiên!
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-400 font-bold">
                        <th className="pb-2">Ngày</th>
                        <th className="pb-2">Từ vựng</th>
                        <th className="pb-2">Ngữ pháp</th>
                        <th className="pb-2">Nghe</th>
                        <th className="pb-2">Đọc</th>
                        <th className="pb-2">Viết</th>
                        <th className="pb-2">Nói</th>
                        <th className="pb-2">Dự đoán TOEIC</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                      {historyData.history.map((h, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 transition">
                          <td className="py-2.5 font-bold text-slate-900">{h.date}</td>
                          <td className="py-2.5">{Math.round(h.vocabScore)}%</td>
                          <td className="py-2.5">{Math.round(h.grammarScore)}%</td>
                          <td className="py-2.5">{Math.round(h.listeningScore)}%</td>
                          <td className="py-2.5">{Math.round(h.readingScore)}%</td>
                          <td className="py-2.5">{Math.round(h.writingScore)}%</td>
                          <td className="py-2.5">{Math.round(h.speakingScore)}%</td>
                          <td className="py-2.5 font-extrabold text-indigo-600">
                            {h.estimatedToeicScore} đ
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
