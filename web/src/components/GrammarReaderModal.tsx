import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import {
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  List,
  CheckCircle,
  ArrowRight,
  Clock,
  Award,
  X,
} from 'lucide-react';
import { MarkdownRenderer } from './MarkdownRenderer';
import { GrammarQuizModal } from './GrammarQuizModal';

interface TableOfContentItem {
  id: string;
  title: string;
  level: number;
}

interface LessonDetail {
  id: string;
  categoryId: string;
  categoryTitle: string;
  title: string;
  slug: string;
  summary: string;
  contentMarkdown: string;
  estimatedReadTimeMinutes: number;
  tableOfContents: TableOfContentItem[];
  previousLessonId: string | null;
  nextLessonId: string | null;
  isCompleted: boolean;
  scrollPercentage: number;
  isBookmarked: boolean;
  hasQuiz: boolean;
  quizCount: number;
}

interface GrammarReaderModalProps {
  lessonId: string;
  token: string | null;
  onClose: () => void;
  onSelectLesson: (newLessonId: string) => void;
  onRequireAuth: () => void;
}

export const GrammarReaderModal: React.FC<GrammarReaderModalProps> = ({
  lessonId,
  token,
  onClose,
  onSelectLesson,
  onRequireAuth,
}) => {
  const queryClient = useQueryClient();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [scrollPercent, setScrollPercent] = useState<number>(0);
  const [isTocOpen, setIsTocOpen] = useState<boolean>(false);
  const [showCompletionToast, setShowCompletionToast] = useState<boolean>(false);
  const [isQuizModalOpen, setIsQuizModalOpen] = useState<boolean>(false);

  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

  // 1. Tải chi tiết bài học
  const { data: lesson, isLoading } = useQuery({
    queryKey: ['grammar-lesson-detail', lessonId, token],
    queryFn: async (): Promise<LessonDetail> => {
      const res = await axios.get(`/api/v1/student/grammar/lessons/${lessonId}`, {
        headers: authHeaders,
      });
      return res.data.data;
    },
  });

  // Sync initial scroll % from server
  useEffect(() => {
    if (lesson?.scrollPercentage) {
      setScrollPercent(lesson.scrollPercentage);
    }
  }, [lesson?.scrollPercentage]);

  // 2. Mutation cập nhật tiến độ đọc
  const progressMutation = useMutation({
    mutationFn: async (payload: { scrollPercentage: number; markAsCompleted?: boolean }) => {
      if (!token) return;
      await axios.post(
        `/api/v1/student/grammar/lessons/${lessonId}/progress`,
        payload,
        { headers: authHeaders },
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['grammar-categories'] });
      queryClient.invalidateQueries({ queryKey: ['grammar-category-lessons'] });
      queryClient.invalidateQueries({ queryKey: ['grammar-recent'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      if (variables.markAsCompleted) {
        setShowCompletionToast(true);
        setTimeout(() => setShowCompletionToast(false), 3500);
      }
    },
  });

  // 3. Mutation bookmark toggle
  const bookmarkMutation = useMutation({
    mutationFn: async () => {
      if (!token) {
        onRequireAuth();
        return;
      }
      const res = await axios.post(
        `/api/v1/student/grammar/lessons/${lessonId}/bookmark`,
        {},
        { headers: authHeaders },
      );
      return res.data.data;
    },
    onSuccess: (data) => {
      if (!data) return;
      queryClient.setQueryData(
        ['grammar-lesson-detail', lessonId, token],
        (old: LessonDetail | undefined) => (old ? { ...old, isBookmarked: data.isBookmarked } : old),
      );
      queryClient.invalidateQueries({ queryKey: ['grammar-category-lessons'] });
      queryClient.invalidateQueries({ queryKey: ['grammar-recent'] });
    },
  });

  // Xử lý sự kiện cuộn trang
  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const scrollTop = el.scrollTop;
    const scrollHeight = el.scrollHeight;
    const clientHeight = el.clientHeight;
    const maxScroll = scrollHeight - clientHeight;

    if (maxScroll > 0) {
      const currentPercent = Math.min(100, Math.round((scrollTop / maxScroll) * 100));
      setScrollPercent((prev) => Math.max(prev, currentPercent));

      // Tự động đánh dấu hoàn thành khi đạt >= 80% nếu người dùng đã đăng nhập và chưa hoàn thành
      if (currentPercent >= 80 && lesson && !lesson.isCompleted && token) {
        progressMutation.mutate({ scrollPercentage: currentPercent, markAsCompleted: true });
      }
    }
  }, [lesson, token, progressMutation]);

  // Nhảy tới mục tiêu TOC
  const scrollToAnchor = (anchorId: string) => {
    setIsTocOpen(false);
    const targetEl = document.getElementById(anchorId);
    if (targetEl && scrollContainerRef.current) {
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  if (isLoading || !lesson) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
        <div className="flex flex-col items-center gap-3 rounded-2xl bg-white p-8 shadow-2xl">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="text-sm font-semibold text-slate-600">Đang tải bài giảng lý thuyết...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-900/60 backdrop-blur-sm sm:p-4 md:p-6 overflow-hidden">
      <div className="relative flex h-full w-full max-w-5xl mx-auto flex-col rounded-none sm:rounded-2xl bg-white shadow-2xl overflow-hidden">
        {/* 1. TOP HEADER & READING PROGRESS BAR */}
        <div className="relative z-20 border-b border-slate-200 bg-white">
          <div className="flex items-center justify-between px-4 py-3 sm:px-6">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                title="Quay lại danh sách"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="min-w-0">
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600">
                  {lesson.categoryTitle}
                </span>
                <h1 className="truncate text-base sm:text-lg font-black text-slate-900" title={lesson.title}>
                  {lesson.title}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* Nút Mục lục TOC */}
              <button
                onClick={() => setIsTocOpen(!isTocOpen)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                  isTocOpen ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
                title="Mục lục bài giảng"
              >
                <List className="h-4 w-4" />
                <span className="hidden sm:inline">Mục lục ({lesson.tableOfContents?.length || 0})</span>
              </button>

              {/* Nút Bookmark */}
              <button
                onClick={() => bookmarkMutation.mutate()}
                className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${
                  lesson.isBookmarked
                    ? 'bg-amber-100 text-amber-600 hover:bg-amber-200'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
                title={lesson.isBookmarked ? 'Đã lưu yêu thích' : 'Lưu bài giảng'}
              >
                {lesson.isBookmarked ? (
                  <BookmarkCheck className="h-5 w-5 fill-amber-500 text-amber-600" />
                ) : (
                  <Bookmark className="h-5 w-5" />
                )}
              </button>

              {/* Nút Đóng */}
              <button
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Thanh tiến độ đọc trực quan (Sticky Top Reading Progress Bar) */}
          <div className="h-1.5 w-full bg-slate-100 relative overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 transition-all duration-150 ease-out"
              style={{ width: `${scrollPercent}%` }}
            />
          </div>
        </div>

        {/* 2. BODY CONTENT AREA WITH TOC DRAWER */}
        <div className="relative flex flex-1 overflow-hidden">
          {/* Scrollable Reader View */}
          <div
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto px-5 py-6 sm:px-10 sm:py-8"
          >
            {/* Meta summary card */}
            <div className="mb-6 rounded-2xl bg-slate-50 border border-slate-200/80 p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 mb-2">
                <span className="flex items-center gap-1.5 font-medium">
                  <Clock className="h-4 w-4 text-blue-600" />
                  Thời gian đọc ước tính: <strong>{lesson.estimatedReadTimeMinutes} phút</strong>
                </span>
                <span className="flex items-center gap-1.5 font-medium">
                  {lesson.isCompleted ? (
                    <span className="flex items-center gap-1 text-emerald-600 font-bold">
                      <CheckCircle className="h-4 w-4" /> Đã hoàn thành (100%)
                    </span>
                  ) : (
                    <span className="text-slate-600 font-semibold">
                      Tiến độ đọc: {scrollPercent}%
                    </span>
                  )}
                </span>
              </div>
              <p className="text-sm font-medium text-slate-700 italic leading-relaxed">
                "{lesson.summary}"
              </p>
            </div>

            {/* Markdown rendered body */}
            <div className="max-w-3xl mx-auto">
              <MarkdownRenderer content={lesson.contentMarkdown} />
            </div>

            <div className="h-20" />
          </div>

          {/* TOC Slide-out Panel (Mục lục động) */}
          {isTocOpen && (
            <div className="absolute right-0 top-0 bottom-0 z-30 w-72 sm:w-80 border-l border-slate-200 bg-white/95 backdrop-blur-md p-5 shadow-2xl flex flex-col">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-3">
                <div className="flex items-center gap-2">
                  <List className="h-4 w-4 text-blue-600" />
                  <h3 className="text-sm font-extrabold text-slate-900">Mục lục nội dung</h3>
                </div>
                <button
                  onClick={() => setIsTocOpen(false)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
                {lesson.tableOfContents?.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => scrollToAnchor(item.id)}
                    className={`w-full text-left rounded-lg px-2.5 py-1.5 text-xs transition-colors hover:bg-blue-50 hover:text-blue-700 ${
                      item.level === 1
                        ? 'font-bold text-slate-900'
                        : item.level === 2
                        ? 'pl-5 font-semibold text-slate-700'
                        : 'pl-8 font-medium text-slate-500'
                    }`}
                  >
                    {item.title}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 3. COMPLETION POPUP TOAST */}
        {showCompletionToast && (
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-white shadow-xl animate-bounce">
            <Award className="h-5 w-5" />
            <span className="text-xs sm:text-sm font-bold">
              Xuất sắc! Bạn đã hoàn thành lý thuyết và tích lũy chuỗi Streak!
            </span>
          </div>
        )}

        {/* 4. BOTTOM ACTION & NAVIGATION BAR */}
        <div className="relative z-20 border-t border-slate-200 bg-white px-4 py-3 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Previous lesson navigation */}
            {lesson.previousLessonId ? (
              <button
                onClick={() => onSelectLesson(lesson.previousLessonId!)}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Bài trước</span>
              </button>
            ) : (
              <div />
            )}

            {/* Action buttons center */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (!token) {
                    onRequireAuth();
                    return;
                  }
                  progressMutation.mutate({ scrollPercentage: 100, markAsCompleted: true });
                }}
                disabled={lesson.isCompleted}
                className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-extrabold shadow-sm transition-all ${
                  lesson.isCompleted
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default'
                    : 'bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95'
                }`}
              >
                <CheckCircle className="h-4 w-4" />
                <span>{lesson.isCompleted ? 'Đã hiểu bài (Hoàn thành)' : 'Đã hiểu bài học'}</span>
              </button>

              {lesson.hasQuiz && (
                <button
                  onClick={() => {
                    if (!token) {
                      onRequireAuth();
                      return;
                    }
                    setIsQuizModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-extrabold text-white shadow-sm hover:bg-blue-700 transition-colors"
                  title="Làm bài tập trắc nghiệm củng cố"
                >
                  <span>Làm Quiz ({lesson.quizCount} câu)</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Next lesson navigation */}
            {lesson.nextLessonId ? (
              <button
                onClick={() => onSelectLesson(lesson.nextLessonId!)}
                className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 transition-colors"
              >
                <span>Bài kế tiếp</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            ) : (
              <div />
            )}
          </div>
        </div>
      </div>

      {/* QUIZ MODAL */}
      {isQuizModalOpen && (
        <GrammarQuizModal
          lessonId={lesson.id}
          lessonTitle={lesson.title}
          token={token}
          onClose={() => setIsQuizModalOpen(false)}
          onRequireAuth={onRequireAuth}
        />
      )}
    </div>
  );
};
