import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import {
  Users,
  Clock,
  AlertCircle,
  CheckCircle2,
  X,
  Edit2,
  ShieldAlert,
} from 'lucide-react';

interface AssignedStudentItem {
  id: string;
  assignmentId: string;
  studentId: string;
  classId: string | null;
  dueDate: string;
  isCompleted: boolean;
  isOverdue: boolean;
  remainingSeconds: number;
  student: {
    id: string;
    email: string;
    fullName: string;
  } | null;
  classGroup: {
    id: string;
    code: string;
    name: string;
  } | null;
}

interface AssignedListResponse {
  items: AssignedStudentItem[];
  total: number;
  summary: {
    totalAssigned: number;
    completedCount: number;
    overdueCount: number;
  };
}

interface AssignedListModalProps {
  isOpen: boolean;
  onClose: () => void;
  assignmentId: string;
  assignmentTitle: string;
  token: string | null;
}

export const AssignedListModal: React.FC<AssignedListModalProps> = ({
  isOpen,
  onClose,
  assignmentId,
  assignmentTitle,
  token,
}) => {
  const queryClient = useQueryClient();
  const [extendingTargetId, setExtendingTargetId] = useState<string | null>(null);
  const [newDueDateInput, setNewDueDateInput] = useState('');
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

  // Fetch assigned list
  const { data, isLoading, refetch } = useQuery<AssignedListResponse>({
    queryKey: ['adminAssignedList', assignmentId, token],
    queryFn: async () => {
      const res = await axios.get(
        `/api/v1/admin/assignments/${assignmentId}/assigned-list`,
        { headers: authHeaders },
      );
      return res.data.data;
    },
    enabled: isOpen && !!token,
  });

  // Extend deadline mutation
  const extendMutation = useMutation({
    mutationFn: async ({ targetId, newDueDate }: { targetId: string; newDueDate: string }) => {
      const d = new Date(newDueDate);
      if (d <= new Date()) {
        throw new Error('Hạn nộp mới phải nằm ở thời điểm tương lai.');
      }
      const res = await axios.put(
        `/api/v1/admin/assignments/${assignmentId}/extend-deadline`,
        { targetId, newDueDate: d.toISOString() },
        { headers: authHeaders },
      );
      return res.data.data;
    },
    onSuccess: () => {
      setActionSuccess('Gia hạn Deadline thành công!');
      setActionError(null);
      setExtendingTargetId(null);
      refetch();
      queryClient.invalidateQueries({ queryKey: ['adminAssignedList', assignmentId] });
      setTimeout(() => setActionSuccess(null), 2500);
    },
    onError: (err: unknown) => {
      const msg =
        axios.isAxiosError(err) && err.response?.data?.message
          ? err.response.data.message
          : err instanceof Error
            ? err.message
            : 'Lỗi gia hạn Deadline.';
      setActionError(msg);
    },
  });

  if (!isOpen) return null;

  const startExtending = (targetId: string, currentDueDate: string) => {
    setExtendingTargetId(targetId);
    const d = new Date(currentDueDate);
    d.setDate(d.getDate() + 3); // Default extension +3 days
    setNewDueDateInput(d.toISOString().slice(0, 16));
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-3xl w-full shadow-2xl border border-slate-200 my-8 max-h-[90vh] flex flex-col">
        {/* HEADER */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
              <Users size={18} />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-800">
                Danh Sách Phân Công & Trạng Thái Nộp
              </h3>
              <p className="text-xs text-slate-400 truncate max-w-sm" title={assignmentTitle}>
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

        {/* SUMMARY STATS BAR */}
        {data && (
          <div className="grid grid-cols-3 gap-3 my-4 shrink-0">
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-center">
              <span className="text-[11px] text-slate-400 font-bold block">Tổng đã giao</span>
              <span className="text-xl font-black text-slate-700">
                {data.summary.totalAssigned}
              </span>
            </div>
            <div className="bg-emerald-50 p-3 rounded-2xl border border-emerald-100 text-center">
              <span className="text-[11px] text-emerald-600 font-bold block">Đã hoàn thành</span>
              <span className="text-xl font-black text-emerald-700">
                {data.summary.completedCount}
              </span>
            </div>
            <div className="bg-rose-50 p-3 rounded-2xl border border-rose-100 text-center">
              <span className="text-[11px] text-rose-600 font-bold block">Quá hạn nộp</span>
              <span className="text-xl font-black text-rose-700">
                {data.summary.overdueCount}
              </span>
            </div>
          </div>
        )}

        {/* FEEDBACK BANNERS */}
        {actionSuccess && (
          <div className="bg-emerald-50 text-emerald-700 text-xs p-2.5 rounded-xl border border-emerald-200 flex items-center gap-2 mb-3 shrink-0">
            <CheckCircle2 size={15} />
            <span>{actionSuccess}</span>
          </div>
        )}
        {actionError && (
          <div className="bg-rose-50 text-rose-700 text-xs p-2.5 rounded-xl border border-rose-200 flex items-center gap-2 mb-3 shrink-0">
            <AlertCircle size={15} />
            <span>{actionError}</span>
          </div>
        )}

        {/* LIST TABLE */}
        <div className="flex-1 overflow-y-auto space-y-2">
          {isLoading ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              Đang tải danh sách học viên...
            </div>
          ) : !data?.items || data.items.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              Chưa có học viên nào được giao bài tập này.
            </div>
          ) : (
            data.items.map((item) => (
              <div
                key={item.id}
                className="bg-slate-50/80 rounded-2xl p-3.5 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800">
                      {item.student?.fullName || 'Học viên'}
                    </span>
                    <span className="text-slate-400 text-[11px]">
                      ({item.student?.email || 'N/A'})
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-[11px] text-slate-500 flex-wrap">
                    {item.classGroup && (
                      <span className="bg-white border border-slate-200 px-2 py-0.5 rounded-md font-semibold text-slate-700">
                        {item.classGroup.name}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock size={12} className="text-slate-400" />
                      Hạn nộp: {new Date(item.dueDate).toLocaleString('vi-VN')}
                    </span>
                  </div>
                </div>

                {/* STATUS BADGE & ACTION */}
                <div className="flex items-center gap-2 shrink-0">
                  {item.isCompleted ? (
                    <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg font-bold text-[11px] flex items-center gap-1">
                      <CheckCircle2 size={12} /> Đã nộp
                    </span>
                  ) : item.isOverdue ? (
                    <span className="px-2.5 py-1 bg-rose-100 text-rose-800 rounded-lg font-bold text-[11px] flex items-center gap-1">
                      <ShieldAlert size={12} /> Quá hạn
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-lg font-bold text-[11px] flex items-center gap-1">
                      <Clock size={12} /> Đang làm
                    </span>
                  )}

                  <button
                    onClick={() => startExtending(item.id, item.dueDate)}
                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                    title="Gia hạn Deadline"
                  >
                    <Edit2 size={14} />
                  </button>
                </div>

                {/* INLINE EXTEND DEADLINE FORM */}
                {extendingTargetId === item.id && (
                  <div className="w-full sm:col-span-2 pt-3 mt-2 border-t border-slate-200 flex flex-col sm:flex-row items-center gap-2">
                    <span className="text-[11px] font-bold text-blue-700 shrink-0">
                      Chọn hạn mới:
                    </span>
                    <input
                      type="datetime-local"
                      value={newDueDateInput}
                      onChange={(e) => setNewDueDateInput(e.target.value)}
                      className="px-2.5 py-1 text-xs bg-white border border-blue-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium flex-1 w-full"
                    />
                    <div className="flex items-center gap-1.5 self-end sm:self-auto">
                      <button
                        onClick={() =>
                          extendMutation.mutate({
                            targetId: item.id,
                            newDueDate: newDueDateInput,
                          })
                        }
                        disabled={extendMutation.isPending}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition disabled:opacity-50"
                      >
                        {extendMutation.isPending ? 'Lưu...' : 'Gia hạn'}
                      </button>
                      <button
                        onClick={() => setExtendingTargetId(null)}
                        className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-lg transition"
                      >
                        Hủy
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* FOOTER */}
        <div className="flex justify-end pt-4 border-t border-slate-100 shrink-0 mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
