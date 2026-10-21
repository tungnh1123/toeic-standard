import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import {
  BookOpen,
  User,
  Target,
  Flame,
  Calendar,
  Clock,
  Star,
  Search,
  CheckCircle2,
  Lock,
  Mail,
  LogIn,
  LogOut,
  ChevronRight,
  TrendingUp,
  Sparkles,
} from 'lucide-react';

interface DeckItem {
  id: string;
  title: string;
  description: string;
  level: string;
  topicCode: string;
  thumbnailUrl: string | null;
  totalCards: number;
  dueTodayCount: number;
  newCardsCount: number;
  learningCardsCount: number;
  masteredCardsCount: number;
  masteryPercentage: number;
  isFavorite: boolean;
}

interface StudentProfile {
  user: {
    id: string;
    email: string;
    fullName: string;
    avatarUrl: string | null;
    currentStreak: number;
    longestStreak: number;
  };
  goal: {
    targetScore: number;
    currentScore: number;
    scoreGap: number;
    progressPercentage: number;
    targetExamDate: string | null;
    daysRemaining: number | null;
    dailyStudyMinutes: number;
  };
}

const CEFR_LEVELS = ['ALL', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

export default function App() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'decks' | 'profile'>('decks');
  const [selectedCefr, setSelectedCefr] = useState('ALL');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('access_token'));

  // Form states cho Modal Auth & Target
  const [emailInput, setEmailInput] = useState('test.student@example.com');
  const [passwordInput, setPasswordInput] = useState('Password123!');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isTargetModalOpen, setIsTargetModalOpen] = useState(false);
  const [targetScoreInput, setTargetScoreInput] = useState('750');
  const [targetDateInput, setTargetDateInput] = useState('2026-12-31');

  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

  // 1. Query Decks
  const { data: decksData, isLoading: isDecksLoading } = useQuery({
    queryKey: ['decks', selectedCefr, searchKeyword, token],
    queryFn: async () => {
      const levelQuery = selectedCefr !== 'ALL' ? `&level=${selectedCefr}` : '';
      const kwQuery = searchKeyword ? `&keyword=${encodeURIComponent(searchKeyword)}` : '';
      const res = await axios.get(`/api/v1/student/decks?page=1&limit=20${levelQuery}${kwQuery}`, {
        headers: authHeaders,
      });
      return res.data.data;
    },
  });

  // 2. Query Profile
  const { data: profileData, isLoading: isProfileLoading, refetch: refetchProfile } = useQuery({
    queryKey: ['profile', token],
    queryFn: async (): Promise<StudentProfile> => {
      const res = await axios.get('/api/v1/student/profile/me', {
        headers: authHeaders,
      });
      return res.data.data;
    },
    enabled: Boolean(token),
  });

  // 3. Login Mutation
  const loginMutation = useMutation({
    mutationFn: async () => {
      const res = await axios.post('/api/v1/auth/login', {
        email: emailInput,
        password: passwordInput,
      });
      return res.data.data;
    },
    onSuccess: (data) => {
      localStorage.setItem('access_token', data.tokens.accessToken);
      setToken(data.tokens.accessToken);
      setIsAuthModalOpen(false);
      queryClient.invalidateQueries();
    },
  });

  // 4. Update Target Mutation
  const updateTargetMutation = useMutation({
    mutationFn: async () => {
      const res = await axios.put(
        '/api/v1/student/profile/target',
        {
          targetScore: Number(targetScoreInput),
          targetExamDate: targetDateInput,
          dailyStudyMinutes: 30,
        },
        { headers: authHeaders },
      );
      return res.data.data;
    },
    onSuccess: () => {
      setIsTargetModalOpen(false);
      refetchProfile();
    },
  });

  // 5. Toggle Favorite Deck
  const toggleFavoriteMutation = useMutation({
    mutationFn: async (deckId: string) => {
      if (!token) {
        setIsAuthModalOpen(true);
        return;
      }
      const res = await axios.post(`/api/v1/student/decks/${deckId}/favorite`, {}, { headers: authHeaders });
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['decks'] });
    },
  });

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    setToken(null);
    queryClient.invalidateQueries();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* TOPBAR */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-xl shadow-md shadow-blue-500/20">
              T
            </div>
            <div>
              <span className="font-extrabold text-lg text-slate-800 tracking-tight">TOEIC Standard</span>
              <span className="ml-2 text-[10px] font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full uppercase">
                v12.0 API
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('decks')}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition flex items-center gap-2 ${
                activeTab === 'decks' ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <BookOpen size={16} />
              Kho Thẻ CEFR
            </button>
            <button
              onClick={() => {
                if (!token) setIsAuthModalOpen(true);
                else setActiveTab('profile');
              }}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition flex items-center gap-2 ${
                activeTab === 'profile' ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <User size={16} />
              Hồ Sơ Mục Tiêu
            </button>

            {token ? (
              <button
                onClick={handleLogout}
                className="ml-2 p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                title="Đăng xuất"
              >
                <LogOut size={18} />
              </button>
            ) : (
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="ml-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-4 py-2 rounded-xl shadow-sm transition flex items-center gap-1.5"
              >
                <LogIn size={16} />
                Đăng nhập
              </button>
            )}
          </div>
        </div>
      </header>

      {/* MAIN CONTENT CONTAINER */}
      <main className="max-w-6xl mx-auto px-4 py-8 flex-1 w-full">
        {activeTab === 'decks' && (
          <div>
            {/* SEARCH & FILTER CONTROLS */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm mb-6">
              <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-4">
                <div className="relative w-full md:w-96">
                  <Search size={18} className="absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Tìm theo tiêu đề hoặc chủ đề từ vựng..."
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition"
                  />
                </div>

                <div className="text-xs text-slate-500 font-medium">
                  Kết nối trực tiếp NestJS API: <span className="font-bold text-emerald-600">GET /api/v1/student/decks</span>
                </div>
              </div>

              {/* CEFR TABS */}
              <div className="flex gap-2 overflow-x-auto pb-1">
                {CEFR_LEVELS.map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => setSelectedCefr(lvl)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap ${
                      selectedCefr === lvl
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {lvl === 'ALL' ? 'Tất cả cấp độ' : `Cấp độ ${lvl}`}
                  </button>
                ))}
              </div>
            </div>

            {/* DECKS GRID */}
            {isDecksLoading ? (
              <div className="text-center py-20 text-slate-400">Đang tải danh mục bộ thẻ từ Backend...</div>
            ) : decksData?.items?.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm">
                <BookOpen size={48} className="mx-auto text-slate-300 mb-3" />
                <h3 className="font-bold text-slate-700 text-base">Chưa có bộ thẻ nào trong danh mục</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                  Cơ sở dữ liệu vừa được khởi tạo mới trên PostgreSQL 16. Bạn có thể import bộ thẻ hoặc kiểm tra các tính năng khác!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {decksData?.items?.map((deck: DeckItem) => (
                  <div
                    key={deck.id}
                    className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full uppercase">
                            Level {deck.level}
                          </span>
                          <span className="text-[10px] font-bold text-slate-500 uppercase">{deck.topicCode}</span>
                        </div>
                        <button
                          onClick={() => toggleFavoriteMutation.mutate(deck.id)}
                          className="p-1 hover:scale-110 transition"
                        >
                          <Star
                            size={18}
                            className={deck.isFavorite ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}
                          />
                        </button>
                      </div>

                      <h4 className="font-bold text-slate-800 text-base mb-1">{deck.title}</h4>
                      <p className="text-xs text-slate-500 line-clamp-2 mb-4">{deck.description}</p>
                    </div>

                    <div className="border-t border-slate-100 pt-3">
                      <div className="flex justify-between items-center text-xs mb-1.5">
                        <span className="text-slate-400 font-medium">Tiến độ thành thạo</span>
                        <span className="font-bold text-slate-700">{deck.masteryPercentage}%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mb-3">
                        <div
                          className="bg-emerald-500 h-full rounded-full transition-all"
                          style={{ width: `${deck.masteryPercentage}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500">
                          Tổng số: <strong className="text-slate-800">{deck.totalCards}</strong> thẻ
                        </span>
                        <button className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-0.5">
                          Xem chi tiết <ChevronRight size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB PROFILE */}
        {activeTab === 'profile' && (
          <div>
            {isProfileLoading ? (
              <div className="text-center py-20 text-slate-400">Đang tải hồ sơ học viên...</div>
            ) : profileData ? (
              <div className="space-y-6 max-w-3xl mx-auto">
                {/* USER CARD */}
                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-6">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white text-2xl font-extrabold shadow-md">
                    {profileData.user.fullName.charAt(0)}
                  </div>
                  <div className="flex-1 text-center md:text-left">
                    <h2 className="text-xl font-bold text-slate-800">{profileData.user.fullName}</h2>
                    <p className="text-xs text-slate-400 mt-0.5">{profileData.user.email}</p>
                    <div className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full mt-3">
                      <Flame size={16} className="text-amber-600 fill-amber-500" />
                      <span className="text-xs font-bold text-amber-800">
                        Chuỗi {profileData.user.currentStreak} ngày chuyên cần
                      </span>
                    </div>
                  </div>
                </div>

                {/* TARGET SCORE CARD */}
                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                      <Target size={22} className="text-blue-600" />
                      <h3 className="font-bold text-base text-slate-800">Mục Tiêu Điểm Số TOEIC</h3>
                    </div>
                    <button
                      onClick={() => setIsTargetModalOpen(true)}
                      className="text-xs font-bold text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-200 transition"
                    >
                      Chỉnh sửa mục tiêu
                    </button>
                  </div>

                  {/* SCORE COMPARISON */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <span className="text-xs text-slate-400 font-medium">Điểm hiện tại</span>
                      <div className="text-3xl font-black text-slate-700 mt-1">
                        {profileData.goal.currentScore} <span className="text-xs text-slate-400 font-medium">/ 990</span>
                      </div>
                    </div>
                    <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
                      <span className="text-xs text-blue-500 font-medium">Điểm mục tiêu</span>
                      <div className="text-3xl font-black text-blue-600 mt-1">
                        {profileData.goal.targetScore} <span className="text-xs text-blue-400 font-medium">/ 990</span>
                      </div>
                    </div>
                  </div>

                  {/* PROGRESS BAR */}
                  <div className="mb-6">
                    <div className="flex justify-between text-xs font-bold mb-2">
                      <span className="text-slate-600">Tiến độ chinh phục</span>
                      <span className="text-blue-600">{profileData.goal.progressPercentage}%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                      <div
                        className="bg-blue-600 h-full rounded-full transition-all duration-500"
                        style={{ width: `${profileData.goal.progressPercentage}%` }}
                      />
                    </div>
                  </div>

                  {/* STATS FOOTER */}
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100 text-xs">
                    <div className="flex items-center gap-2 text-slate-600">
                      <Calendar size={16} className="text-slate-400" />
                      <span>
                        Còn{' '}
                        <strong className="text-slate-800">
                          {profileData.goal.daysRemaining !== null ? `${profileData.goal.daysRemaining} ngày` : 'Chưa đặt'}
                        </strong>
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600">
                      <Clock size={16} className="text-slate-400" />
                      <span>
                        Thời gian học: <strong className="text-slate-800">{profileData.goal.dailyStudyMinutes} phút/ngày</strong>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-10">Vui lòng đăng nhập để xem hồ sơ.</div>
            )}
          </div>
        )}
      </main>

      {/* MODAL AUTH */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-200">
            <h3 className="font-extrabold text-lg text-slate-800 mb-1">Đăng nhập Học viên</h3>
            <p className="text-xs text-slate-400 mb-5">Đồng bộ tiến trình và mục tiêu điểm số TOEIC</p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                loginMutation.mutate();
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Email</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-3 text-slate-400" />
                  <input
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Mật khẩu</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-3 text-slate-400" />
                  <input
                    type="password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              {loginMutation.isError && (
                <div className="text-xs text-rose-600 bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                  Đăng nhập thất bại. Vui lòng kiểm tra lại email/mật khẩu!
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAuthModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={loginMutation.isPending}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2.5 rounded-xl transition shadow-sm"
                >
                  {loginMutation.isPending ? 'Đang xác thực...' : 'Đăng nhập'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL UPDATE TARGET */}
      {isTargetModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-200">
            <h3 className="font-extrabold text-lg text-slate-800 mb-1">Cập Nhật Mục Tiêu TOEIC</h3>
            <p className="text-xs text-slate-400 mb-5">Chuẩn hóa thang điểm ETS TOEIC (bội số của 5)</p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Điểm mục tiêu (10 – 990)</label>
                <input
                  type="number"
                  step="5"
                  min="10"
                  max="990"
                  value={targetScoreInput}
                  onChange={(e) => setTargetScoreInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-blue-500 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Ngày thi dự kiến</label>
                <input
                  type="date"
                  value={targetDateInput}
                  onChange={(e) => setTargetDateInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsTargetModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  onClick={() => updateTargetMutation.mutate()}
                  disabled={updateTargetMutation.isPending}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2.5 rounded-xl transition shadow-sm"
                >
                  {updateTargetMutation.isPending ? 'Đang lưu...' : 'Lưu mục tiêu'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
