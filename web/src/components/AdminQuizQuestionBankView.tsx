import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import {
  Plus,
  Search,
  Trash2,
  Edit3,
  CheckCircle2,
  AlertCircle,
  Layers,
  X,
} from 'lucide-react';

interface QuestionItem {
  id: string;
  lessonId: string;
  questionNumber: number;
  questionText: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correctOption: 'A' | 'B' | 'C' | 'D';
  explanation: string;
  translation: string | null;
  difficultyLevel: 'EASY' | 'MEDIUM' | 'HARD';
  createdAt: string;
  lesson?: {
    id: string;
    title: string;
  };
}

interface AdminQuizQuestionBankViewProps {
  token: string | null;
  userRole?: string;
}

export const AdminQuizQuestionBankView: React.FC<AdminQuizQuestionBankViewProps> = ({
  token,
  userRole,
}) => {
  const queryClient = useQueryClient();
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('ALL');
  const [page, setPage] = useState(1);

  // Modal create/edit states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<QuestionItem | null>(null);

  // Form fields
  const [lessonIdInput, setLessonIdInput] = useState('1f2c123c-36f2-4c41-b3bf-75f4d762c0b9');
  const [questionNumberInput, setQuestionNumberInput] = useState(1);
  const [questionTextInput, setQuestionTextInput] = useState('');
  const [optionAInput, setOptionAInput] = useState('');
  const [optionBInput, setOptionBInput] = useState('');
  const [optionCInput, setOptionCInput] = useState('');
  const [optionDInput, setOptionDInput] = useState('');
  const [correctOptionInput, setCorrectOptionInput] = useState<'A' | 'B' | 'C' | 'D'>('A');
  const [explanationInput, setExplanationInput] = useState('');
  const [translationInput, setTranslationInput] = useState('');
  const [difficultyInput, setDifficultyInput] = useState<'EASY' | 'MEDIUM' | 'HARD'>('MEDIUM');

  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

  // 1. Query Questions
  const { data: questionsData, isLoading } = useQuery<{
    items: QuestionItem[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>({
    queryKey: ['adminQuestions', selectedDifficulty, searchKeyword, page, token],
    queryFn: async () => {
      const diffQuery = selectedDifficulty !== 'ALL' ? `&difficulty=${selectedDifficulty}` : '';
      const kwQuery = searchKeyword ? `&search=${encodeURIComponent(searchKeyword)}` : '';
      const res = await axios.get(
        `/api/v1/admin/grammar/questions?page=${page}&limit=10${diffQuery}${kwQuery}`,
        { headers: authHeaders },
      );
      return res.data.data;
    },
    enabled: !!token && (userRole === 'ADMIN' || userRole === 'TEACHER'),
  });

  // 2. Mutation Create/Edit
  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        lessonId: lessonIdInput,
        questionNumber: Number(questionNumberInput),
        questionText: questionTextInput,
        options: {
          A: optionAInput,
          B: optionBInput,
          C: optionCInput,
          D: optionDInput,
        },
        correctOption: correctOptionInput,
        explanation: explanationInput,
        translation: translationInput || undefined,
        difficultyLevel: difficultyInput,
      };

      if (editingQuestion) {
        const res = await axios.put(
          `/api/v1/admin/grammar/questions/${editingQuestion.id}`,
          payload,
          { headers: authHeaders },
        );
        return res.data.data;
      } else {
        const res = await axios.post(
          '/api/v1/admin/grammar/questions',
          payload,
          { headers: authHeaders },
        );
        return res.data.data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminQuestions'] });
      setIsModalOpen(false);
      resetForm();
    },
  });

  // 3. Mutation Delete
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await axios.delete(`/api/v1/admin/grammar/questions/${id}`, {
        headers: authHeaders,
      });
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminQuestions'] });
    },
  });

  const resetForm = () => {
    setEditingQuestion(null);
    setQuestionTextInput('');
    setOptionAInput('');
    setOptionBInput('');
    setOptionCInput('');
    setOptionDInput('');
    setCorrectOptionInput('A');
    setExplanationInput('');
    setTranslationInput('');
    setDifficultyInput('MEDIUM');
  };

  const openCreateModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (q: QuestionItem) => {
    setEditingQuestion(q);
    setLessonIdInput(q.lessonId);
    setQuestionNumberInput(q.questionNumber);
    setQuestionTextInput(q.questionText);
    setOptionAInput(q.options.A);
    setOptionBInput(q.options.B);
    setOptionCInput(q.options.C);
    setOptionDInput(q.options.D);
    setCorrectOptionInput(q.correctOption);
    setExplanationInput(q.explanation);
    setTranslationInput(q.translation || '');
    setDifficultyInput(q.difficultyLevel);
    setIsModalOpen(true);
  };

  if (userRole !== 'ADMIN' && userRole !== 'TEACHER') {
    return (
      <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm">
        <AlertCircle className="mx-auto text-rose-500 mb-4" size={48} />
        <h2 className="text-xl font-bold text-slate-800 mb-2">Truy cập bị giới hạn</h2>
        <p className="text-slate-500 text-sm">
          Khu vực Quản lý Ngân hàng câu hỏi chỉ dành riêng cho Quản trị viên (Admin) và Giảng viên (Teacher).
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* HEADER BANNER */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-900 rounded-3xl p-6 md:p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-xs font-semibold text-blue-200 mb-2">
            <Layers size={13} className="text-blue-300" />
            Quản Trị Ngân Hàng Đề Thi & Bài Tập Quiz
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            Ngân Hàng Câu Hỏi Quiz & Ngữ Pháp
          </h1>
          <p className="text-slate-300 text-sm mt-1">
            Quản lý tập trung câu hỏi trắc nghiệm, cấu hình đáp án A-B-C-D, lời giải và độ khó chuẩn hóa TOEIC Part 5 & 6.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow transition flex items-center gap-2 self-start md:self-auto shrink-0"
        >
          <Plus size={16} />
          Thêm câu hỏi mới
        </button>
      </div>

      {/* FILTER CONTROLS */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search size={18} className="absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo nội dung câu hỏi..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition"
          />
        </div>

        <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          {['ALL', 'EASY', 'MEDIUM', 'HARD'].map((diff) => (
            <button
              key={diff}
              onClick={() => setSelectedDifficulty(diff)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap ${
                selectedDifficulty === diff
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {diff === 'ALL' ? 'Tất cả độ khó' : diff}
            </button>
          ))}
        </div>
      </div>

      {/* QUESTIONS LIST */}
      {isLoading ? (
        <div className="text-center py-20 text-slate-400">Đang tải ngân hàng câu hỏi...</div>
      ) : !questionsData?.items || questionsData.items.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center text-slate-400 text-sm border border-dashed border-slate-200">
          Chưa có câu hỏi nào trong ngân hàng phù hợp với bộ lọc tìm kiếm.
        </div>
      ) : (
        <div className="space-y-4">
          {questionsData.items.map((q) => (
            <div
              key={q.id}
              className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:border-slate-300 transition space-y-3"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-700 font-black text-xs flex items-center justify-center">
                    #{q.questionNumber}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                      q.difficultyLevel === 'EASY'
                        ? 'bg-emerald-100 text-emerald-700'
                        : q.difficultyLevel === 'MEDIUM'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-rose-100 text-rose-700'
                    }`}
                  >
                    {q.difficultyLevel}
                  </span>
                  {q.lesson?.title && (
                    <span className="text-xs text-slate-400 font-semibold truncate max-w-xs">
                      • {q.lesson.title}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditModal(q)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition"
                    title="Chỉnh sửa câu hỏi"
                  >
                    <Edit3 size={15} />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Bạn có chắc chắn muốn xóa câu hỏi này khỏi ngân hàng?')) {
                        deleteMutation.mutate(q.id);
                      }
                    }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                    title="Xóa câu hỏi"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              {/* Question Text */}
              <p className="text-sm font-bold text-slate-800 leading-relaxed">
                {q.questionText}
              </p>

              {/* 4 Options Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {(['A', 'B', 'C', 'D'] as const).map((optKey) => {
                  const isCorrect = q.correctOption === optKey;
                  return (
                    <div
                      key={optKey}
                      className={`p-2.5 rounded-xl border flex items-center gap-2 font-medium ${
                        isCorrect
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold'
                          : 'bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                    >
                      <span
                        className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black shrink-0 ${
                          isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {optKey}
                      </span>
                      <span className="truncate">{q.options[optKey]}</span>
                      {isCorrect && <CheckCircle2 size={14} className="text-emerald-600 ml-auto shrink-0" />}
                    </div>
                  );
                })}
              </div>

              {/* Explanation & Translation */}
              <div className="bg-slate-50 rounded-xl p-3 text-xs space-y-1 text-slate-600 border border-slate-100">
                <div>
                  <span className="font-bold text-slate-700">Lời giải: </span>
                  {q.explanation}
                </div>
                {q.translation && (
                  <div>
                    <span className="font-bold text-slate-700">Bản dịch: </span>
                    {q.translation}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Pagination */}
          {questionsData.totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 pt-4">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold disabled:opacity-40"
              >
                Trước
              </button>
              <span className="text-xs font-semibold text-slate-500">
                Trang {page} / {questionsData.totalPages}
              </span>
              <button
                disabled={page >= questionsData.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold disabled:opacity-40"
              >
                Tiếp
              </button>
            </div>
          )}
        </div>
      )}

      {/* CREATE / EDIT QUESTION MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-base text-slate-800">
                {editingQuestion ? 'Cập Nhật Câu Hỏi Quiz' : 'Tạo Câu Hỏi Quiz Mới'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Mã bài học (Lesson UUID)
                </label>
                <input
                  type="text"
                  value={lessonIdInput}
                  onChange={(e) => setLessonIdInput(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-mono text-[11px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Số thứ tự (#)</label>
                  <input
                    type="number"
                    value={questionNumberInput}
                    onChange={(e) => setQuestionNumberInput(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Độ khó</label>
                  <select
                    value={difficultyInput}
                    onChange={(e) =>
                      setDifficultyInput(e.target.value as 'EASY' | 'MEDIUM' | 'HARD')
                    }
                    className="w-full p-2.5 rounded-xl border border-slate-200"
                  >
                    <option value="EASY">EASY (Dễ)</option>
                    <option value="MEDIUM">MEDIUM (Trung bình)</option>
                    <option value="HARD">HARD (Khó)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Nội dung câu hỏi</label>
                <textarea
                  rows={2}
                  value={questionTextInput}
                  onChange={(e) => setQuestionTextInput(e.target.value)}
                  placeholder="Nhập nội dung câu hỏi trắc nghiệm..."
                  className="w-full p-2.5 rounded-xl border border-slate-200"
                />
              </div>

              <div className="space-y-2">
                <label className="font-bold text-slate-700 block">4 Phương án (A, B, C, D)</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    placeholder="Phương án A"
                    value={optionAInput}
                    onChange={(e) => setOptionAInput(e.target.value)}
                    className="p-2 rounded-xl border border-slate-200"
                  />
                  <input
                    placeholder="Phương án B"
                    value={optionBInput}
                    onChange={(e) => setOptionBInput(e.target.value)}
                    className="p-2 rounded-xl border border-slate-200"
                  />
                  <input
                    placeholder="Phương án C"
                    value={optionCInput}
                    onChange={(e) => setOptionCInput(e.target.value)}
                    className="p-2 rounded-xl border border-slate-200"
                  />
                  <input
                    placeholder="Phương án D"
                    value={optionDInput}
                    onChange={(e) => setOptionDInput(e.target.value)}
                    className="p-2 rounded-xl border border-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Đáp án đúng</label>
                <div className="flex gap-4">
                  {(['A', 'B', 'C', 'D'] as const).map((key) => (
                    <label key={key} className="flex items-center gap-1.5 cursor-pointer font-bold">
                      <input
                        type="radio"
                        name="correctOption"
                        checked={correctOptionInput === key}
                        onChange={() => setCorrectOptionInput(key)}
                      />
                      Phương án {key}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Lời giải chi tiết</label>
                <textarea
                  rows={2}
                  value={explanationInput}
                  onChange={(e) => setExplanationInput(e.target.value)}
                  placeholder="Giải thích ngữ pháp vì sao chọn phương án này..."
                  className="w-full p-2.5 rounded-xl border border-slate-200"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Bản dịch tiếng Việt (tùy chọn)</label>
                <input
                  type="text"
                  value={translationInput}
                  onChange={(e) => setTranslationInput(e.target.value)}
                  placeholder="Bản dịch nghĩa câu hỏi..."
                  className="w-full p-2.5 rounded-xl border border-slate-200"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={saveMutation.isPending || !questionTextInput || !optionAInput || !optionBInput}
                onClick={() => saveMutation.mutate()}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-sm disabled:opacity-50"
              >
                {saveMutation.isPending ? 'Đang lưu...' : 'Lưu câu hỏi'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
