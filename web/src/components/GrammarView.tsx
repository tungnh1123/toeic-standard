import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import {
  Clock,
  CheckCircle2,
  Bookmark,
  ChevronRight,
  Layers,
  GraduationCap,
  RotateCcw,
} from 'lucide-react';
import { GrammarReaderModal } from './GrammarReaderModal';

interface GrammarCategory {
  id: string;
  title: string;
  description: string | null;
  targetLevel: string;
  iconName: string;
  colorCode: string;
  orderIndex: number;
  totalLessons: number;
  completedLessons: number;
  progressPercentage: number;
}

interface GrammarLessonItem {
  id: string;
  categoryId: string;
  categoryTitle?: string;
  title: string;
  slug: string;
  summary: string;
  estimatedReadTimeMinutes: number;
  orderIndex: number;
  isCompleted: boolean;
  scrollPercentage: number;
  isBookmarked: boolean;
  lastReadAt?: string | null;
}

interface GrammarViewProps {
  token: string | null;
  onRequireAuth: () => void;
}

export const GrammarView: React.FC<GrammarViewProps> = ({ token, onRequireAuth }) => {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [activeReadingLessonId, setActiveReadingLessonId] = useState<string | null>(null);

  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

  // 1. Tải danh mục chuyên đề ngữ pháp kèm tiến độ
  const { data: categories, isLoading: isCategoriesLoading } = useQuery({
    queryKey: ['grammar-categories', token],
    queryFn: async (): Promise<GrammarCategory[]> => {
      const res = await axios.get('/api/v1/student/grammar/categories', {
        headers: authHeaders,
      });
      return res.data.data;
    },
  });

  // Chọn mặc định category đầu tiên nếu chưa chọn
  const activeCategoryId = selectedCategoryId || (categories && categories.length > 0 ? categories[0].id : null);

  // 2. Tải danh sách bài học thuộc category đang chọn
  const { data: categoryLessons, isLoading: isLessonsLoading } = useQuery({
    queryKey: ['grammar-category-lessons', activeCategoryId, token],
    queryFn: async (): Promise<GrammarLessonItem[]> => {
      if (!activeCategoryId) return [];
      const res = await axios.get(
        `/api/v1/student/grammar/categories/${activeCategoryId}/lessons`,
        { headers: authHeaders },
      );
      return res.data.data;
    },
    enabled: Boolean(activeCategoryId),
  });

  // 3. Tải bài học vừa đọc gần đây (nếu đã đăng nhập)
  const { data: recentLessons } = useQuery({
    queryKey: ['grammar-recent', token],
    queryFn: async (): Promise<GrammarLessonItem[]> => {
      if (!token) return [];
      const res = await axios.get('/api/v1/student/grammar/recent?limit=4', {
        headers: authHeaders,
      });
      return res.data.data;
    },
    enabled: Boolean(token),
  });

  const activeCategory = categories?.find((c) => c.id === activeCategoryId);

  return (
    <div className="space-y-8">
      {/* 1. HERO BANNER */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-700 via-indigo-700 to-sky-800 p-6 sm:p-8 text-white shadow-xl">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold backdrop-blur-md mb-3 text-blue-100">
            <GraduationCap className="h-4 w-4" />
            <span>Giáo trình Ngữ pháp Chuẩn Quốc tế (GFM Reader)</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mb-2">
            Học Lý Thuyết Ngữ Pháp Trọng Điểm TOEIC
          </h1>
          <p className="text-sm sm:text-base text-blue-100/90 leading-relaxed">
            Hệ thống hóa toàn bộ công thức, bẫy thời thì kinh điển Part 5 & 6 và mẹo giải nhanh trong 3 giây với định dạng trực quan.
          </p>
        </div>

        {/* Decorative background circle */}
        <div className="absolute -right-10 -bottom-10 h-64 w-64 rounded-full bg-white/10 blur-2xl pointer-events-none" />
      </div>

      {/* 2. BÀI HỌC VỪA ĐỌC GẦN ĐÂY (NẾU CÓ) */}
      {recentLessons && recentLessons.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <RotateCcw className="h-4 w-4 text-blue-600" />
              <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">
                Vừa đọc gần đây
              </h2>
            </div>
            <span className="text-xs text-slate-400">Tiếp tục hành trình học</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {recentLessons.map((recent) => (
              <div
                key={recent.id}
                onClick={() => setActiveReadingLessonId(recent.id)}
                className="group cursor-pointer rounded-xl border border-slate-200/80 bg-slate-50/60 p-3.5 hover:border-blue-500 hover:bg-blue-50/30 hover:shadow-sm transition-all"
              >
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 mb-1.5">
                  <span className="truncate max-w-[140px] text-blue-600">{recent.categoryTitle}</span>
                  {recent.isCompleted ? (
                    <span className="text-emerald-600 flex items-center gap-0.5">
                      <CheckCircle2 className="h-3 w-3" /> Xong
                    </span>
                  ) : (
                    <span className="text-amber-600">{recent.scrollPercentage}%</span>
                  )}
                </div>
                <h4 className="font-bold text-slate-800 text-xs line-clamp-2 group-hover:text-blue-600 transition-colors mb-2">
                  {recent.title}
                </h4>
                <div className="w-full bg-slate-200 h-1 rounded-full overflow-hidden">
                  <div
                    className="bg-blue-600 h-full rounded-full"
                    style={{ width: `${recent.scrollPercentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. MAIN SECTION: CHUYÊN ĐỀ & BÀI HỌC */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Chuyên đề Categories Navigation (4 cols) */}
        <div className="lg:col-span-4 space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Layers className="h-4 w-4 text-blue-600" />
              <span>Chuyên đề lý thuyết</span>
            </h2>
            <span className="text-xs font-semibold text-slate-400">
              {categories?.length || 0} chuyên đề
            </span>
          </div>

          {isCategoriesLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-24 animate-pulse rounded-2xl bg-slate-100" />
              ))}
            </div>
          ) : (
            <div className="space-y-2.5">
              {categories?.map((cat) => {
                const isSelected = cat.id === activeCategoryId;
                return (
                  <div
                    key={cat.id}
                    onClick={() => setSelectedCategoryId(cat.id)}
                    className={`cursor-pointer rounded-2xl p-4 transition-all border ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/40 shadow-sm ring-1 ring-blue-500/20'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-white font-bold text-xs shadow-sm"
                          style={{ backgroundColor: cat.colorCode || '#2563EB' }}
                        >
                          {cat.orderIndex}
                        </span>
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-extrabold uppercase text-slate-600">
                          CEFR {cat.targetLevel}
                        </span>
                      </div>
                      <span className="text-xs font-extrabold text-blue-600">
                        {cat.completedLessons}/{cat.totalLessons} bài
                      </span>
                    </div>

                    <h3 className={`text-sm font-bold mb-1 ${isSelected ? 'text-blue-900' : 'text-slate-800'}`}>
                      {cat.title}
                    </h3>
                    <p className="text-xs text-slate-500 line-clamp-2 mb-3">
                      {cat.description}
                    </p>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-blue-600 h-full rounded-full transition-all duration-300"
                        style={{ width: `${cat.progressPercentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Danh sách Bài học trong Chuyên đề (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          {activeCategory && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4 mb-4">
                <div>
                  <span className="text-xs font-extrabold uppercase text-blue-600 tracking-wider">
                    Chuyên đề {activeCategory.orderIndex}
                  </span>
                  <h2 className="text-lg font-black text-slate-900">
                    {activeCategory.title}
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-xl bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                    Tiến độ: {activeCategory.progressPercentage}%
                  </span>
                </div>
              </div>

              {isLessonsLoading ? (
                <div className="space-y-3">
                  {[1, 2].map((n) => (
                    <div key={n} className="h-20 animate-pulse rounded-xl bg-slate-100" />
                  ))}
                </div>
              ) : categoryLessons && categoryLessons.length > 0 ? (
                <div className="space-y-3">
                  {categoryLessons.map((lesson, idx) => (
                    <div
                      key={lesson.id}
                      onClick={() => setActiveReadingLessonId(lesson.id)}
                      className="group cursor-pointer rounded-2xl border border-slate-200/90 p-4 transition-all hover:border-blue-400 hover:shadow-md bg-white hover:bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="flex items-start gap-3.5 min-w-0">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xs font-black text-slate-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                          {idx + 1}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-extrabold text-sm sm:text-base text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                              {lesson.title}
                            </h3>
                            {lesson.isCompleted && (
                              <span className="shrink-0 rounded-full bg-emerald-100 p-0.5 text-emerald-600" title="Đã hoàn thành">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                              </span>
                            )}
                            {lesson.isBookmarked && (
                              <span className="shrink-0 text-amber-500" title="Đã đánh dấu yêu thích">
                                <Bookmark className="h-3.5 w-3.5 fill-amber-500" />
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 line-clamp-2 mb-2">
                            {lesson.summary}
                          </p>
                          <div className="flex items-center gap-3 text-[11px] text-slate-400 font-semibold">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3 text-slate-400" />
                              {lesson.estimatedReadTimeMinutes} phút đọc
                            </span>
                            {lesson.scrollPercentage > 0 && !lesson.isCompleted && (
                              <span className="text-blue-600">
                                Đang đọc: {lesson.scrollPercentage}%
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center justify-end">
                        <button className="flex items-center gap-1.5 rounded-xl bg-blue-50 px-4 py-2 text-xs font-bold text-blue-700 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                          <span>{lesson.isCompleted ? 'Đọc lại' : 'Đọc bài'}</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center text-slate-400 text-sm">
                  Chuyên đề này đang được biên soạn nội dung.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 4. MODAL ĐỌC BÀI GIẢNG MARKDOWN TRỰC QUAN */}
      {activeReadingLessonId && (
        <GrammarReaderModal
          lessonId={activeReadingLessonId}
          token={token}
          onClose={() => setActiveReadingLessonId(null)}
          onSelectLesson={(newLessonId) => setActiveReadingLessonId(newLessonId)}
          onRequireAuth={onRequireAuth}
        />
      )}
    </div>
  );
};
