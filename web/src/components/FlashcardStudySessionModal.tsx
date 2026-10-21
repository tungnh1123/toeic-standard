import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import {
  X,
  Volume2,
  VolumeX,
  Snail,
  Star,
  Sparkles,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  RotateCw,
  Edit3,
  Check,
  Shuffle,
  Layers,
} from 'lucide-react';

export interface StudyCard {
  id: string;
  deckId: string;
  term: string;
  phoneticIpa: string;
  partOfSpeech: string;
  definition: string;
  exampleSentence: string;
  exampleTranslation?: string;
  audioUrl?: string;
  audioSlowUrl?: string;
  imageUrl?: string;
  collocations?: string[];
  synonyms?: string[];
  isBookmarked: boolean;
  personalNote?: string;
  repetitionCount: number;
  intervalDays: number;
}

export interface StudySessionData {
  deckTitle: string;
  totalInSession: number;
  cards: StudyCard[];
}

interface FlashcardStudySessionModalProps {
  deckId: string;
  deckTitle: string;
  token: string | null;
  onClose: () => void;
  onRequireAuth: () => void;
}

export const FlashcardStudySessionModal: React.FC<FlashcardStudySessionModalProps> = ({
  deckId,
  deckTitle,
  token,
  onClose,
  onRequireAuth,
}) => {
  const queryClient = useQueryClient();
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [studyMode, setStudyMode] = useState<'DUE_FIRST' | 'NEW_FIRST' | 'SHUFFLE'>('DUE_FIRST');
  const [onlyBookmarked, setOnlyBookmarked] = useState<boolean>(false);
  const [autoPlayAudio, setAutoPlayAudio] = useState<boolean>(true);
  const [noteInput, setNoteInput] = useState<string>('');
  const [isEditingNote, setIsEditingNote] = useState<boolean>(false);

  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

  // Fetch Study Session cards
  const { data, isLoading } = useQuery<StudySessionData>({
    queryKey: ['study-session', deckId, studyMode, onlyBookmarked, token],
    queryFn: async (): Promise<StudySessionData> => {
      const params = new URLSearchParams({
        deckId,
        limit: '25',
        mode: studyMode,
      });
      if (onlyBookmarked) params.append('onlyBookmarked', 'true');

      const res = await axios.get(`/api/v1/student/flashcards/study-session?${params.toString()}`, {
        headers: authHeaders,
      });
      return res.data.data;
    },
  });

  const cards = data?.cards ?? [];
  const currentCard = cards[currentIndex];

  // Sync personal note input when currentCard changes
  useEffect(() => {
    if (currentCard) {
      setNoteInput(currentCard.personalNote || '');
      setIsEditingNote(false);
      setIsFlipped(false);
    }
  }, [currentIndex, currentCard?.id]);

  // Audio player with SpeechSynthesis fallback
  const playAudio = (speed: number = 1.0) => {
    if (!currentCard) return;
    const url = speed < 1.0 && currentCard.audioSlowUrl ? currentCard.audioSlowUrl : currentCard.audioUrl;

    if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
      const audio = new Audio(url);
      audio.playbackRate = speed;
      audio.play().catch(() => playSpeechSynthesis(currentCard.term, speed));
    } else {
      playSpeechSynthesis(currentCard.term, speed);
    }
  };

  const playSpeechSynthesis = (text: string, rate: number) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = rate;
      window.speechSynthesis.speak(utterance);
    }
  };

  // Autoplay audio on flip or card change
  useEffect(() => {
    if (autoPlayAudio && currentCard && !isFlipped) {
      playAudio(1.0);
    }
  }, [currentIndex, isFlipped]);

  // Bookmark Mutation
  const bookmarkMutation = useMutation({
    mutationFn: async (cardId: string) => {
      if (!token) {
        onRequireAuth();
        return;
      }
      const res = await axios.post(
        `/api/v1/student/flashcards/${cardId}/bookmark`,
        {},
        { headers: authHeaders },
      );
      return res.data.data;
    },
    onSuccess: (result) => {
      if (currentCard && result) {
        currentCard.isBookmarked = result.isBookmarked;
      }
      queryClient.invalidateQueries({ queryKey: ['study-session'] });
    },
  });

  // Note Mutation
  const noteMutation = useMutation({
    mutationFn: async ({ cardId, note }: { cardId: string; note: string }) => {
      if (!token) {
        onRequireAuth();
        return;
      }
      const res = await axios.put(
        `/api/v1/student/flashcards/${cardId}/personal-note`,
        { note },
        { headers: authHeaders },
      );
      return res.data.data;
    },
    onSuccess: () => {
      if (currentCard) {
        currentCard.personalNote = noteInput;
      }
      setIsEditingNote(false);
      queryClient.invalidateQueries({ queryKey: ['study-session'] });
    },
  });

  const handleNext = () => {
    if (currentIndex < cards.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        setIsFlipped((prev) => !prev);
      } else if (e.code === 'ArrowRight') {
        handleNext();
      } else if (e.code === 'ArrowLeft') {
        handlePrev();
      } else if (e.key.toLowerCase() === 'r') {
        playAudio(1.0);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, cards.length, isFlipped, currentCard]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* TOPBAR */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold tracking-wider text-blue-400 uppercase bg-blue-950/70 border border-blue-800/60 px-2.5 py-0.5 rounded-full">
              FNC_STU_03 • 3D Flip Card
            </span>
            <h3 className="font-bold text-base text-slate-100 mt-1">{deckTitle}</h3>
          </div>

          <div className="flex items-center gap-2">
            {/* Mode selection */}
            <div className="flex items-center bg-slate-800/80 rounded-xl p-1 text-xs">
              <button
                onClick={() => {
                  setStudyMode('DUE_FIRST');
                  setCurrentIndex(0);
                }}
                className={`px-2.5 py-1 rounded-lg transition font-medium ${
                  studyMode === 'DUE_FIRST' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
                title="Ưu tiên thẻ đến hạn ôn tập"
              >
                Đến hạn
              </button>
              <button
                onClick={() => {
                  setStudyMode('NEW_FIRST');
                  setCurrentIndex(0);
                }}
                className={`px-2.5 py-1 rounded-lg transition font-medium ${
                  studyMode === 'NEW_FIRST' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
                title="Ưu tiên thẻ mới"
              >
                Mới
              </button>
              <button
                onClick={() => {
                  setStudyMode('SHUFFLE');
                  setCurrentIndex(0);
                }}
                className={`p-1.5 rounded-lg transition ${
                  studyMode === 'SHUFFLE' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
                title="Xáo trộn ngẫu nhiên"
              >
                <Shuffle size={14} />
              </button>
            </div>

            {/* Autoplay Audio Toggle */}
            <button
              onClick={() => setAutoPlayAudio(!autoPlayAudio)}
              className={`p-2 rounded-xl transition border ${
                autoPlayAudio
                  ? 'bg-blue-600/20 text-blue-400 border-blue-500/50'
                  : 'bg-slate-800 text-slate-500 border-slate-700 hover:text-slate-300'
              }`}
              title={autoPlayAudio ? 'Tự động phát âm thanh: BẬT' : 'Tự động phát âm thanh: TẮT'}
            >
              {autoPlayAudio ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>

            {/* Filter bookmarked */}
            <button
              onClick={() => {
                if (!token) {
                  onRequireAuth();
                  return;
                }
                setOnlyBookmarked(!onlyBookmarked);
                setCurrentIndex(0);
              }}
              className={`p-2 rounded-xl transition border ${
                onlyBookmarked
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/50'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
              }`}
              title="Chỉ học từ đã gắn sao"
            >
              <Star size={16} fill={onlyBookmarked ? 'currentColor' : 'none'} />
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* PROGRESS BAR */}
        {cards.length > 0 && (
          <div className="w-full bg-slate-800 h-1">
            <div
              className="bg-blue-500 h-full transition-all duration-300"
              style={{ width: `${((currentIndex + 1) / cards.length) * 100}%` }}
            />
          </div>
        )}

        {/* CONTENT AREA */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center">
          {isLoading ? (
            <div className="py-20 text-slate-400 flex flex-col items-center gap-3">
              <RotateCw className="animate-spin text-blue-500" size={32} />
              <p className="text-sm">Đang tải phiên học từ vựng 3D...</p>
            </div>
          ) : cards.length === 0 ? (
            <div className="text-center py-20 text-slate-400 max-w-sm">
              <Layers size={48} className="mx-auto mb-3 text-slate-600" />
              <p className="text-base font-bold text-slate-200">Không tìm thấy thẻ phù hợp</p>
              <p className="text-xs text-slate-400 mt-1">
                {onlyBookmarked
                  ? 'Bạn chưa đánh dấu sao từ vựng nào trong bộ này.'
                  : 'Bộ thẻ hiện chưa có từ vựng sẵn sàng.'}
              </p>
              {onlyBookmarked && (
                <button
                  onClick={() => setOnlyBookmarked(false)}
                  className="mt-4 text-xs font-bold text-blue-400 hover:underline"
                >
                  Xem toàn bộ thẻ trong bộ
                </button>
              )}
            </div>
          ) : (
            <div className="w-full max-w-md flex flex-col items-center">
              {/* 3D FLIP CONTAINER */}
              <div
                className="w-full h-[400px] cursor-pointer group"
                style={{ perspective: '1200px' }}
                onClick={() => setIsFlipped(!isFlipped)}
              >
                <div
                  className="relative w-full h-full duration-500 transition-transform"
                  style={{
                    transformStyle: 'preserve-3d',
                    transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                  }}
                >
                  {/* FRONT CARD */}
                  <div
                    className="absolute inset-0 w-full h-full rounded-3xl p-6 bg-gradient-to-b from-white to-slate-50 border border-slate-200 shadow-xl flex flex-col justify-between text-slate-900 select-none"
                    style={{ backfaceVisibility: 'hidden' }}
                  >
                    {/* Front Header */}
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-blue-700 bg-blue-100/70 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                        {currentCard.partOfSpeech || 'Từ vựng'}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          bookmarkMutation.mutate(currentCard.id);
                        }}
                        className="p-1.5 rounded-full hover:bg-slate-100 transition"
                        title={currentCard.isBookmarked ? 'Bỏ gắn sao' : 'Gắn sao từ khó'}
                      >
                        <Star
                          size={20}
                          className={
                            currentCard.isBookmarked
                              ? 'text-amber-500 fill-amber-500'
                              : 'text-slate-300 hover:text-slate-400'
                          }
                        />
                      </button>
                    </div>

                    {/* Front Center: Term & IPA */}
                    <div className="text-center my-auto">
                      <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-800 tracking-tight">
                        {currentCard.term}
                      </h2>
                      <p className="text-slate-500 italic text-base mt-1 font-mono">
                        {currentCard.phoneticIpa}
                      </p>

                      {/* Audio buttons */}
                      <div className="flex items-center justify-center gap-2.5 mt-5" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => playAudio(1.0)}
                          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-full shadow-md shadow-blue-500/20 transition active:scale-95"
                        >
                          <Volume2 size={16} />
                          Nghe chuẩn
                        </button>
                        <button
                          onClick={() => playAudio(0.8)}
                          className="flex items-center gap-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold px-3 py-2 rounded-full transition active:scale-95"
                          title="Phát tốc độ chậm 0.8x"
                        >
                          <Snail size={16} />
                          0.8x
                        </button>
                      </div>
                    </div>

                    {/* Front Footer: Collocations */}
                    <div>
                      {currentCard.collocations && currentCard.collocations.length > 0 && (
                        <div className="bg-slate-100/80 rounded-2xl p-2.5 mb-2 border border-slate-200/60">
                          <div className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-600 uppercase mb-0.5">
                            <Sparkles size={12} /> Cụm từ hay gặp:
                          </div>
                          <p className="text-xs text-slate-700 font-medium line-clamp-2">
                            {currentCard.collocations.join(' • ')}
                          </p>
                        </div>
                      )}
                      <p className="text-[11px] text-slate-400 text-center font-medium">
                        Nhấp hoặc nhấn Phím Cách để xem định nghĩa
                      </p>
                    </div>
                  </div>

                  {/* BACK CARD */}
                  <div
                    className="absolute inset-0 w-full h-full rounded-3xl p-6 bg-slate-900 border border-slate-700 shadow-xl flex flex-col justify-between text-white select-none overflow-y-auto"
                    style={{
                      backfaceVisibility: 'hidden',
                      transform: 'rotateY(180deg)',
                    }}
                  >
                    {/* Back Header */}
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                        <BookOpen size={13} /> Định nghĩa & Ngữ cảnh
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          playAudio(1.0);
                        }}
                        className="text-slate-400 hover:text-white p-1"
                        title="Nghe lại"
                      >
                        <Volume2 size={18} />
                      </button>
                    </div>

                    {/* Back Center: Definition & Example */}
                    <div className="my-auto py-2 space-y-3">
                      <div>
                        <p className="text-xs text-slate-400 font-medium mb-1">Ý nghĩa tiếng Việt:</p>
                        <h4 className="text-lg font-bold text-white leading-snug">
                          {currentCard.definition}
                        </h4>
                      </div>

                      <div className="bg-slate-800/80 rounded-2xl p-3 border border-slate-700/60">
                        <p className="text-[11px] font-bold text-emerald-400 mb-1">Ví dụ thực tế:</p>
                        <p className="text-xs text-slate-200 italic leading-relaxed">
                          "{currentCard.exampleSentence}"
                        </p>
                        {currentCard.exampleTranslation && (
                          <p className="text-xs text-slate-400 mt-1 font-sans">
                            👉 {currentCard.exampleTranslation}
                          </p>
                        )}
                      </div>

                      {/* Synonyms */}
                      {currentCard.synonyms && currentCard.synonyms.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap text-xs">
                          <span className="text-slate-500 font-medium">Đồng nghĩa:</span>
                          {currentCard.synonyms.map((s, idx) => (
                            <span
                              key={idx}
                              className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded-md text-[11px]"
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Back Footer */}
                    <p className="text-[11px] text-slate-400 text-center font-medium border-t border-slate-800 pt-2">
                      Nhấp để quay lại mặt trước
                    </p>
                  </div>
                </div>
              </div>

              {/* PERSONAL NOTE DRAWER */}
              <div className="w-full mt-4 bg-slate-800/60 rounded-2xl p-3 border border-slate-700/50">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Edit3 size={13} className="text-blue-400" />
                    Ghi chú cá nhân
                  </span>
                  {!isEditingNote && (
                    <button
                      onClick={() => {
                        if (!token) onRequireAuth();
                        else setIsEditingNote(true);
                      }}
                      className="text-[11px] font-bold text-blue-400 hover:text-blue-300"
                    >
                      {currentCard.personalNote ? 'Sửa' : '+ Thêm ghi chú'}
                    </button>
                  )}
                </div>

                {isEditingNote ? (
                  <div className="space-y-2">
                    <textarea
                      value={noteInput}
                      onChange={(e) => setNoteInput(e.target.value)}
                      placeholder="Viết ngữ cảnh nhớ từ riêng của bạn..."
                      rows={2}
                      className="w-full bg-slate-900 text-xs text-slate-200 border border-slate-700 rounded-xl p-2.5 focus:outline-none focus:border-blue-500 resize-none"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setIsEditingNote(false)}
                        className="text-xs text-slate-400 hover:text-white px-2.5 py-1"
                      >
                        Hủy
                      </button>
                      <button
                        onClick={() => noteMutation.mutate({ cardId: currentCard.id, note: noteInput })}
                        disabled={noteMutation.isPending}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-1 rounded-lg flex items-center gap-1 transition"
                      >
                        <Check size={13} />
                        Lưu
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">
                    {currentCard.personalNote || 'Chưa có ghi chú riêng.'}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* BOTTOMBAR CONTROLS */}
        {cards.length > 0 && (
          <div className="px-6 py-4 bg-slate-950/60 border-t border-slate-800 flex items-center justify-between">
            <button
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className="flex items-center gap-1 text-xs font-bold text-slate-300 hover:text-white disabled:opacity-30 disabled:hover:text-slate-300 px-3 py-2 rounded-xl hover:bg-slate-800 transition"
            >
              <ChevronLeft size={16} /> Thẻ trước
            </button>

            <div className="text-xs font-bold text-slate-400">
              <span className="text-white text-sm">{currentIndex + 1}</span> / {cards.length}
            </div>

            <button
              onClick={handleNext}
              disabled={currentIndex === cards.length - 1}
              className="flex items-center gap-1 text-xs font-bold text-slate-300 hover:text-white disabled:opacity-30 disabled:hover:text-slate-300 px-3 py-2 rounded-xl hover:bg-slate-800 transition"
            >
              Tiếp theo <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
