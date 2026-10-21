import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import {
  X,
  CheckCircle2,
  XCircle,
  Award,
  RotateCcw,
  ChevronRight,
  ChevronLeft,
  Clock,
  Sparkles,
  HelpCircle,
  AlertCircle,
  BookOpen,
} from 'lucide-react';

interface StudentQuizQuestion {
  id: string;
  questionNumber: number;
  questionText: string;
  options: Record<string, string>;
  difficultyLevel: string;
}

interface QuestionReviewItem {
  questionId: string;
  questionNumber: number;
  questionText: string;
  options: Record<string, string>;
  selectedOption: string | null;
  correctOption: string;
  isCorrect: boolean;
  explanation: string;
  translation: string | null;
}

interface QuizResult {
  attemptId: string;
  lessonId: string;
  score: number;
  correctCount: number;
  totalQuestions: number;
  isPassed: boolean;
  attemptNumber: number;
  durationSeconds: number;
  submittedAt: string;
  questions: QuestionReviewItem[];
}

interface GrammarQuizModalProps {
  lessonId: string;
  lessonTitle: string;
  token: string | null;
  onClose: () => void;
  onRequireAuth: () => void;
}

export const GrammarQuizModal: React.FC<GrammarQuizModalProps> = ({
  lessonId,
  lessonTitle,
  token,
  onClose,
  onRequireAuth,
}) => {
  const queryClient = useQueryClient();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [seconds, setSeconds] = useState(0);
  const [resultData, setResultData] = useState<QuizResult | null>(null);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);

  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

  // 1. Đồng hồ đếm giây làm bài
  useEffect(() => {
    if (resultData) return;
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [resultData]);

  // 2. Tải câu hỏi từ Backend (ẩn đáp án)
  const { data: quizData, isLoading } = useQuery({
    queryKey: ['grammar-quiz-questions', lessonId, token],
    queryFn: async () => {
      if (!token) {
        onRequireAuth();
        throw new Error('Vui lòng đăng nhập');
      }
      const res = await axios.get(`/api/v1/student/grammar/lessons/${lessonId}/quiz`, {
        headers: authHeaders,
      });
      return res.data.data;
    },
    enabled: Boolean(token),
  });

  // 3. Mutation nộp bài thi
  const submitMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        answers: Object.entries(selectedAnswers).map(([questionId, selectedOption]) => ({
          questionId,
          selectedOption,
        })),
        durationSeconds: seconds,
      };
      const res = await axios.post(
        `/api/v1/student/grammar/lessons/${lessonId}/quiz/submit`,
        payload,
        { headers: authHeaders },
      );
      return res.data.data as QuizResult;
    },
    onSuccess: (data) => {
      setResultData(data);
      setShowConfirmSubmit(false);
      queryClient.invalidateQueries({ queryKey: ['grammar-categories'] });
      queryClient.invalidateQueries({ queryKey: ['grammar-category-lessons'] });
      queryClient.invalidateQueries({ queryKey: ['grammar-lesson-detail', lessonId] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });

  if (isLoading || !quizData) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
        <div className="flex flex-col items-center gap-3 rounded-2xl bg-white p-8 shadow-2xl">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="text-sm font-semibold text-slate-600">Đang tải bộ câu hỏi kiểm tra...</p>
        </div>
      </div>
    );
  }

  const questions: StudentQuizQuestion[] = quizData.questions || [];
  const currentQ = questions[currentIndex];
  const progressPercent = Math.round(((currentIndex + 1) / questions.length) * 100);
  const answeredCount = Object.keys(selectedAnswers).length;

  const handleSelectOption = (opt: string) => {
    if (!currentQ) return;
    setSelectedAnswers({
      ...selectedAnswers,
      [currentQ.id]: opt,
    });
  };

  const handleResetQuiz = () => {
    setResultData(null);
    setSelectedAnswers({});
    setCurrentIndex(0);
    setSeconds(0);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-900/60 backdrop-blur-sm sm:p-4 md:p-6 overflow-hidden">
      <div className="relative flex h-full w-full max-w-4xl mx-auto flex-col rounded-none sm:rounded-2xl bg-white shadow-2xl overflow-hidden">
        {/* ============================================================== */}
        {/* VIEW 1: TRẠNG THÁI LÀM BÀI KIỂM TRA (IN PROGRESS)              */}
        {/* ============================================================== */}
        {!resultData ? (
          <>
            {/* Header */}
            <div className="border-b border-slate-200 bg-white">
              <div className="flex items-center justify-between px-4 py-3 sm:px-6">
                <div className="flex items-center gap-3">
                  <button
                    onClick={onClose}
                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600">
                      Quiz củng cố kiến thức
                    </span>
                    <h2 className="text-sm sm:text-base font-extrabold text-slate-900 truncate max-w-sm sm:max-w-md">
                      {lessonTitle}
                    </h2>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* Timer */}
                  <div className="flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-1.5 font-mono text-xs font-bold text-slate-700">
                    <Clock className="h-4 w-4 text-blue-600" />
                    <span>
                      {Math.floor(seconds / 60).toString().padStart(2, '0')}:
                      {(seconds % 60).toString().padStart(2, '0')}
                    </span>
                  </div>

                  <span className="text-xs font-bold text-slate-500">
                    Câu {currentIndex + 1}/{questions.length}
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="h-1.5 w-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Question Card Body */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-8">
              {currentQ ? (
                <div className="max-w-2xl mx-auto space-y-6">
                  {/* Difficulty & Question Prompt */}
                  <div className="rounded-2xl border border-slate-200/90 bg-slate-50/50 p-5 sm:p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <span className="inline-flex items-center gap-1 rounded-md bg-blue-100 px-2 py-0.5 text-[11px] font-extrabold uppercase text-blue-800">
                        <Sparkles className="h-3 w-3" />
                        Độ khó: {currentQ.difficultyLevel}
                      </span>
                      <span className="text-xs font-bold text-slate-400">
                        Part 5 TOEIC
                      </span>
                    </div>

                    <h3 className="text-base sm:text-lg font-black text-slate-900 leading-relaxed">
                      {currentQ.questionText}
                    </h3>
                  </div>

                  {/* 4 Answer Options */}
                  <div className="space-y-3">
                    {Object.entries(currentQ.options).map(([key, value]) => {
                      const isSelected = selectedAnswers[currentQ.id] === key;
                      return (
                        <div
                          key={key}
                          onClick={() => handleSelectOption(key)}
                          className={`cursor-pointer rounded-2xl p-4 transition-all border flex items-center gap-3.5 ${
                            isSelected
                              ? 'border-blue-600 bg-blue-50/60 shadow-sm ring-1 ring-blue-500/20'
                              : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          <span
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-black transition-colors ${
                              isSelected
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {key}
                          </span>
                          <span className="text-sm font-semibold text-slate-800">
                            {value}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>

            {/* Bottom Navigation & Submit Bar */}
            <div className="border-t border-slate-200 bg-white px-4 py-3 sm:px-6">
              <div className="flex items-center justify-between gap-3">
                <button
                  disabled={currentIndex === 0}
                  onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                  className={`flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition-colors ${
                    currentIndex === 0 ? 'opacity-40 cursor-not-allowed' : 'hover:bg-slate-50'
                  }`}
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span>Câu trước</span>
                </button>

                {currentIndex === questions.length - 1 ? (
                  <button
                    onClick={() => {
                      if (answeredCount < questions.length) {
                        setShowConfirmSubmit(true);
                      } else {
                        submitMutation.mutate();
                      }
                    }}
                    disabled={submitMutation.isPending}
                    className="flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-xs font-extrabold text-white shadow-sm hover:bg-emerald-700 transition-colors active:scale-95"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>
                      {submitMutation.isPending ? 'Đang chấm điểm...' : 'Nộp bài kiểm tra'}
                    </span>
                  </button>
                ) : (
                  <button
                    onClick={() => setCurrentIndex((i) => Math.min(questions.length - 1, i + 1))}
                    className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-extrabold text-white shadow-sm hover:bg-blue-700 transition-colors"
                  >
                    <span>Câu tiếp</span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Confirmation dialog when questions are unfinished */}
            {showConfirmSubmit && (
              <div className="absolute inset-0 z-40 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
                <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl text-center space-y-4">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                    <AlertCircle className="h-6 w-6" />
                  </div>
                  <h4 className="text-base font-extrabold text-slate-900">
                    Chưa trả lời hết câu hỏi
                  </h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Bạn mới hoàn thành {answeredCount}/{questions.length} câu hỏi. Bạn có chắc chắn muốn nộp bài ngay bây giờ?
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowConfirmSubmit(false)}
                      className="flex-1 rounded-xl border border-slate-200 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                    >
                      Làm tiếp
                    </button>
                    <button
                      onClick={() => submitMutation.mutate()}
                      className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white hover:bg-emerald-700"
                    >
                      Nộp luôn
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          /* ============================================================== */
          /* VIEW 2: KẾT QUẢ & LỜI GIẢI CHI TIẾT (RESULT REVIEW)             */
          /* ============================================================== */
          <div className="flex h-full flex-col overflow-hidden">
            {/* Header Banner */}
            <div
              className={`p-6 sm:p-8 text-center text-white border-b ${
                resultData.isPassed
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-700'
                  : 'bg-gradient-to-r from-rose-600 to-pink-700'
              }`}
            >
              <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md shadow-inner">
                <Award className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
                {resultData.isPassed ? 'ĐẠT CHUẨN THÀNH THẠO! 🎉' : 'CHƯA ĐẠT CHUẨN (CẦN ÔN LẠI)'}
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-white/90 font-medium">
                {resultData.isPassed
                  ? 'Chúc mừng bạn! Bài học ngữ pháp này đã được đánh dấu hoàn thành và cộng chuỗi Streak!'
                  : 'Bạn cần đạt từ 80% trở lên để hoàn thành bài học. Hãy đọc lại lời giải bên dưới nhé.'}
              </p>

              {/* Stats Bar */}
              <div className="mt-5 inline-flex flex-wrap items-center justify-center gap-4 rounded-2xl bg-white/15 px-5 py-2.5 text-xs font-bold backdrop-blur-md">
                <span>
                  Điểm số: <strong className="text-white text-sm">{resultData.score}/100</strong>
                </span>
                <span>•</span>
                <span>
                  Số câu đúng: {resultData.correctCount}/{resultData.totalQuestions}
                </span>
                <span>•</span>
                <span>
                  Thời gian: {Math.floor(resultData.durationSeconds / 60)}p {resultData.durationSeconds % 60}s
                </span>
                <span>•</span>
                <span>Lần thi #{resultData.attemptNumber}</span>
              </div>
            </div>

            {/* Detailed Question Review List */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-8 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">
                  Phân tích chi tiết từng câu hỏi & bẫy đề thi
                </h3>
                <span className="text-xs text-slate-400">
                  {resultData.correctCount}/{resultData.totalQuestions} câu chính xác
                </span>
              </div>

              {resultData.questions.map((item) => (
                <div
                  key={item.questionId}
                  className={`rounded-2xl border p-4 sm:p-5 transition-all ${
                    item.isCorrect
                      ? 'border-emerald-200 bg-emerald-50/30'
                      : 'border-rose-200 bg-rose-50/30'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      {item.isCorrect ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                      ) : (
                        <XCircle className="h-5 w-5 text-rose-600 shrink-0" />
                      )}
                      <span className="text-xs font-extrabold uppercase text-slate-900">
                        Câu {item.questionNumber}
                      </span>
                    </div>

                    <span
                      className={`rounded-md px-2 py-0.5 text-[10px] font-black uppercase ${
                        item.isCorrect
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {item.isCorrect ? 'Chính xác' : `Sai (Bạn chọn: ${item.selectedOption || 'Bỏ trống'})`}
                    </span>
                  </div>

                  <p className="text-sm font-bold text-slate-800 mb-3">
                    {item.questionText}
                  </p>

                  <div className="mb-3 rounded-xl bg-white border border-slate-200/80 p-3 text-xs">
                    <span className="font-extrabold text-blue-700">
                      Đáp án đúng: ({item.correctOption}) {item.options[item.correctOption]}
                    </span>
                  </div>

                  {/* Deep Explanation */}
                  <div className="space-y-1.5 rounded-xl bg-slate-100/80 p-3.5 text-xs text-slate-700 leading-relaxed font-sans">
                    <div className="flex items-center gap-1 font-bold text-slate-900">
                      <HelpCircle className="h-3.5 w-3.5 text-amber-600" />
                      <span>Giải thích chi tiết:</span>
                    </div>
                    <p>{item.explanation}</p>
                    {item.translation && (
                      <p className="italic text-slate-500 pt-1 border-t border-slate-200/60">
                        🇻🇳 <strong>Dịch nghĩa:</strong> {item.translation}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer Result Actions */}
            <div className="border-t border-slate-200 bg-white p-4 sm:px-6">
              <div className="flex items-center justify-between gap-3">
                <button
                  onClick={handleResetQuiz}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>Làm lại quiz</span>
                </button>

                <button
                  onClick={onClose}
                  className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-6 py-2.5 text-xs font-extrabold text-white shadow-sm hover:bg-blue-700 transition-colors"
                >
                  <BookOpen className="h-4 w-4" />
                  <span>Hoàn tất & Quay lại</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

