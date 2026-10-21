import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import {
  PenTool,
  Plus,
  Search,
  Trash2,
  Edit3,
  Clock,
  FileText,
  AlertCircle,
  X,
  Scale,
  Send,
  Users,
} from 'lucide-react';
import { AssignAssignmentModal } from './AssignAssignmentModal';
import { AssignedListModal } from './AssignedListModal';

interface RubricCriterion {
  key: string;
  name: string;
  weight: number;
  maxScore: number;
}

interface WritingRubric {
  timeLimitMinutes: number;
  minWords: number;
  maxWords: number;
  criteria: RubricCriterion[];
}

interface AssignmentItem {
  id: string;
  title: string;
  instructions: string;
  type: 'QUIZ' | 'WRITING' | 'SPEAKING';
  rubric: WritingRubric | null;
  createdBy: string;
  createdAt: string;
  creator?: {
    id: string;
    fullName: string;
    email: string;
    role: string;
  };
}

interface AdminWritingAssignmentsViewProps {
  token: string | null;
  userRole?: string;
}

const DEFAULT_CRITERIA: RubricCriterion[] = [
  { key: 'TASK_ACHIEVEMENT', name: 'Task Achievement (Hoàn thành yêu cầu)', weight: 25, maxScore: 10 },
  { key: 'COHERENCE_COHESION', name: 'Coherence & Cohesion (Tính mạch lạc & liên kết)', weight: 25, maxScore: 10 },
  { key: 'LEXICAL_RESOURCE', name: 'Lexical Resource (Vốn từ vựng phong phú)', weight: 25, maxScore: 10 },
  { key: 'GRAMMAR_ACCURACY', name: 'Grammatical Accuracy (Ngữ pháp chính xác)', weight: 25, maxScore: 10 },
];

