import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { Audio } from 'expo-av';
import { Volume2, Snail, Star, Sparkles, BookOpen } from 'lucide-react-native';

export interface FlashcardData {
  id: string;
  term: string;
  phoneticIpa: string;
  partOfSpeech: string;
  definition: string;
  exampleSentence: string;
  exampleTranslation?: string;
  audioUrl?: string;
  audioSlowUrl?: string;
  collocations?: string[];
  synonyms?: string[];
  isBookmarked: boolean;
}

export interface Flashcard3DInteractiveProps {
  card: FlashcardData;
  autoPlayAudio?: boolean;
  onBookmarkToggle?: (cardId: string) => void;
  onSwipeResult?: (isKnown: boolean) => void;
}

export const Flashcard3DInteractive: React.FC<Flashcard3DInteractiveProps> = ({
  card,
  autoPlayAudio = true,
  onBookmarkToggle,
  onSwipeResult,
}) => {
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [isBookmarked, setIsBookmarked] = useState<boolean>(card.isBookmarked);

  // Reanimated Shared Values
  const rotateY = useSharedValue<number>(0);
  const translateX = useSharedValue<number>(0);

  // Phát âm thanh
  const playAudio = async (speed: number = 1.0): Promise<void> => {
    try {
      const url = speed < 1.0 && card.audioSlowUrl ? card.audioSlowUrl : card.audioUrl;
      if (!url) return;

      const { sound } = await Audio.Sound.createAsync(
        { uri: url },
        { shouldPlay: true, rate: speed, shouldCorrectPitch: true },
      );
      await sound.playAsync();
    } catch (e: unknown) {
      console.warn('Lỗi phát audio:', e);
    }
  };

  const handleFlip = (): void => {
    const nextFlipped = !isFlipped;
    rotateY.value = withSpring(nextFlipped ? 180 : 0, {
      damping: 14,
      stiffness: 100,
    });
    setIsFlipped(nextFlipped);

    if (!nextFlipped && autoPlayAudio) {
      void playAudio(1.0);
    }
  };

  // Cử chỉ chạm 1 lần để lật thẻ
  const singleTap = Gesture.Tap().onEnd(() => {
    runOnJS(handleFlip)();
  });

  // Cử chỉ chạm 2 lần để nghe lại audio
  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      runOnJS(() => {
        void playAudio(1.0);
      })();
    });

  // Cử chỉ vuốt thẻ sang trái / phải
  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      translateX.value = e.translationX;
    })
    .onEnd((e) => {
      if (e.translationX > 120) {
        // Vuốt sang phải -> Đã thuộc
        if (onSwipeResult) runOnJS(onSwipeResult)(true);
      } else if (e.translationX < -120) {
        // Vuốt sang trái -> Chưa thuộc / Quên
        if (onSwipeResult) runOnJS(onSwipeResult)(false);
      }
      translateX.value = withSpring(0);
    });

  const composedGesture = Gesture.Exclusive(doubleTap, singleTap, panGesture);

  // Styles động mặt trước
  const frontAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { perspective: 1200 },
        { rotateY: `${rotateY.value}deg` },
        { translateX: translateX.value },
      ],
      backfaceVisibility: 'hidden',
    };
  });

  // Styles động mặt sau
  const backAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { perspective: 1200 },
        { rotateY: `${rotateY.value + 180}deg` },
        { translateX: translateX.value },
      ],
      backfaceVisibility: 'hidden',
    };
  });

  return (
    <View style={styles.container}>
      <GestureDetector gesture={composedGesture}>
        <View style={styles.cardWrapper}>
          {/* ==================== MẶT TRƯỚC ==================== */}
          <Animated.View style={[styles.cardCommon, styles.frontCard, frontAnimatedStyle]}>
            {/* Top Toolbar */}
            <View style={styles.topToolbar}>
              <View style={styles.badgeGroup}>
                <Text style={styles.posBadge}>{card.partOfSpeech || 'Từ vựng'}</Text>
              </View>
              <Pressable
                onPress={() => {
                  const nextBookmarked = !isBookmarked;
                  setIsBookmarked(nextBookmarked);
                  if (onBookmarkToggle) onBookmarkToggle(card.id);
                }}
                hitSlop={8}
              >
                <Star
                  size={22}
                  color={isBookmarked ? '#f59e0b' : '#94a3b8'}
                  fill={isBookmarked ? '#f59e0b' : 'transparent'}
                />
              </Pressable>
            </View>

            {/* Main Term & IPA */}
            <View style={styles.centerContent}>
              <Text style={styles.termText}>{card.term}</Text>
              <Text style={styles.ipaText}>{card.phoneticIpa}</Text>

              {/* Audio Controls */}
              <View style={styles.audioRow}>
                <Pressable onPress={() => void playAudio(1.0)} style={styles.audioBtnMain}>
                  <Volume2 size={20} color="#ffffff" />
                  <Text style={styles.audioBtnText}>Nghe chuẩn</Text>
                </Pressable>
                <Pressable onPress={() => void playAudio(0.8)} style={styles.audioBtnSlow}>
                  <Snail size={18} color="#2563eb" />
                  <Text style={styles.audioSlowText}>0.8x</Text>
                </Pressable>
              </View>
            </View>

            {/* Bottom Collocations */}
            {card.collocations && card.collocations.length > 0 && (
              <View style={styles.collocationBox}>
                <View style={styles.collocHeader}>
                  <Sparkles size={14} color="#6366f1" />
                  <Text style={styles.collocTitle}>Cụm từ hay gặp:</Text>
                </View>
                <Text style={styles.collocText} numberOfLines={2}>
                  {card.collocations.join(' • ')}
                </Text>
              </View>
            )}

            <Text style={styles.flipHintText}>Chạm để xem định nghĩa & ngữ cảnh</Text>
          </Animated.View>

          {/* ==================== MẶT SAU ==================== */}
          <Animated.View style={[styles.cardCommon, styles.backCard, backAnimatedStyle]}>
            {/* Top Back Toolbar */}
            <View style={styles.topToolbar}>
              <Text style={styles.backTitleTag}>Định nghĩa & Ví dụ</Text>
              <Pressable onPress={() => void playAudio(1.0)} hitSlop={8}>
                <Volume2 size={20} color="#38bdf8" />
              </Pressable>
            </View>

            {/* Definition */}
            <View style={styles.definitionBox}>
              <Text style={styles.definitionText}>{card.definition}</Text>
            </View>

            {/* Contextual Example with Highlight */}
            <View style={styles.contextBox}>
              <View style={styles.contextHeader}>
                <BookOpen size={14} color="#10b981" />
                <Text style={styles.contextLabel}>Ngữ cảnh thực tế:</Text>
              </View>
              <Text style={styles.exampleSentenceText}>
                "{card.exampleSentence}"
              </Text>
              {card.exampleTranslation && (
                <Text style={styles.exampleTranslationText}>
                  👉 {card.exampleTranslation}
                </Text>
              )}
            </View>

            {/* Synonyms */}
            {card.synonyms && card.synonyms.length > 0 && (
              <View style={styles.synonymsRow}>
                <Text style={styles.synonymLabel}>Đồng nghĩa: </Text>
                <Text style={styles.synonymText}>{card.synonyms.join(', ')}</Text>
              </View>
            )}

            <Text style={styles.flipHintText}>Chạm để quay lại mặt trước</Text>
          </Animated.View>
        </View>
      </GestureDetector>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardWrapper: {
    width: 320,
    height: 440,
    position: 'relative',
  },
  cardCommon: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 28,
    padding: 24,
    justifyContent: 'space-between',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 8,
  },
  frontCard: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderWidth: 1.5,
  },
  backCard: {
    backgroundColor: '#0f172a',
  },
  topToolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badgeGroup: {
    flexDirection: 'row',
  },
  posBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563eb',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    textTransform: 'uppercase',
  },
  centerContent: {
    alignItems: 'center',
    marginVertical: 10,
  },
  termText: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1e293b',
    textAlign: 'center',
  },
  ipaText: {
    fontSize: 16,
    color: '#64748b',
    fontStyle: 'italic',
    marginTop: 4,
  },
  audioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 20,
  },
  audioBtnMain: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    gap: 6,
  },
  audioBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  audioBtnSlow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    gap: 4,
  },
  audioSlowText: {
    color: '#2563eb',
    fontSize: 12,
    fontWeight: '700',
  },
  collocationBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  collocHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  collocTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4f46e5',
  },
  collocText: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 18,
  },
  flipHintText: {
    fontSize: 11,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 8,
  },
  backTitleTag: {
    fontSize: 12,
    fontWeight: '700',
    color: '#38bdf8',
    textTransform: 'uppercase',
  },
  definitionBox: {
    marginVertical: 10,
  },
  definitionText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#f8fafc',
    lineHeight: 28,
    textAlign: 'center',
  },
  contextBox: {
    backgroundColor: '#1e293b',
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#334155',
  },
  contextHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 6,
  },
  contextLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#34d399',
  },
  exampleSentenceText: {
    fontSize: 13,
    color: '#e2e8f0',
    fontStyle: 'italic',
    lineHeight: 20,
  },
  exampleTranslationText: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 6,
    lineHeight: 18,
  },
  synonymsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  synonymLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
  },
  synonymText: {
    fontSize: 11,
    color: '#cbd5e1',
  },
});
