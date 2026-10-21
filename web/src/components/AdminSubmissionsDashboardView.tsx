import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import {
  ClipboardCheck,
  Search,
  Clock,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Play,
  Pause,
  Volume2,
  User,
  GraduationCap,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  PenTool,
} from 'lucide-react';
import { WritingGradingStudioModal } from './WritingGradingStudioModal';

interface SubmissionItem {
  id: string;
  assignmentId: string;
  assignmentTitle: string;
  assignmentType: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  classId: string | null;
  className: string;
  status: 'SUBMITTED' | 'GRADING' | 'GRADED' | 'REJECTED';
  submissionText: string | null;
  audioFileUrl: string | null;
  durationSeconds: number | null;
  isOverdue48h: boolean;
  submittedAt: string;
}

interface SubmissionsResponse {
  items: SubmissionItem[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface ClassOption {
  id: string;
  code: string;
  name: string;
}

interface AdminSubmissionsDashboardViewProps {
  token: string | null;
  userRole?: string;
}

export const AdminSubmissionsDashboardView: React.FC<AdminSubmissionsDashboardViewProps> = ({
  token,
  userRole,
}) => {
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [onlyOverdue48h, setOnlyOverdue48h] = useState(false);
  const [page, setPage] = useState(1);

  // Audio preview state
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  // Detail preview modal state
  const [selectedSubmission, setSelectedSubmission] = useState<SubmissionItem | null>(null);

  // Writing Grading Studio Modal state
  const [gradingWritingSubmissionId, setGradingWritingSubmissionId] = useState<string | null>(null);

  const queryClient = useQueryClient();
  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

  // 1. Fetch Classes for filter dropdown
  const { data: classesData } = useQuery<ClassOption[]>({
    queryKey: ['adminClassesForFilter', token],
    queryFn: async () => {
      const res = await axios.get('/api/v1/admin/classes', { headers: authHeaders });
      return res.data.data;
    },
    enabled: !!token && (userRole === 'ADMIN' || userRole === 'TEACHER'),
  });

  // 2. Fetch Submissions with active filters
  const { data, isLoading } = useQuery<SubmissionsResponse>({
    queryKey: [
      'adminSubmissions',
      searchKeyword,
      selectedClassId,
      selectedType,
      selectedStatus,
      page,
      token,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchKeyword.trim()) params.append('search', searchKeyword.trim());
      if (selectedClassId) params.append('classId', selectedClassId);
      if (selectedType) params.append('type', selectedType);
      if (selectedStatus) params.append('status', selectedStatus);
      params.append('page', page.toString());
      params.append('limit', '10');

      const res = await axios.get(`/api/v1/admin/submissions?${params.toString()}`, {
        headers: authHeaders,
      });
      return res.data.data;
    },
    enabled: !!token && (userRole === 'ADMIN' || userRole === 'TEACHER'),
  });

  // Filter client-side for onlyOverdue48h if toggled
  const displayedItems = (data?.items || []).filter((item) => {
    if (onlyOverdue48h) return item.isOverdue48h;
    return true;
  });

  const togglePlayAudio = (id: string, url: string) => {
    if (playingAudioId === id) {
      audioRef.current?.pause();
      setPlayingAudioId(null);
    } else {
      setPlayingAudioId(id);
      if (audioRef.current) {
        audioRef.current.src = url.startsWith('http')
          ? url
          : `https://toeic-speaking-media.s3.ap-southeast-1.amazonaws.com/${url}`;
        audioRef.current.play().catch(() => {
          console.warn('Audio play simulated or media blocked.');
        });
      }
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUBMITTED':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
            <Clock size={11} /> Chờ chấm
          </span>
        );
      case 'GRADING':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
            <Clock size={11} /> Đang chấm
          </span>
        );
      case 'GRADED':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
            <CheckCircle2 size={11} /> Đã chấm
          </span>
        );
      case 'REJECTED':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
            <AlertCircle size={11} /> Nộp lại
          </span>
        );
      default:
        return null;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'SPEAKING':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-indigo-100 text-indigo-700">
            🎙️ SPEAKING
          </span>
        );
      case 'WRITING':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-rose-100 text-rose-700">
            ✍️ WRITING
          </span>
        );
      case 'QUIZ':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-emerald-100 text-emerald-700">
            📝 QUIZ
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Hidden audio element for preview */}
      <audio
        ref={audioRef}
        onEnded={() => setPlayingAudioId(null)}
        className="hidden"
      />

      {/* TOP HEADER */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 shadow-sm">
            <ClipboardCheck size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-slate-800">
                Quản Lý & Lọc Bài Nộp Của Học Viên
              </h2>
              <span className="text-[10px] font-extrabold uppercase bg-teal-100 text-teal-800 px-2 py-0.5 rounded-full">
                Dashboard ADM0301
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Theo dõi tiến độ nộp bài, cảnh báo quá hạn chấm điểm 48h và kết nối Studio chấm bài
            </p>
          </div>
        </div>

        {/* OVERDUE 48H QUICK TOGGLE */}
        <button
          onClick={() => setOnlyOverdue48h(!onlyOverdue48h)}
          className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer border ${
            onlyOverdue48h
              ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
              : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
          }`}
        >
          <AlertTriangle size={15} />
          {onlyOverdue48h ? 'Đang lọc: Quá Hạn 48h' : 'Chỉ xem Quá Hạn 48h (SLA)'}
        </button>
      </div>

      {/* ADVANCED FILTER TOOLBAR */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* SEARCH */}
        <div className="relative">
          <Search size={15} className="absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo học viên, tiêu đề đề..."
            value={searchKeyword}
            onChange={(e) => {
              setSearchKeyword(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium"
          />
        </div>

        {/* CLASS SELECTOR */}
        <div className="relative">
          <select
            value={selectedClassId}
            onChange={(e) => {
              setSelectedClassId(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium text-slate-700"
          >
            <option value="">Tất cả Lớp học</option>
            {classesData?.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.name} ({cls.code})
              </option>
            ))}
          </select>
        </div>

        {/* TYPE SELECTOR */}
        <div className="relative">
          <select
            value={selectedType}
            onChange={(e) => {
              setSelectedType(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium text-slate-700"
          >
            <option value="">Tất cả Loại bài tập</option>
            <option value="WRITING">✍️ TOEIC Writing</option>
            <option value="SPEAKING">🎙️ TOEIC Speaking</option>
            <option value="QUIZ">📝 Quiz trắc nghiệm</option>
          </select>
        </div>

        {/* STATUS SELECTOR */}
        <div className="relative">
          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium text-slate-700"
          >
            <option value="">Tất cả Trạng thái</option>
            <option value="SUBMITTED">Chờ chấm (SUBMITTED)</option>
            <option value="GRADING">Đang chấm (GRADING)</option>
            <option value="GRADED">Đã chấm xong (GRADED)</option>
            <option value="REJECTED">Yêu cầu nộp lại (REJECTED)</option>
          </select>
        </div>
      </div>

      {/* SUBMISSIONS LIST */}
      {isLoading ? (
        <div className="text-center py-20 text-slate-400 text-sm">
          Đang tải danh sách bài nộp của học viên...
        </div>
      ) : displayedItems.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm">
          <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <ClipboardCheck size={28} />
          </div>
          <h3 className="text-base font-bold text-slate-700 mb-1">
            Không tìm thấy bài nộp nào
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Không có bài nộp nào thỏa mãn bộ lọc hiện tại. Thử xóa bớt các điều kiện lọc để xem thêm.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayedItems.map((sub) => (
            <div
              key={sub.id}
              className={`bg-white rounded-2xl p-5 border transition shadow-sm hover:shadow-md ${
                sub.isOverdue48h
                  ? 'border-rose-300 ring-1 ring-rose-200/60'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* LEFT INFO */}
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {getTypeBadge(sub.assignmentType)}
                    <h3 className="text-sm font-extrabold text-slate-800">
                      {sub.assignmentTitle}
                    </h3>
                    {sub.isOverdue48h && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-600 text-white flex items-center gap-1 shadow-sm animate-pulse">
                        <AlertTriangle size={11} /> Cảnh báo Quá hạn 48h
                      </span>
                    )}
                  </div>

                  {/* STUDENT & CLASS INFO */}
                  <div className="flex items-center gap-4 text-xs text-slate-600 flex-wrap">
                    <span className="flex items-center gap-1.5 font-bold text-slate-800">
                      <User size={13} className="text-slate-400" />
                      {sub.studentName}
                      <span className="font-normal text-slate-400 text-[11px]">
                        ({sub.studentEmail})
                      </span>
                    </span>

                    <span className="flex items-center gap-1 text-slate-500">
                      <GraduationCap size={13} className="text-teal-600" />
                      {sub.className}
                    </span>

                    <span className="flex items-center gap-1 text-slate-400 text-[11px]">
                      <Clock size={12} />
                      Nộp lúc: {new Date(sub.submittedAt).toLocaleString('vi-VN')}
                    </span>
                  </div>

                  {/* SUBMISSION CONTENT SNIPPET */}
                  {sub.submissionText && (
                    <p className="text-xs text-slate-600 bg-slate-50 border border-slate-100 rounded-xl p-2.5 line-clamp-2 italic leading-relaxed">
                      "{sub.submissionText}"
                    </p>
                  )}

                  {sub.audioFileUrl && (
                    <div className="flex items-center gap-2 bg-indigo-50/70 border border-indigo-100 px-3 py-1.5 rounded-xl w-fit">
                      <Volume2 size={14} className="text-indigo-600" />
                      <span className="text-[11px] font-medium text-indigo-900">
                        Bài thu âm Speaking ({sub.durationSeconds ? `${sub.durationSeconds}s` : 'Audio'})
                      </span>
                      <button
                        onClick={() => togglePlayAudio(sub.id, sub.audioFileUrl || '')}
                        className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700 transition"
                      >
                        {playingAudioId === sub.id ? (
                          <Pause size={11} />
                        ) : (
                          <Play size={11} className="ml-0.5" />
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {/* RIGHT ACTIONS & STATUS */}
                <div className="flex sm:flex-col items-end justify-between sm:justify-center gap-2.5 shrink-0 self-start sm:self-center">
                  <div>{getStatusBadge(sub.status)}</div>

                  {sub.assignmentType === 'WRITING' ? (
                    <button
                      onClick={() => setGradingWritingSubmissionId(sub.id)}
                      className="px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white font-black text-xs rounded-xl shadow-sm transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <PenTool size={13} />
                      <span>Chấm Bài Writing</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => setSelectedSubmission(sub)}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>Xem Bài Nộp</span>
                      <ExternalLink size={13} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* PAGINATION */}
          {data?.meta && data.meta.totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 pt-4">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40 flex items-center gap-1"
              >
                <ChevronLeft size={14} /> Trước
              </button>
              <span className="text-xs font-bold text-slate-500 px-2">
                Trang {data.meta.page} / {data.meta.totalPages} ({data.meta.total} bài nộp)
              </span>
              <button
                disabled={page >= data.meta.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40 flex items-center gap-1"
              >
                Sau <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* DETAIL MODAL */}
      {selectedSubmission && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl border border-slate-200 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-black uppercase text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md">
                  Chi tiết bài nộp #{selectedSubmission.id.slice(0, 8)}
                </span>
                <h3 className="font-black text-base text-slate-800 mt-1">
                  {selectedSubmission.assignmentTitle}
                </h3>
              </div>
              <button
                onClick={() => setSelectedSubmission(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-xl"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 pt-4 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                <div>
                  <span className="text-slate-400 block text-[11px]">Học viên:</span>
                  <span className="font-bold text-slate-800">{selectedSubmission.studentName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Lớp học:</span>
                  <span className="font-bold text-slate-800">{selectedSubmission.className}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Thời điểm nộp:</span>
                  <span className="font-bold text-slate-700">
                    {new Date(selectedSubmission.submittedAt).toLocaleString('vi-VN')}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Trạng thái:</span>
                  {getStatusBadge(selectedSubmission.status)}
                </div>
              </div>

              {selectedSubmission.submissionText && (
                <div>
                  <span className="font-bold text-slate-700 block mb-1">
                    Bài làm tự luận Writing:
                  </span>
                  <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-slate-800 leading-relaxed max-h-60 overflow-y-auto whitespace-pre-wrap">
                    {selectedSubmission.submissionText}
                  </div>
                </div>
              )}

              {selectedSubmission.audioFileUrl && (
                <div>
                  <span className="font-bold text-slate-700 block mb-1">
                    Audio bài làm Speaking:
                  </span>
                  <div className="bg-indigo-50/70 border border-indigo-100 p-3.5 rounded-xl flex items-center justify-between">
                    <span className="font-mono text-[11px] text-indigo-900 truncate max-w-xs">
                      {selectedSubmission.audioFileUrl}
                    </span>
                    <button
                      onClick={() =>
                        togglePlayAudio(
                          selectedSubmission.id,
                          selectedSubmission.audioFileUrl || '',
                        )
                      }
                      className="px-3 py-1 bg-indigo-600 text-white rounded-lg font-bold flex items-center gap-1 hover:bg-indigo-700"
                    >
                      {playingAudioId === selectedSubmission.id ? 'Dừng' : 'Nghe audio'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 mt-5">
              {selectedSubmission.assignmentType === 'WRITING' && (
                <button
                  onClick={() => {
                    const id = selectedSubmission.id;
                    setSelectedSubmission(null);
                    setGradingWritingSubmissionId(id);
                  }}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-black text-xs rounded-xl flex items-center gap-1.5"
                >
                  <PenTool size={13} />
                  <span>Mở Writing Studio</span>
                </button>
              )}
              <button
                onClick={() => setSelectedSubmission(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WRITING GRADING STUDIO MODAL */}
      {gradingWritingSubmissionId && (
        <WritingGradingStudioModal
          submissionId={gradingWritingSubmissionId}
          token={token}
          onClose={() => setGradingWritingSubmissionId(null)}
          onGradedSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['adminSubmissions'] });
            setGradingWritingSubmissionId(null);
          }}
        />
      )}
    </div>
  );
};
