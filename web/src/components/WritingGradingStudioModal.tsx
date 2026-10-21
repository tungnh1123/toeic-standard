import React, { useState, useEffect, useRef, useMemo } from 'react';
import axios from 'axios';
import {
  X,
  Save,
  Send,
  AlertCircle,
  CheckCircle2,
  FileText,
  User,
  GraduationCap,
  Sparkles,
  Trash2,
  PlusCircle,
  Sliders,
  MessageSquare,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export type ErrorType = 'GRAMMAR' | 'VOCABULARY' | 'SPELLING' | 'PUNCTUATION' | 'COHERENCE';

export interface InlineFeedbackItem {
  id: string;
  startOffset: number;
  endOffset: number;
  selectedText: string;
  errorType: ErrorType;
  comment: string;
  suggestion?: string;
}

export interface CriterionScoreItem {
  score: number;
  maxScore: number;
  weight: number;
  comment?: string;
}

export interface SubmissionDetail {
  id: string;
  assignmentId: string;
  assignmentTitle: string;
  assignmentType: string;
  rubric: {
    criteria?: Array<{ key: string; name: string; weight: number; maxScore: number }>;
    maxWords?: number;
    minWords?: number;
    timeLimitMinutes?: number;
  };
  instructions: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  classId: string | null;
  className: string;
  submissionText: string | null;
  audioFileUrl: string | null;
  durationSeconds: number | null;
  status: 'SUBMITTED' | 'GRADING' | 'GRADED' | 'REJECTED';
  submittedAt: string;
}

export interface ReviewDetail {
  id: string;
  totalScore: number;
  criteriaScores: Record<string, CriterionScoreItem>;
  inlineFeedback: InlineFeedbackItem[];
  generalComment?: string | null;
  feedbackAudioUrl?: string | null;
  reviewedAt: string;
}

interface WritingGradingStudioModalProps {
  submissionId: string;
  token: string | null;
  onClose: () => void;
  onGradedSuccess: () => void;
}

const ERROR_TYPE_CONFIG: Record<
  ErrorType,
  { label: string; badgeClass: string; highlightClass: string; borderClass: string }
> = {
  GRAMMAR: {
    label: 'Ngữ Pháp',
    badgeClass: 'bg-rose-100 text-rose-700 border-rose-200',
    highlightClass: 'bg-rose-100 text-rose-900 border-b-2 border-rose-500 cursor-pointer',
    borderClass: 'border-rose-300',
  },
  VOCABULARY: {
    label: 'Từ Vựng',
    badgeClass: 'bg-blue-100 text-blue-700 border-blue-200',
    highlightClass: 'bg-blue-100 text-blue-900 border-b-2 border-blue-500 cursor-pointer',
    borderClass: 'border-blue-300',
  },
  SPELLING: {
    label: 'Chính Tả',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
    highlightClass: 'bg-amber-100 text-amber-900 border-b-2 border-amber-500 cursor-pointer',
    borderClass: 'border-amber-300',
  },
  PUNCTUATION: {
    label: 'Dấu Câu',
    badgeClass: 'bg-purple-100 text-purple-700 border-purple-200',
    highlightClass: 'bg-purple-100 text-purple-900 border-b-2 border-purple-500 cursor-pointer',
    borderClass: 'border-purple-300',
  },
  COHERENCE: {
    label: 'Mạch Lạc',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    highlightClass: 'bg-emerald-100 text-emerald-900 border-b-2 border-emerald-500 cursor-pointer',
    borderClass: 'border-emerald-300',
  },
};

const DEFAULT_CRITERIA: Array<{ key: string; name: string; weight: number; maxScore: number }> = [
  { key: 'TASK_ACHIEVEMENT', name: 'Task Achievement (Đáp ứng yêu cầu)', weight: 25, maxScore: 10 },
  { key: 'COHERENCE_COHESION', name: 'Coherence & Cohesion (Mạch lạc & Liên kết)', weight: 25, maxScore: 10 },
  { key: 'LEXICAL_RESOURCE', name: 'Lexical Resource (Vốn từ vựng)', weight: 25, maxScore: 10 },
  { key: 'GRAMMAR_ACCURACY', name: 'Grammatical Accuracy (Độ chính xác ngữ pháp)', weight: 25, maxScore: 10 },
];

export const WritingGradingStudioModal: React.FC<WritingGradingStudioModalProps> = ({
  submissionId,
  token,
  onClose,
  onGradedSuccess,
}) => {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [submission, setSubmission] = useState<SubmissionDetail | null>(null);

  // Grading form state
  const [criteriaScores, setCriteriaScores] = useState<Record<string, CriterionScoreItem>>({
    TASK_ACHIEVEMENT: { score: 7.0, maxScore: 10, weight: 25, comment: '' },
    COHERENCE_COHESION: { score: 7.0, maxScore: 10, weight: 25, comment: '' },
    LEXICAL_RESOURCE: { score: 7.0, maxScore: 10, weight: 25, comment: '' },
    GRAMMAR_ACCURACY: { score: 7.0, maxScore: 10, weight: 25, comment: '' },
  });
  const [inlineFeedback, setInlineFeedback] = useState<InlineFeedbackItem[]>([]);
  const [generalComment, setGeneralComment] = useState<string>('');

  // Text selection & Annotation creator state
  const essayContainerRef = useRef<HTMLDivElement>(null);
  const [selectedRange, setSelectedRange] = useState<{
    startOffset: number;
    endOffset: number;
    selectedText: string;
  } | null>(null);
  const [annotationErrorType, setAnnotationErrorType] = useState<ErrorType>('GRAMMAR');
  const [annotationComment, setAnnotationComment] = useState('');
  const [annotationSuggestion, setAnnotationSuggestion] = useState('');
  const [activeAnnotationId, setActiveAnnotationId] = useState<string | null>(null);

  // Instructions toggle
  const [showInstructions, setShowInstructions] = useState(true);

  // Load submission detail and draft review
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setErrorMsg(null);
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const res = await axios.get(`/api/v1/admin/submissions/${submissionId}`, { headers });
        const subData: SubmissionDetail = res.data.data.submission;
        const revData: ReviewDetail | null = res.data.data.review;

        setSubmission(subData);
        // RevData populated into form state

        // Populate criteria
        const criteriaList =
          subData.rubric?.criteria && subData.rubric.criteria.length > 0
            ? subData.rubric.criteria
            : DEFAULT_CRITERIA;

        const initialScores: Record<string, CriterionScoreItem> = {};
        criteriaList.forEach((c) => {
          if (revData?.criteriaScores && revData.criteriaScores[c.key]) {
            initialScores[c.key] = revData.criteriaScores[c.key];
          } else {
            initialScores[c.key] = {
              score: 7.0,
              maxScore: c.maxScore || 10,
              weight: c.weight || 25,
              comment: '',
            };
          }
        });
        setCriteriaScores(initialScores);

        if (revData?.inlineFeedback) {
          setInlineFeedback(revData.inlineFeedback);
        }
        if (revData?.generalComment) {
          setGeneralComment(revData.generalComment);
        }
      } catch (err: unknown) {
        const error = err as { response?: { data?: { message?: string } }; message?: string };
        setErrorMsg(
          error.response?.data?.message || error.message || 'Không thể tải chi tiết bài nộp.',
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [submissionId, token]);

  // Compute total score dynamically
  const computedTotalScore = useMemo(() => {
    let total = 0;
    Object.keys(criteriaScores).forEach((key) => {
      const item = criteriaScores[key];
      if (item && item.maxScore > 0) {
        total += (item.score / item.maxScore) * item.weight;
      }
    });
    return Math.round(total * 100) / 100;
  }, [criteriaScores]);

  // Count words in submission
  const wordCount = useMemo(() => {
    if (!submission?.submissionText) return 0;
    return submission.submissionText.trim().split(/\s+/).filter(Boolean).length;
  }, [submission?.submissionText]);

  // Handle Text Selection inside the essay area
  const handleMouseUp = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      return;
    }
    const range = selection.getRangeAt(0);
    const container = essayContainerRef.current;
    if (!container || !container.contains(range.commonAncestorContainer)) {
      return;
    }

    const preRange = range.cloneRange();
    preRange.selectNodeContents(container);
    preRange.setEnd(range.startContainer, range.startOffset);
    const startOffset = preRange.toString().length;
    const selectedText = range.toString().trim();
    if (!selectedText) return;
    const endOffset = startOffset + selectedText.length;

    setSelectedRange({
      startOffset,
      endOffset,
      selectedText,
    });
    setAnnotationComment('');
    setAnnotationSuggestion('');
  };

  // Add Annotation
  const handleAddAnnotation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRange || !annotationComment.trim()) return;

    const newItem: InlineFeedbackItem = {
      id: `err-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      startOffset: selectedRange.startOffset,
      endOffset: selectedRange.endOffset,
      selectedText: selectedRange.selectedText,
      errorType: annotationErrorType,
      comment: annotationComment.trim(),
      suggestion: annotationSuggestion.trim() || undefined,
    };

    setInlineFeedback((prev) => [...prev, newItem]);
    setSelectedRange(null);
    setAnnotationComment('');
    setAnnotationSuggestion('');
    window.getSelection()?.removeAllRanges();
  };

  // Delete Annotation
  const handleDeleteAnnotation = (id: string) => {
    setInlineFeedback((prev) => prev.filter((item) => item.id !== id));
    if (activeAnnotationId === id) {
      setActiveAnnotationId(null);
    }
  };

  // Render Highlighted Text safely
  const renderedEssay = useMemo(() => {
    const raw = submission?.submissionText || '';
    if (!raw) return <span className="italic text-slate-400">Không có văn bản bài làm.</span>;
    if (inlineFeedback.length === 0) return <span>{raw}</span>;

    // Sort feedback items by startOffset
    const sorted = [...inlineFeedback].sort((a, b) => a.startOffset - b.startOffset);
    const elements: React.ReactNode[] = [];
    let lastIndex = 0;

    sorted.forEach((item, idx) => {
      // Non-highlighted text before this annotation
      if (item.startOffset > lastIndex) {
        elements.push(
          <span key={`text-${lastIndex}`}>{raw.substring(lastIndex, item.startOffset)}</span>,
        );
      }

      // Highlighted span
      const cfg = ERROR_TYPE_CONFIG[item.errorType] || ERROR_TYPE_CONFIG.GRAMMAR;
      const isActive = activeAnnotationId === item.id;
      const spanText = raw.substring(item.startOffset, item.endOffset) || item.selectedText;

      elements.push(
        <mark
          key={`annot-${item.id}-${idx}`}
          onClick={() => setActiveAnnotationId(isActive ? null : item.id)}
          className={`px-1 py-0.5 rounded transition ${cfg.highlightClass} ${
            isActive ? 'ring-2 ring-indigo-500 font-bold' : ''
          }`}
          title={`[${cfg.label}] ${item.comment}${item.suggestion ? ` -> Gợi ý: ${item.suggestion}` : ''}`}
        >
          {spanText}
        </mark>,
      );

      lastIndex = Math.max(lastIndex, item.endOffset);
    });

    if (lastIndex < raw.length) {
      elements.push(<span key={`text-end`}>{raw.substring(lastIndex)}</span>);
    }

    return elements;
  }, [submission?.submissionText, inlineFeedback, activeAnnotationId]);

  // Submit Grading (Draft or Publish)
  const handleSubmitGrading = async (isDraft: boolean) => {
    try {
      setSubmitting(true);
      setErrorMsg(null);
      setSuccessMsg(null);

      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const payload = {
        criteriaScores,
        inlineFeedback,
        generalComment,
        isDraft,
      };

      await axios.post(`/api/v1/admin/submissions/${submissionId}/review`, payload, {
        headers,
      });

      if (isDraft) {
        setSuccessMsg('Đã lưu bản nháp thành công! Trạng thái bài nộp: GRADING.');
        if (submission) {
          setSubmission({ ...submission, status: 'GRADING' });
        }
      } else {
        setSuccessMsg('Công bố điểm thành công! Học viên sẽ nhận được thông báo.');
        if (submission) {
          setSubmission({ ...submission, status: 'GRADED' });
        }
        setTimeout(() => {
          onGradedSuccess();
        }, 1200);
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      setErrorMsg(
        error.response?.data?.message || error.message || 'Lỗi khi lưu điểm bài tập.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    if (score >= 70) return 'text-blue-600 bg-blue-50 border-blue-200';
    if (score >= 50) return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-rose-600 bg-rose-50 border-rose-200';
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-[96vw] h-[95vh] flex flex-col overflow-hidden">
        {/* HEADER BAR */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-400">
              <Sparkles size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider bg-teal-500/20 text-teal-300 px-2 py-0.5 rounded-md border border-teal-500/30">
                  Writing Studio • ADM0302
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  Mã: #{submissionId.slice(0, 8)}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-white truncate max-w-xl">
                {submission?.assignmentTitle || 'Studio Chấm Bài Viết Writing'}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-3 text-xs text-slate-300 bg-slate-800/80 px-3.5 py-1.5 rounded-xl border border-slate-700">
              <span className="flex items-center gap-1 font-bold">
                <User size={13} className="text-teal-400" />
                {submission?.studentName}
              </span>
              <span className="text-slate-500">•</span>
              <span className="flex items-center gap-1">
                <GraduationCap size={13} className="text-indigo-400" />
                {submission?.className}
              </span>
              <span className="text-slate-500">•</span>
              <span className="font-bold text-teal-400">{wordCount} từ</span>
            </div>

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* FEEDBACK BARS */}
        {errorMsg && (
          <div className="px-6 py-2.5 bg-rose-50 border-b border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
            <AlertCircle size={15} />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="px-6 py-2.5 bg-emerald-50 border-b border-emerald-200 text-emerald-700 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 size={15} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* MAIN STUDIO SPLIT-SCREEN */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center gap-3 text-slate-500 font-bold text-sm">
            <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
            <span>Đang tải thông tin bài làm và thang điểm Rubric...</span>
          </div>
        ) : (
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
            {/* LEFT COLUMN: ESSAY + HIGHLIGHT ANNOTATION (7 COLS) */}
            <div className="lg:col-span-7 border-r border-slate-200 flex flex-col h-full overflow-hidden bg-slate-50/50">
              {/* TOP TOPIC PROMPT */}
              <div className="p-4 bg-white border-b border-slate-200 shrink-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
                    <FileText size={13} className="text-teal-600" />
                    Đề bài & Yêu cầu làm bài
                  </span>
                  <button
                    onClick={() => setShowInstructions(!showInstructions)}
                    className="text-[11px] font-bold text-teal-600 hover:text-teal-700 flex items-center gap-1"
                  >
                    {showInstructions ? (
                      <>
                        Thu gọn <ChevronUp size={12} />
                      </>
                    ) : (
                      <>
                        Xem đề bài <ChevronDown size={12} />
                      </>
                    )}
                  </button>
                </div>
                {showInstructions && (
                  <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200/80 leading-relaxed font-medium">
                    {submission?.instructions || 'Không có hướng dẫn đề bài.'}
                  </p>
                )}
              </div>

              {/* ESSAY READING & SELECTION WORKSPACE */}
              <div className="flex-1 p-5 overflow-y-auto">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black uppercase text-slate-500 tracking-wide">
                    Bài Làm Của Học Viên (Bôi đen từ ngữ để nhận xét sửa lỗi):
                  </span>
                  <span className="text-[11px] font-bold text-slate-400">
                    {inlineFeedback.length} vị trí đã đánh dấu
                  </span>
                </div>

                <div
                  ref={essayContainerRef}
                  onMouseUp={handleMouseUp}
                  className="bg-white border-2 border-slate-200 rounded-2xl p-5 text-sm sm:text-base text-slate-800 leading-loose shadow-sm whitespace-pre-wrap select-text selection:bg-teal-200 selection:text-teal-900 focus:outline-none min-h-[300px]"
                >
                  {renderedEssay}
                </div>

                {/* ACTIVE ANNOTATION POPOVER CARD IF CLICKED ON A HIGHLIGHT */}
                {activeAnnotationId && (
                  <div className="mt-3 p-3.5 bg-white border-2 border-indigo-200 rounded-2xl shadow-md animate-in slide-in-from-top-1">
                    {(() => {
                      const item = inlineFeedback.find((a) => a.id === activeAnnotationId);
                      if (!item) return null;
                      const cfg = ERROR_TYPE_CONFIG[item.errorType];
                      return (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md border ${cfg.badgeClass}`}
                              >
                                {cfg.label}
                              </span>
                              <span className="font-bold text-xs text-slate-800">
                                "{item.selectedText}"
                              </span>
                            </div>
                            <button
                              onClick={() => handleDeleteAnnotation(item.id)}
                              className="text-rose-500 hover:text-rose-700 text-xs font-bold flex items-center gap-1"
                            >
                              <Trash2 size={13} />
                              Xóa lỗi này
                            </button>
                          </div>
                          <div className="text-xs text-slate-700">
                            <span className="font-bold">Nhận xét:</span> {item.comment}
                          </div>
                          {item.suggestion && (
                            <div className="text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-100 font-medium">
                              <span className="font-bold">Gợi ý sửa lại:</span> {item.suggestion}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* NEW ANNOTATION FORM WHEN TEXT IS SELECTED */}
                {selectedRange && (
                  <form
                    onSubmit={handleAddAnnotation}
                    className="mt-4 p-4 bg-white border-2 border-teal-500 rounded-2xl shadow-xl space-y-3 animate-in zoom-in-95"
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase bg-teal-100 text-teal-800 px-2 py-0.5 rounded-md">
                          Ghi chú sửa lỗi
                        </span>
                        <span className="text-xs font-bold text-slate-800 truncate max-w-xs">
                          "{selectedRange.selectedText}"
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedRange(null)}
                        className="text-slate-400 hover:text-slate-600 text-xs"
                      >
                        Hủy
                      </button>
                    </div>

                    {/* ERROR TYPE BUTTONS */}
                    <div className="flex flex-wrap gap-1.5">
                      {(Object.keys(ERROR_TYPE_CONFIG) as ErrorType[]).map((type) => {
                        const cfg = ERROR_TYPE_CONFIG[type];
                        const isSelected = annotationErrorType === type;
                        return (
                          <button
                            type="button"
                            key={type}
                            onClick={() => setAnnotationErrorType(type)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider transition ${
                              isSelected
                                ? 'bg-slate-900 text-white shadow-sm ring-2 ring-teal-500'
                                : `${cfg.badgeClass} hover:opacity-80`
                            }`}
                          >
                            {cfg.label}
                          </button>
                        );
                      })}
                    </div>

                    {/* COMMENT & SUGGESTION */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">
                          Lý do / Giải thích lỗi:
                        </label>
                        <input
                          type="text"
                          required
                          value={annotationComment}
                          onChange={(e) => setAnnotationComment(e.target.value)}
                          placeholder="Ví dụ: Dùng sai thì quá khứ đơn..."
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-teal-500 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">
                          Gợi ý sửa đổi (Tùy chọn):
                        </label>
                        <input
                          type="text"
                          value={annotationSuggestion}
                          onChange={(e) => setAnnotationSuggestion(e.target.value)}
                          placeholder="Ví dụ: has improved..."
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-teal-500 text-xs"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setSelectedRange(null)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
                      >
                        Đóng
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow flex items-center gap-1.5"
                      >
                        <PlusCircle size={14} />
                        Lưu vị trí sửa lỗi
                      </button>
                    </div>
                  </form>
                )}

                {/* ANNOTATIONS LIST TABLE */}
                {inlineFeedback.length > 0 && (
                  <div className="mt-5 space-y-2">
                    <span className="text-[11px] font-black uppercase text-slate-400 tracking-wider block">
                      Tất cả lỗi đã đánh dấu ({inlineFeedback.length}):
                    </span>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                      {inlineFeedback.map((item, i) => {
                        const cfg = ERROR_TYPE_CONFIG[item.errorType];
                        return (
                          <div
                            key={item.id}
                            className="bg-white border border-slate-200 p-2.5 rounded-xl flex items-center justify-between text-xs hover:border-slate-300 transition"
                          >
                            <div className="flex items-center gap-2.5 truncate max-w-md">
                              <span className="font-bold text-slate-400">#{i + 1}</span>
                              <span
                                className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md border shrink-0 ${cfg.badgeClass}`}
                              >
                                {cfg.label}
                              </span>
                              <span className="font-bold text-slate-800 truncate">
                                "{item.selectedText}"
                              </span>
                              <span className="text-slate-400 truncate">→ {item.comment}</span>
                            </div>
                            <button
                              onClick={() => handleDeleteAnnotation(item.id)}
                              className="text-slate-400 hover:text-rose-600 p-1 rounded-lg"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN: 4-CRITERIA RUBRIC & TOTAL SCORE (5 COLS) */}
            <div className="lg:col-span-5 flex flex-col h-full overflow-hidden bg-white">
              {/* SCORING HEADER WITH TOTAL SCORE BADGE */}
              <div className="p-4 bg-slate-50 border-b border-slate-200 shrink-0">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
                      <Sliders size={13} className="text-indigo-600" />
                      Barem Điểm Rubric (Thang 100)
                    </span>
                    <span className="text-xs text-slate-400 font-medium">
                      Tự động tính toán theo trọng số tiêu chí
                    </span>
                  </div>

                  {/* SCORE DISPLAY */}
                  <div
                    className={`px-4 py-2 rounded-2xl border-2 flex items-center gap-2 ${getScoreColor(
                      computedTotalScore,
                    )}`}
                  >
                    <div>
                      <span className="text-[9px] font-black uppercase tracking-wider block opacity-70">
                        Tổng điểm
                      </span>
                      <span className="text-xl sm:text-2xl font-black">
                        {computedTotalScore.toFixed(1)}
                      </span>
                    </div>
                    <span className="text-xs font-bold opacity-60">/ 100</span>
                  </div>
                </div>
              </div>

              {/* RUBRIC CRITERIA INPUTS */}
              <div className="flex-1 p-5 overflow-y-auto space-y-4">
                {Object.keys(criteriaScores).map((key) => {
                  const item = criteriaScores[key];
                  const criterionDef =
                    submission?.rubric?.criteria?.find((c) => c.key === key) ||
                    DEFAULT_CRITERIA.find((c) => c.key === key) || {
                      key,
                      name: key,
                      weight: item.weight,
                      maxScore: item.maxScore,
                    };

                  return (
                    <div
                      key={key}
                      className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2 hover:border-indigo-200 transition"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-black text-xs text-slate-800">
                            {criterionDef.name}
                          </h4>
                          <span className="text-[10px] font-bold text-slate-400">
                            Trọng số: {item.weight}% (Tối đa {item.maxScore}đ)
                          </span>
                        </div>

                        {/* SCORE INPUT */}
                        <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-xl px-2.5 py-1">
                          <input
                            type="number"
                            min="0"
                            max={item.maxScore}
                            step="0.5"
                            value={item.score}
                            onChange={(e) => {
                              const val = Math.min(
                                item.maxScore,
                                Math.max(0, parseFloat(e.target.value) || 0),
                              );
                              setCriteriaScores((prev) => ({
                                ...prev,
                                [key]: { ...prev[key], score: val },
                              }));
                            }}
                            className="w-12 text-center font-black text-sm text-indigo-700 focus:outline-none"
                          />
                          <span className="text-xs font-bold text-slate-400">/ {item.maxScore}</span>
                        </div>
                      </div>

                      {/* SLIDER FOR EASY SCORING */}
                      <input
                        type="range"
                        min="0"
                        max={item.maxScore}
                        step="0.5"
                        value={item.score}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setCriteriaScores((prev) => ({
                            ...prev,
                            [key]: { ...prev[key], score: val },
                          }));
                        }}
                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                      />

                      {/* CRITERION COMMENT */}
                      <input
                        type="text"
                        placeholder="Nhận xét riêng cho tiêu chí này (tùy chọn)..."
                        value={item.comment || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCriteriaScores((prev) => ({
                            ...prev,
                            [key]: { ...prev[key], comment: val },
                          }));
                        }}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-indigo-400"
                      />
                    </div>
                  );
                })}

                {/* GENERAL COMMENT */}
                <div className="pt-2">
                  <label className="text-xs font-black uppercase text-slate-600 block mb-1 flex items-center gap-1.5">
                    <MessageSquare size={13} className="text-teal-600" />
                    Nhận xét tổng quan của Giảng viên:
                  </label>
                  <textarea
                    rows={4}
                    value={generalComment}
                    onChange={(e) => setGeneralComment(e.target.value)}
                    placeholder="Viết nhận xét tổng thể về bài viết, khen ngợi điểm mạnh và chỉ rõ những phần cần rèn luyện thêm..."
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-teal-500 leading-relaxed"
                  />
                </div>
              </div>

              {/* ACTION FOOTER */}
              <div className="p-4 bg-slate-50 border-t border-slate-200 shrink-0 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl transition"
                >
                  Thoát
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => handleSubmitGrading(true)}
                    className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Save size={14} />
                    <span>Lưu Nháp</span>
                  </button>

                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => handleSubmitGrading(false)}
                    className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-black text-xs rounded-xl shadow-md transition flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Send size={14} />
                    <span>Công Bố Điểm</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
