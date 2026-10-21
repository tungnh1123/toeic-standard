import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import {
  Bookmark,
  Star,
  AlertCircle,
  Plus,
  Trash2,
  Pin,
  X,
  Lightbulb,
} from 'lucide-react';

export interface NotebookItem {
  id: string;
  title: string;
  description: string | null;
  notebookType: 'CUSTOM' | 'STARRED' | 'AUTO_DIFFICULT';
  colorCode: string;
  iconName: string;
  isPinned: boolean;
  totalCards: number;
  createdAt: string;
  updatedAt: string;
}

export interface NotebookCard {
  entryItemId: string;
  flashcardId: string;
  term: string;
  phoneticIpa: string | null;
  partOfSpeech: string | null;
  definition: string;
  exampleSentence: string | null;
  personalMnemonic: string | null;
  customExample: string | null;
  easeFactor: number;
  intervalDays: number;
}

export interface TroubledWord {
  flashcardId: string;
  term: string;
  phoneticIpa: string | null;
  partOfSpeech: string | null;
  definition: string;
  easeFactor: number;
  intervalDays: number;
  repetitionCount: number;
}

interface NotebooksViewProps {
  token: string | null;
  onRequireAuth: () => void;
}

const COLOR_PRESETS = ['#2563EB', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#EC4899'];

export const NotebooksView: React.FC<NotebooksViewProps> = ({
  token,
  onRequireAuth,
}) => {
  const queryClient = useQueryClient();
  const [selectedNotebookId, setSelectedNotebookId] = useState<string | null>(null);
  const [isTroubledWordsOpen, setIsTroubledWordsOpen] = useState<boolean>(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);

  // Form state
  const [titleInput, setTitleInput] = useState<string>('');
  const [descInput, setDescInput] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('#2563EB');

  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

  // 1. Query danh sách sổ tay
  const { data: notebooks = [], isLoading: isNotebooksLoading } = useQuery<NotebookItem[]>({
    queryKey: ['user-notebooks', token],
    queryFn: async (): Promise<NotebookItem[]> => {
      if (!token) return [];
      const res = await axios.get('/api/v1/student/notebooks', { headers: authHeaders });
      return res.data.data;
    },
    enabled: Boolean(token),
  });

  // 2. Query từ khó thông minh (Troubled Words)
  const { data: troubledData } = useQuery<{ total: number; items: TroubledWord[] }>({
    queryKey: ['troubled-words', token],
    queryFn: async () => {
      if (!token) return { total: 0, items: [] };
      const res = await axios.get('/api/v1/student/notebooks/smart/troubled-words', {
        headers: authHeaders,
      });
      return res.data.data;
    },
    enabled: Boolean(token),
  });

  // 3. Query chi tiết sổ tay đang chọn
  const { data: notebookDetail, isLoading: isDetailLoading } = useQuery<{
    notebook: NotebookItem;
    cards: NotebookCard[];
    total: number;
  }>({
    queryKey: ['notebook-cards', selectedNotebookId, token],
    queryFn: async () => {
      if (!token || !selectedNotebookId) return null;
      const res = await axios.get(`/api/v1/student/notebooks/${selectedNotebookId}/cards`, {
        headers: authHeaders,
      });
      return res.data.data;
    },
    enabled: Boolean(token && selectedNotebookId),
  });

  // 4. Mutation Tạo sổ tay mới
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!token) {
        onRequireAuth();
        return;
      }
      const res = await axios.post(
        '/api/v1/student/notebooks',
        {
          title: titleInput,
          description: descInput || undefined,
          colorCode: selectedColor,
          iconName: 'bookmark',
        },
        { headers: authHeaders },
      );
      return res.data.data;
    },
    onSuccess: () => {
      setIsCreateModalOpen(false);
      setTitleInput('');
      setDescInput('');
      queryClient.invalidateQueries({ queryKey: ['user-notebooks'] });
    },
  });

  // 5. Mutation Xóa sổ tay
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await axios.delete(`/api/v1/student/notebooks/${id}`, { headers: authHeaders });
    },
    onSuccess: () => {
      if (selectedNotebookId) setSelectedNotebookId(null);
      queryClient.invalidateQueries({ queryKey: ['user-notebooks'] });
    },
  });

  // 6. Mutation Xóa từ khỏi sổ tay
  const removeCardMutation = useMutation({
    mutationFn: async ({ nbId, cardId }: { nbId: string; cardId: string }) => {
      await axios.delete(`/api/v1/student/notebooks/${nbId}/cards/${cardId}`, {
        headers: authHeaders,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notebook-cards'] });
      queryClient.invalidateQueries({ queryKey: ['user-notebooks'] });
    },
  });

  const starredNotebook = notebooks.find((n) => n.notebookType === 'STARRED');
  const customNotebooks = notebooks.filter((n) => n.notebookType === 'CUSTOM');

  return (
    <div className="space-y-6">
      {/* HEADER SECTION */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full uppercase">
            FNC_STU_05 • Personal Vocabulary Notebooks
          </span>
          <h2 className="text-xl font-extrabold text-slate-800 mt-1">Sổ Tay Từ Vựng & Kho Từ Khó</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Cá nhân hóa ghi chú, mẹo liên tưởng và tự động giải cứu các từ vựng dễ quên.
          </p>
        </div>

        <button
          onClick={() => {
            if (!token) onRequireAuth();
            else setIsCreateModalOpen(true);
          }}
          className="bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs px-4 py-2.5 rounded-2xl shadow-sm transition flex items-center gap-1.5"
        >
          <Plus size={16} />
          Tạo Sổ Tay Mới
        </button>
      </div>

      {/* SYSTEM NOTEBOOKS (STARRED & AUTO DIFFICULT) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 1. STARRED NOTEBOOK */}
        <div
          onClick={() => {
            if (!token) onRequireAuth();
            else if (starredNotebook) {
              setSelectedNotebookId(starredNotebook.id);
              setIsTroubledWordsOpen(false);
            }
          }}
          className={`cursor-pointer rounded-3xl p-5 border transition-all ${
            selectedNotebookId === starredNotebook?.id
              ? 'bg-amber-50/80 border-amber-400 ring-2 ring-amber-200'
              : 'bg-white border-slate-200 hover:border-amber-300 hover:bg-amber-50/20'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                <Star size={24} className="fill-amber-500" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-amber-600 bg-amber-100/70 px-2 py-0.5 rounded-full">
                  Mặc định hệ thống
                </span>
                <h4 className="font-bold text-slate-800 text-base mt-0.5">
                  {starredNotebook?.title || 'Từ vựng Yêu thích (STARRED)'}
                </h4>
              </div>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black text-slate-800">
                {starredNotebook?.totalCards ?? 0}
              </span>
              <p className="text-[10px] text-slate-400">từ đã gắn sao</p>
            </div>
          </div>
        </div>

        {/* 2. AUTO DIFFICULT NOTEBOOK (SM-2 SMART TROUBLED WORDS) */}
        <div
          onClick={() => {
            if (!token) onRequireAuth();
            else {
              setIsTroubledWordsOpen(true);
              setSelectedNotebookId(null);
            }
          }}
          className={`cursor-pointer rounded-3xl p-5 border transition-all ${
            isTroubledWordsOpen
              ? 'bg-rose-50/80 border-rose-400 ring-2 ring-rose-200'
              : 'bg-white border-slate-200 hover:border-rose-300 hover:bg-rose-50/20'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-500">
                <AlertCircle size={24} />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-rose-600 bg-rose-100/70 px-2 py-0.5 rounded-full">
                  Thuật toán SM-2 lọc
                </span>
                <h4 className="font-bold text-slate-800 text-base mt-0.5">Từ Khó Cần Cứu Trợ</h4>
              </div>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black text-rose-600">
                {troubledData?.total ?? 0}
              </span>
              <p className="text-[10px] text-slate-400">từ (EF ≤ 1.70)</p>
            </div>
          </div>
        </div>
      </div>

      {/* CUSTOM NOTEBOOKS GRID */}
      <div>
        <h3 className="text-sm font-extrabold text-slate-700 uppercase tracking-wider mb-3">
          Sổ tay cá nhân tự tạo ({customNotebooks.length})
        </h3>

        {isNotebooksLoading ? (
          <div className="text-center py-12 text-slate-400 text-xs">Đang tải danh sách sổ tay...</div>
        ) : customNotebooks.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 border border-dashed border-slate-200 text-center">
            <Bookmark size={36} className="mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-bold text-slate-600">Chưa có sổ tay tự tạo nào</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Nhấp vào "Tạo Sổ Tay Mới" để gom các từ bẫy theo chủ đề riêng của bạn.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {customNotebooks.map((nb) => {
              const isSelected = selectedNotebookId === nb.id;
              return (
                <div
                  key={nb.id}
                  onClick={() => {
                    setSelectedNotebookId(nb.id);
                    setIsTroubledWordsOpen(false);
                  }}
                  className={`cursor-pointer rounded-2xl p-4 border transition-all relative ${
                    isSelected
                      ? 'bg-blue-50/70 border-blue-400 ring-2 ring-blue-200'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-sm"
                        style={{ backgroundColor: nb.colorCode }}
                      >
                        <Bookmark size={18} />
                      </div>
                      <div>
                        <div className="flex items-center gap-1">
                          <h4 className="font-bold text-slate-800 text-sm line-clamp-1">{nb.title}</h4>
                          {nb.isPinned && <Pin size={12} className="text-blue-600 fill-blue-600" />}
                        </div>
                        <span className="text-[11px] text-slate-400">{nb.totalCards} từ vựng</span>
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Bạn có chắc muốn xóa sổ tay "${nb.title}"?`)) {
                          deleteMutation.mutate(nb.id);
                        }
                      }}
                      className="p-1.5 text-slate-300 hover:text-rose-500 rounded-lg transition"
                      title="Xóa sổ tay"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  {nb.description && (
                    <p className="text-xs text-slate-500 mt-3 line-clamp-2">{nb.description}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SELECTED NOTEBOOK DETAILS / CARDS VIEW */}
      {selectedNotebookId && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Đang xem nội dung</span>
              <h3 className="font-bold text-lg text-slate-800">{notebookDetail?.notebook.title}</h3>
            </div>
            <button
              onClick={() => setSelectedNotebookId(null)}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-xl"
            >
              <X size={18} />
            </button>
          </div>

          {isDetailLoading ? (
            <div className="text-center py-10 text-slate-400 text-xs">Đang tải danh sách từ vựng...</div>
          ) : notebookDetail?.cards.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs">
              Sổ tay này chưa có từ vựng nào. Hãy gắn sao (Star) từ vựng khi đang học thẻ 3D!
            </div>
          ) : (
            <div className="space-y-3">
              {notebookDetail?.cards.map((c) => (
                <div
                  key={c.entryItemId}
                  className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex items-start justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-base text-slate-800">{c.term}</h4>
                      <span className="text-xs text-slate-400 font-mono italic">{c.phoneticIpa}</span>
                      <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full uppercase">
                        {c.partOfSpeech || 'Từ vựng'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600">{c.definition}</p>
                    {c.personalMnemonic && (
                      <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 p-2 rounded-xl mt-1">
                        <Lightbulb size={13} className="shrink-0" />
                        <span>Mẹo nhớ riêng: {c.personalMnemonic}</span>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => removeCardMutation.mutate({ nbId: selectedNotebookId, cardId: c.flashcardId })}
                    className="p-1.5 text-slate-300 hover:text-rose-500 rounded-lg transition"
                    title="Xóa từ khỏi sổ tay này"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TROUBLED WORDS DRAWER */}
      {isTroubledWordsOpen && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
            <div>
              <span className="text-[10px] font-bold text-rose-500 uppercase">Cảnh báo trí nhớ</span>
              <h3 className="font-bold text-lg text-slate-800">
                Danh sách {troubledData?.total ?? 0} từ khó cần cứu trợ (EF ≤ 1.70)
              </h3>
            </div>
            <button
              onClick={() => setIsTroubledWordsOpen(false)}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-xl"
            >
              <X size={18} />
            </button>
          </div>

          {troubledData?.items.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs">
              🎉 Tuyệt vời! Hiện tại bạn không có từ vựng nào nằm trong vùng nguy hiểm bị quên.
            </div>
          ) : (
            <div className="space-y-3">
              {troubledData?.items.map((w) => (
                <div
                  key={w.flashcardId}
                  className="bg-rose-50/40 rounded-2xl p-4 border border-rose-100 flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-base text-slate-800">{w.term}</h4>
                      <span className="text-xs text-slate-400 font-mono italic">{w.phoneticIpa}</span>
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">{w.definition}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-rose-600 bg-rose-100 px-2.5 py-1 rounded-full">
                      Hệ số EF: {w.easeFactor}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CREATE NOTEBOOK MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-base text-slate-800">Tạo Sổ Tay Từ Vựng Mới</h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Tên sổ tay *</label>
                <input
                  type="text"
                  placeholder="VD: Bẫy TOEIC Part 7..."
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Mô tả (tùy chọn)</label>
                <textarea
                  placeholder="Ghi chú mục đích của sổ tay..."
                  value={descInput}
                  onChange={(e) => setDescInput(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Màu sắc nhận diện</label>
                <div className="flex gap-2">
                  {COLOR_PRESETS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setSelectedColor(c)}
                      className={`w-8 h-8 rounded-full transition-all ${
                        selectedColor === c ? 'ring-2 ring-offset-2 ring-slate-800 scale-110' : 'opacity-80 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={() => createMutation.mutate()}
                  disabled={!titleInput.trim() || createMutation.isPending}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs py-2.5 rounded-xl transition shadow-sm"
                >
                  {createMutation.isPending ? 'Đang tạo...' : 'Tạo sổ tay'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
