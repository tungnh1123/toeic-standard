import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import {
  Plus,
  Star,
  AlertCircle,
  Bookmark,
  Pin,
  ChevronRight,
  BookOpen,
} from 'lucide-react-native';
import { useUserNotebooks } from '../../hooks/useVocabularyNotebooks';
import { NotebookItemDto } from '../../modules/flashcards/dto/notebook-response.dto';
import { NotebookType } from '../../modules/flashcards/entities/user-vocabulary-notebook.entity';

export interface NotebookListScreenProps {
  onSelectNotebook?: (notebookId: string) => void;
  onCreateNewPress?: () => void;
}

export const NotebookListScreen: React.FC<NotebookListScreenProps> = ({
  onSelectNotebook,
  onCreateNewPress,
}) => {
  const { data: notebooks, isLoading, refetch, isRefetching } = useUserNotebooks();

  const renderIcon = (iconName: string, color: string): React.ReactElement => {
    switch (iconName) {
      case 'star':
        return <Star size={22} color={color} fill={color} />;
      case 'alert-circle':
        return <AlertCircle size={22} color={color} />;
      case 'book-open':
        return <BookOpen size={22} color={color} />;
      default:
        return <Bookmark size={22} color={color} />;
    }
  };

  const renderNotebookItem = ({ item }: { item: NotebookItemDto }): React.ReactElement => {
    const isStarred = item.notebookType === NotebookType.STARRED;

    return (
      <Pressable
        onPress={() => onSelectNotebook?.(item.id)}
        className="bg-white rounded-2xl p-4 mb-3 border border-slate-200 shadow-sm flex-row items-center justify-between active:bg-slate-50"
      >
        <View className="flex-row items-center flex-1 mr-3">
          {/* Khối biểu tượng sổ tay */}
          <View
            style={{ backgroundColor: `${item.colorCode}18` }}
            className="w-12 h-12 rounded-xl items-center justify-center mr-3"
          >
            {renderIcon(item.iconName, item.colorCode)}
          </View>

          {/* Chi tiết sổ tay */}
          <View className="flex-1">
            <View className="flex-row items-center gap-1.5">
              <Text className="text-base font-bold text-slate-800" numberOfLines={1}>
                {item.title}
              </Text>
              {item.isPinned && <Pin size={12} color="#2563eb" fill="#2563eb" />}
              {isStarred && (
                <Text className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded uppercase">
                  STARRED
                </Text>
              )}
            </View>
            <Text className="text-xs text-slate-400 mt-0.5">
              {item.totalCards} từ vựng đã lưu
            </Text>
          </View>
        </View>

        <ChevronRight size={18} color="#94a3b8" />
      </Pressable>
    );
  };

  return (
    <View className="flex-1 bg-slate-50 px-4 pt-3">
      {/* HEADER QUẢN LÝ */}
      <View className="flex-row items-center justify-between py-3 mb-2">
        <View>
          <Text className="text-xl font-extrabold text-slate-900">Sổ tay từ vựng</Text>
          <Text className="text-xs text-slate-500">Tổ chức kho từ khó và ghi chú cá nhân</Text>
        </View>
        <Pressable
          onPress={() => onCreateNewPress?.()}
          className="bg-blue-600 flex-row items-center px-3.5 py-2 rounded-xl gap-1 active:bg-blue-700"
        >
          <Plus size={16} color="white" />
          <Text className="text-white font-bold text-xs">Tạo mới</Text>
        </Pressable>
      </View>

      {/* DANH SÁCH SỔ TAY */}
      {isLoading ? (
        <View className="flex-1 justify-center items-center py-20">
          <ActivityIndicator size="large" color="#2563eb" />
          <Text className="text-xs text-slate-400 mt-3 font-medium">
            Đang tải danh sách sổ tay...
          </Text>
        </View>
      ) : (
        <FlatList
          data={notebooks ?? []}
          keyExtractor={(item) => item.id}
          renderItem={renderNotebookItem}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => void refetch()}
            />
          }
          ListEmptyComponent={
            <View className="items-center justify-center py-20">
              <Bookmark size={48} color="#cbd5e1" />
              <Text className="text-slate-400 font-bold text-base mt-3">
                Chưa có sổ tay nào
              </Text>
              <Text className="text-slate-400 text-xs text-center mt-1 px-8">
                Tạo sổ tay mới để phân loại và lưu trữ các từ vựng bẫy TOEIC
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
};

