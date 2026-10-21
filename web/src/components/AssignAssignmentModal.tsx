import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import {
  Send,
  Calendar,
  AlertCircle,
  CheckCircle2,
  X,
  BellRing,
} from 'lucide-react';

interface ClassItem {
  id: string;
  code: string;
  name: string;
  studentCount: number;
}

interface AssignAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  assignmentId: string;
  assignmentTitle: string;
  token: string | null;
}

export const AssignAssignmentModal: React.FC<AssignAssignmentModalProps> = ({
  isOpen,
  onClose,
  assignmentId,
  assignmentTitle,
  token,
}) => {
  const queryClient = useQueryClient();
  const [selectedClassId, setSelectedClassId] = useState('');
  const [studentIdsInput, setStudentIdsInput] = useState('');
  const [assignMode, setAssignMode] = useState<'class' | 'individual'>('class');

  // Default dueDate: 7 days from now at 23:59:59
  const defaultDate = new Date();
  defaultDate.setDate(defaultDate.getDate() + 7);
  defaultDate.setHours(23, 59, 0, 0);
  const [dueDateInput, setDueDateInput] = useState(
    defaultDate.toISOString().slice(0, 16),
  );

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

  // Fetch Teacher's active classes
  const { data: classesData, isLoading: isClassesLoading } = useQuery<ClassItem[]>({
    queryKey: ['adminClasses', token],
    queryFn: async () => {
      const res = await axios.get('/api/v1/admin/classes', { headers: authHeaders });
      return res.data.data;
    },
    enabled: isOpen && !!token,
  });

  const assignMutation = useMutation({
    mutationFn: async () => {
      const selectedDate = new Date(dueDateInput);
      if (selectedDate <= new Date()) {
        throw new Error('Hạn nộp dueDate phải nằm ở thời điểm tương lai.');
      }

      let payload: { classId?: string; studentIds?: string[]; dueDate: string };

      if (assignMode === 'class') {
        if (!selectedClassId) {
          throw new Error('Vui lòng chọn lớp học cần giao bài.');
        }
        payload = {
          classId: selectedClassId,
          dueDate: selectedDate.toISOString(),
        };
      } else {
        const studentIds = studentIdsInput
          .split(/[\n,]+/)
          .map((s) => s.trim())
          .filter((s) => s.length > 0);
        if (studentIds.length === 0) {
          throw new Error('Vui lòng nhập ít nhất 1 UUID học viên.');
        }
        payload = {
          studentIds,
          dueDate: selectedDate.toISOString(),
        };
      }

      const res = await axios.post(
        `/api/v1/admin/assignments/${assignmentId}/assign`,
        payload,
        { headers: authHeaders },
      );
      return res.data.data;
    },
    onSuccess: (data: { assignedCount: number; dueDate: string }) => {
      setSuccessMessage(
        `Đã giao bài tập thành công cho ${data.assignedCount} học viên! Thông báo đã được đẩy vào hàng đợi BullMQ.`,
      );
      setErrorMessage(null);
      queryClient.invalidateQueries({ queryKey: ['adminAssignedList', assignmentId] });
      setTimeout(() => {
        onClose();
        setSuccessMessage(null);
      }, 1500);
    },
    onError: (err: unknown) => {
      const msg =
        axios.isAxiosError(err) && err.response?.data?.message
          ? err.response.data.message
          : err instanceof Error
            ? err.message
            : 'Đã xảy ra lỗi khi giao bài tập.';
      setErrorMessage(msg);
    },
  });

  if (!isOpen) return null;

  const setPresetDays = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    d.setHours(23, 59, 0, 0);
    setDueDateInput(d.toISOString().slice(0, 16));
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
              <Send size={18} />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-800">
                Giao Bài Tập & Đặt Deadline
              </h3>
              <p className="text-xs text-slate-400 truncate max-w-xs" title={assignmentTitle}>
                {assignmentTitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-xl"
          >
            <X size={20} />
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            assignMutation.mutate();
          }}
          className="space-y-4 pt-4"
        >
          {/* MODE SELECTOR */}
          <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setAssignMode('class')}
              className={`py-1.5 text-xs font-bold rounded-lg transition ${
                assignMode === 'class'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              Giao theo Lớp học
            </button>
            <button
              type="button"
              onClick={() => setAssignMode('individual')}
              className={`py-1.5 text-xs font-bold rounded-lg transition ${
                assignMode === 'individual'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              Học viên cá nhân
            </button>
          </div>

          {/* CLASS SELECTION */}
          {assignMode === 'class' ? (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Chọn Lớp học phụ trách *
              </label>
              {isClassesLoading ? (
                <div className="text-xs text-slate-400 py-2">Đang tải danh sách lớp...</div>
              ) : !classesData || classesData.length === 0 ? (
                <div className="text-xs text-amber-600 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                  Không tìm thấy lớp học nào do bạn phụ trách.
                </div>
              ) : (
                <select
                  required
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                >
                  <option value="">-- Chọn lớp học --</option>
                  {classesData.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name} ({cls.code}) • {cls.studentCount} học viên
                    </option>
                  ))}
                </select>
              )}
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Danh sách UUID Học viên (mỗi dòng hoặc phân tách bởi dấu phẩy) *
              </label>
              <textarea
                required
                rows={3}
                placeholder="VD: 4503a395-5212-433d-a7d1-0fd22b61d039"
                value={studentIdsInput}
                onChange={(e) => setStudentIdsInput(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>
          )}

          {/* DUE DATE PICKER & PRESETS */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
              <span>Hạn nộp bài (Deadline) *</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPresetDays(3)}
                  className="text-[10px] px-2 py-0.5 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 rounded-md font-bold text-slate-600"
                >
                  +3 ngày
                </button>
                <button
                  type="button"
                  onClick={() => setPresetDays(7)}
                  className="text-[10px] px-2 py-0.5 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 rounded-md font-bold text-slate-600"
                >
                  +7 ngày
                </button>
                <button
                  type="button"
                  onClick={() => setPresetDays(14)}
                  className="text-[10px] px-2 py-0.5 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 rounded-md font-bold text-slate-600"
                >
                  +14 ngày
                </button>
              </div>
            </label>
            <div className="relative">
              <Calendar size={15} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                type="datetime-local"
                required
                value={dueDateInput}
                onChange={(e) => setDueDateInput(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              />
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">
              Mô hình Deadline Độc lập: Hạn nộp chỉ áp dụng cho đợt giao bài này.
            </span>
          </div>

          {/* BULLMQ NOTIFICATION BANNER */}
          <div className="bg-blue-50/70 border border-blue-100 rounded-2xl p-3 flex items-center gap-2.5">
            <BellRing size={16} className="text-blue-600 shrink-0" />
            <span className="text-[11px] text-blue-900 leading-tight">
              Hệ thống sẽ tự động gửi Push Notification (FCM) & Email thông báo bài tập mới qua BullMQ Queue.
            </span>
          </div>

          {/* SUCCESS MESSAGE */}
          {successMessage && (
            <div className="bg-emerald-50 text-emerald-700 text-xs p-3 rounded-xl border border-emerald-200 flex items-center gap-2">
              <CheckCircle2 size={16} />
              <span>{successMessage}</span>
            </div>
          )}

          {/* ERROR MESSAGE */}
          {errorMessage && (
            <div className="bg-rose-50 text-rose-700 text-xs p-3 rounded-xl border border-rose-200 flex items-center gap-2">
              <AlertCircle size={16} />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* FOOTER ACTIONS */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={assignMutation.isPending}
              className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {assignMutation.isPending ? 'Đang phân công...' : 'Xác Nhận Giao Bài'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
