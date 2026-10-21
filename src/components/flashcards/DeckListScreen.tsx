import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Search, Flame, Star, BookOpen, ChevronRight } from 'lucide-react-native';
import { useDecksCatalog, useToggleFavoriteDeck } from '../../hooks/useDecksCatalog';
import { DeckCatalogItemDto } from '../../modules/flashcards/dto/deck-catalog-response.dto';

const CEFR_TABS: string[] = ['ALL', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

export interface DeckListScreenProps {
  onSelectDeck?: (deckId: string) => void;
}

export const DeckListScreen: React.FC<DeckListScreenProps> = ({ onSelectDeck }) => {
  const [selectedLevel, setSelectedLevel] = useState<string>('ALL');
  const [searchKeyword, setSearchKeyword] = useState<string>('');

  const { data, isLoading, refetch, isRefetching } = useDecksCatalog({
    level: selectedLevel,
    keyword: searchKeyword,
    page: 1,
    limit: 30,
  });

  const toggleFavoriteMutation = useToggleFavoriteDeck();

  const handleToggleFavorite = (deckId: string): void => {
    toggleFavoriteMutation.mutate(deckId);
  };

  const renderDeckCard = ({ item }: { item: DeckCatalogItemDto }): React.ReactElement => {
    return (
      <Pressable
        onPress={() => onSelectDeck?.(item.id)}
        className="bg-white mx-4 mb-3.5 p-4 rounded-2xl border border-slate-200 shadow-sm active:bg-slate-50"
      >
        <View className="flex-row justify-between items-start">
          <View className="flex-1 mr-2">
            <View className="flex-row items-center gap-2 mb-1">
              <Text className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full uppercase">
                Level {item.level}
              </Text>
              <Text className="text-[10px] font-medium text-slate-500 uppercase">
                {item.topicCode}
              </Text>
            </View>
            <Text className="text-base font-bold text-slate-800">{item.title}</Text>
            {item.description ? (
              <Text className="text-xs text-slate-500 line-clamp-1 mt-0.5" numberOfLines={1}>
                {item.description}
              </Text>
            ) : null}
          </View>

          {/* Nút Bookmark Yêu thích */}
          <Pressable
            onPress={() => handleToggleFavorite(item.id)}
            hitSlop={8}
            className="p-1"
          >
            <Star
              size={20}
              color={item.isFavorite ? '#f59e0b' : '#cbd5e1'}
              fill={item.isFavorite ? '#f59e0b' : 'transparent'}
            />
          </Pressable>
        </View>

        {/* Thanh tiến độ học tập */}
        <View className="mt-3">
          <View className="flex-row justify-between items-center mb-1">
            <Text className="text-[11px] text-slate-400 font-medium">
              Đã thành thạo {item.masteredCardsCount}/{item.totalCards} từ
            </Text>
            <Text className="text-[11px] font-bold text-slate-700">{item.masteryPercentage}%</Text>
          </View>
          <View className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <View
              style={{ width: `${item.masteryPercentage}%` }}
              className="bg-emerald-500 h-full rounded-full"
            />
          </View>
        </View>

        {/* Thống kê từ đến hạn ôn tập hôm nay */}
        <View className="flex-row justify-between items-center mt-3 pt-3 border-t border-slate-100">
          {item.dueTodayCount > 0 ? (
            <View className="flex-row items-center bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200">
              <Flame size={12} color="#e11d48" />
              <Text className="text-[11px] font-bold text-rose-700 ml-1">
                Cần ôn: {item.dueTodayCount} từ hôm nay
              </Text>
            </View>
          ) : (
            <Text className="text-[11px] text-emerald-600 font-medium">✓ Đã hoàn thành hôm nay</Text>
          )}

          <View className="flex-row items-center">
            <Text className="text-xs font-bold text-blue-600 mr-0.5">Vào học</Text>
            <ChevronRight size={14} color="#2563eb" />
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <View className="flex-1 bg-slate-50">
      {/* 1. KHU VỰC TÌM KIẾM */}
      <View className="bg-white px-4 pt-3 pb-2 border-b border-slate-200">
        <View className="flex-row items-center bg-slate-100 rounded-xl px-3 py-2">
          <Search size={18} color="#94a3b8" />
          <TextInput
            placeholder="Tìm theo tên bộ thẻ, chủ đề từ vựng..."
            value={searchKeyword}
            onChangeText={setSearchKeyword}
            className="flex-1 ml-2 text-sm text-slate-800"
            placeholderTextColor="#94a3b8"
          />
        </View>

        {/* 2. THANH LỌC CẤP ĐỘ CEFR TABS */}
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={CEFR_TABS}
          keyExtractor={(item: string) => item}
          className="mt-3 py-1"
          renderItem={({ item }: { item: string }): React.ReactElement => {
            const isActive = selectedLevel === item;
            return (
              <Pressable
                onPress={() => setSelectedLevel(item)}
                className={`mr-2 px-3.5 py-1.5 rounded-full border ${
                  isActive ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-200'
                }`}
              >
                <Text
                  className={`text-xs font-bold ${
                    isActive ? 'text-white' : 'text-slate-600'
                  }`}
                >
                  {item === 'ALL' ? 'Tất cả' : item}
                </Text>
              </Pressable>
            );
          }}
        />
      </View>

      {/* 3. DANH SÁCH BỘ THẺ */}
      {isLoading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#2563eb" />
          <Text className="text-xs text-slate-400 mt-2">Đang tải danh mục bộ thẻ...</Text>
        </View>
      ) : (
        <FlatList
          data={data?.items || []}
          keyExtractor={(item: DeckCatalogItemDto) => item.id}
          renderItem={renderDeckCard}
          contentContainerStyle={{ paddingTop: 12, paddingBottom: 24 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
          ListEmptyComponent={
            <View className="items-center justify-center p-8 mt-10">
              <BookOpen size={48} color="#cbd5e1" />
              <Text className="text-sm font-bold text-slate-700 mt-3">Không tìm thấy bộ thẻ phù hợp</Text>
              <Text className="text-xs text-slate-400 text-center mt-1">
                Vui lòng thử chọn cấp độ khác hoặc thay đổi từ khóa tìm kiếm.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
};