export const AdminWritingAssignmentsView: React.FC<AdminWritingAssignmentsViewProps> = ({
  token,
  userRole,
}) => {
  const queryClient = useQueryClient();
  const [searchKeyword, setSearchKeyword] = useState('');
  const [page, setPage] = useState(1);

  // Modal create/edit states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<AssignmentItem | null>(null);

  // Distribution modals
  const [assignModalAssignment, setAssignModalAssignment] = useState<{ id: string; title: string } | null>(null);
  const [assignedListAssignment, setAssignedListAssignment] = useState<{ id: string; title: string } | null>(null);

  // Form states
  const [titleInput, setTitleInput] = useState('');
  const [instructionsInput, setInstructionsInput] = useState('');
  const [timeLimitInput, setTimeLimitInput] = useState(30);
  const [minWordsInput, setMinWordsInput] = useState(150);
  const [maxWordsInput, setMaxWordsInput] = useState(300);
  const [criteriaInput, setCriteriaInput] = useState<RubricCriterion[]>(DEFAULT_CRITERIA);

  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

  // 1. Query Assignments
  const { data: assignmentsData, isLoading } = useQuery<{
    items: AssignmentItem[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>({
    queryKey: ['adminWritingAssignments', searchKeyword, page, token],
    queryFn: async () => {
      const kwQuery = searchKeyword ? `&search=${encodeURIComponent(searchKeyword)}` : '';
      const res = await axios.get(
        `/api/v1/admin/assignments?type=WRITING&page=${page}&limit=10${kwQuery}`,
        { headers: authHeaders },
      );
      return res.data.data;
    },
    enabled: !!token && (userRole === 'ADMIN' || userRole === 'TEACHER'),
  });

  const totalRubricWeight = criteriaInput.reduce((sum, c) => sum + (Number(c.weight) || 0), 0);

  // 2. Mutation Save (Create or Edit)
  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        title: titleInput,
        instructions: instructionsInput,
        type: 'WRITING',
        rubric: {
          timeLimitMinutes: Number(timeLimitInput),
          minWords: Number(minWordsInput),
          maxWords: Number(maxWordsInput),
          criteria: criteriaInput.map((c) => ({
            key: c.key,
            name: c.name,
            weight: Number(c.weight),
            maxScore: Number(c.maxScore),
          })),
        },
      };

      if (editingAssignment) {
        const res = await axios.put(
          `/api/v1/admin/assignments/${editingAssignment.id}`,
          payload,
          { headers: authHeaders },
        );
        return res.data.data;
      } else {
        const res = await axios.post('/api/v1/admin/assignments', payload, {
          headers: authHeaders,
        });
        return res.data.data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminWritingAssignments'] });
      setIsModalOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Có lỗi xảy ra khi lưu đề bài.');
    },
  });

  // 3. Mutation Delete
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await axios.delete(`/api/v1/admin/assignments/${id}`, {
        headers: authHeaders,
      });
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminWritingAssignments'] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Không thể xóa đề bài đã có bài nộp.');
    },
  });

  const resetForm = () => {
    setEditingAssignment(null);
    setTitleInput('');
    setInstructionsInput('');
    setTimeLimitInput(30);
    setMinWordsInput(150);
    setMaxWordsInput(300);
    setCriteriaInput(DEFAULT_CRITERIA);
  };

  const openCreateModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (a: AssignmentItem) => {
    setEditingAssignment(a);
    setTitleInput(a.title);
    setInstructionsInput(a.instructions);
    if (a.rubric) {
      setTimeLimitInput(a.rubric.timeLimitMinutes);
      setMinWordsInput(a.rubric.minWords);
      setMaxWordsInput(a.rubric.maxWords);
      setCriteriaInput(a.rubric.criteria || DEFAULT_CRITERIA);
    } else {
      setTimeLimitInput(30);
      setMinWordsInput(150);
      setMaxWordsInput(300);
      setCriteriaInput(DEFAULT_CRITERIA);
    }
    setIsModalOpen(true);
  };

  const handleCriterionWeightChange = (index: number, newWeight: number) => {
    const updated = [...criteriaInput];
    updated[index].weight = newWeight;
    setCriteriaInput(updated);
  };

  if (userRole !== 'ADMIN' && userRole !== 'TEACHER') {
    return (
      <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm">
        <AlertCircle className="mx-auto text-rose-500 mb-4" size={48} />
        <h2 className="text-xl font-bold text-slate-800 mb-2">Truy cập bị giới hạn</h2>
        <p className="text-slate-500 text-sm">
          Khu vực Tạo đề bài tập Writing chỉ dành riêng cho Quản trị viên (Admin) và Giảng viên (Teacher).
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* HEADER BANNER */}
      <div className="bg-gradient-to-r from-rose-900 via-purple-900 to-slate-900 rounded-3xl p-6 md:p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-xs font-semibold text-rose-200 mb-2">
            <PenTool size={13} className="text-rose-300" />
            Quản Trị Đề Bài Tự Luận & Barem Rubric 4 Tiêu Chí
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            Kho Đề Bài Tập Writing & Rubric Studio
          </h1>
          <p className="text-slate-300 text-sm mt-1">
            Biên soạn đề bài viết luận, cấu hình giới hạn thời gian, số từ và thang điểm Rubric chuẩn hóa TOEIC Writing.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow transition flex items-center gap-2 self-start md:self-auto shrink-0"
        >
          <Plus size={16} />
          Tạo đề Writing mới
        </button>
      </div>

      {/* SEARCH CONTROLS */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search size={18} className="absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo tiêu đề bài tập Writing..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-rose-500 focus:bg-white transition"
          />
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Mô hình Template đề gốc: <span className="font-bold text-rose-600">POST /api/v1/admin/assignments</span>
        </div>
      </div>

      {/* ASSIGNMENTS LIST */}
      {isLoading ? (
        <div className="text-center py-20 text-slate-400">Đang tải danh mục đề bài Writing...</div>
      ) : !assignmentsData?.items || assignmentsData.items.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center text-slate-400 text-sm border border-dashed border-slate-200">
          Chưa có đề bài tập Writing nào được tạo. Hãy nhấn "Tạo đề Writing mới" để bắt đầu!
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {assignmentsData.items.map((a) => (
            <div
              key={a.id}
              className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:border-slate-300 transition flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-rose-100 text-rose-700">
                    WRITING TEMPLATE
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setAssignModalAssignment({ id: a.id, title: a.title })}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition"
                      title="Giao bài cho lớp kèm Deadline"
                    >
                      <Send size={15} />
                    </button>
                    <button
                      onClick={() => setAssignedListAssignment({ id: a.id, title: a.title })}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-purple-600 hover:bg-purple-50 transition"
                      title="Danh sách học viên & Gia hạn Deadline"
                    >
                      <Users size={15} />
                    </button>
                    <button
                      onClick={() => openEditModal(a)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition"
                      title="Chỉnh sửa đề bài"
                    >
                      <Edit3 size={15} />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Bạn có chắc chắn muốn xóa đề bài này?')) {
                          deleteMutation.mutate(a.id);
                        }
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                      title="Xóa đề bài"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                <h3 className="text-base font-extrabold text-slate-800 leading-snug">
                  {a.title}
                </h3>

                <p className="text-xs text-slate-600 mt-2 line-clamp-3 leading-relaxed">
                  {a.instructions}
                </p>
              </div>

              {/* Rubric Details Badges */}
              {a.rubric && (
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-600 font-bold">
                    <span className="flex items-center gap-1">
                      <Clock size={13} className="text-slate-400" />
                      {a.rubric.timeLimitMinutes} phút
                    </span>
                    <span className="flex items-center gap-1">
                      <FileText size={13} className="text-slate-400" />
                      {a.rubric.minWords} - {a.rubric.maxWords} từ
                    </span>
                  </div>

                  <div className="space-y-1 pt-1 border-t border-slate-200/60">
                    {a.rubric.criteria?.map((c) => (
                      <div key={c.key} className="flex justify-between text-[11px] text-slate-500">
                        <span className="truncate max-w-[200px]">{c.name}</span>
                        <span className="font-bold text-slate-700">
                          {c.weight}% ({c.maxScore}đ)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {assignmentsData && assignmentsData.totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 pt-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold disabled:opacity-40"
          >
            Trước
          </button>
          <span className="text-xs font-semibold text-slate-500">
            Trang {page} / {assignmentsData.totalPages}
          </span>
          <button
            disabled={page >= assignmentsData.totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold disabled:opacity-40"
          >
            Tiếp
          </button>
        </div>
      )}

      {/* CREATE / EDIT ASSIGNMENT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-base text-slate-800">
                {editingAssignment ? 'Cập Nhật Đề Bài Writing' : 'Tạo Đề Bài Writing Mới'}
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
                  Tiêu đề đề bài
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: TOEIC Writing Part 3: Write an Opinion Essay"
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Hướng dẫn & Nội dung câu hỏi (Instructions)
                </label>
                <textarea
                  rows={4}
                  placeholder="Nhập đề bài luận chi tiết..."
                  value={instructionsInput}
                  onChange={(e) => setInstructionsInput(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 leading-relaxed"
                />
              </div>

              {/* Limits Config */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Thời gian làm (phút)
                  </label>
                  <input
                    type="number"
                    min={5}
                    value={timeLimitInput}
                    onChange={(e) => setTimeLimitInput(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Số từ tối thiểu (min)
                  </label>
                  <input
                    type="number"
                    min={10}
                    value={minWordsInput}
                    onChange={(e) => setMinWordsInput(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Số từ tối đa (max)
                  </label>
                  <input
                    type="number"
                    min={50}
                    value={maxWordsInput}
                    onChange={(e) => setMaxWordsInput(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-slate-200"
                  />
                </div>
              </div>

              {/* Rubric 4 Criteria Builder */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700 flex items-center gap-1.5">
                    <Scale size={14} className="text-rose-600" />
                    Cấu hình Barem Rubric 4 Tiêu Chí (Tổng trọng số: 100%)
                  </label>
                  <span
                    className={`font-black px-2 py-0.5 rounded text-[11px] ${
                      totalRubricWeight === 100
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    Tổng: {totalRubricWeight}%
                  </span>
                </div>

                <div className="space-y-2">
                  {criteriaInput.map((criterion, idx) => (
                    <div
                      key={criterion.key}
                      className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3"
                    >
                      <div className="flex-1">
                        <span className="font-bold text-slate-800 block text-xs">
                          {criterion.name}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          Key: {criterion.key}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="w-20">
                          <label className="text-[10px] text-slate-400 block font-semibold">Trọng số %</label>
                          <input
                            type="number"
                            min={1}
                            max={100}
                            value={criterion.weight}
                            onChange={(e) => handleCriterionWeightChange(idx, Number(e.target.value))}
                            className="w-full p-1.5 rounded-lg border border-slate-200 text-xs font-bold"
                          />
                        </div>
                        <div className="w-16">
                          <label className="text-[10px] text-slate-400 block font-semibold">Điểm max</label>
                          <input
                            type="number"
                            disabled
                            value={criterion.maxScore}
                            className="w-full p-1.5 rounded-lg border border-slate-200 text-xs font-bold bg-slate-100 text-slate-500"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
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
                disabled={
                  saveMutation.isPending ||
                  !titleInput.trim() ||
                  !instructionsInput.trim() ||
                  totalRubricWeight !== 100 ||
                  minWordsInput >= maxWordsInput
                }
                onClick={() => saveMutation.mutate()}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-sm disabled:opacity-50"
              >
                {saveMutation.isPending ? 'Đang lưu...' : 'Lưu đề Writing'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ASSIGN ASSIGNMENT MODAL */}
      {assignModalAssignment && (
        <AssignAssignmentModal
          isOpen={!!assignModalAssignment}
          onClose={() => setAssignModalAssignment(null)}
          assignmentId={assignModalAssignment.id}
          assignmentTitle={assignModalAssignment.title}
          token={token}
        />
      )}

      {/* ASSIGNED LIST & EXTEND DEADLINE MODAL */}
      {assignedListAssignment && (
        <AssignedListModal
          isOpen={!!assignedListAssignment}
          onClose={() => setAssignedListAssignment(null)}
          assignmentId={assignedListAssignment.id}
          assignmentTitle={assignedListAssignment.title}
          token={token}
        />
      )}
    </div>
  );
};
