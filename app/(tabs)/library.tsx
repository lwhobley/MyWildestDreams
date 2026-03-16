import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useDreams } from '@/hooks/useDreams';
import { DreamCard } from '@/components/ui/DreamCard';
import { DREAM_STYLES } from '@/constants/config';
import { Colors, Fonts, Spacing, Radius } from '@/constants/theme';
import { Dream } from '@/services/dreamService';

type FilterMode = 'all' | 'favorites' | string;
type ViewMode = 'grid' | 'list';

export default function LibraryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { dreams, isLoading, toggleDreamFavorite } = useDreams();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterMode>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  const filtered = dreams.filter((d) => {
    const matchSearch =
      search.length === 0 ||
      d.title.toLowerCase().includes(search.toLowerCase()) ||
      d.description.toLowerCase().includes(search.toLowerCase()) ||
      d.tags.some((t) => t.includes(search.toLowerCase()));

    const matchFilter =
      filter === 'all' ||
      (filter === 'favorites' && d.isFavorite) ||
      d.styleId === filter;

    return matchSearch && matchFilter;
  });

  const filters: { id: FilterMode; label: string; emoji?: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'favorites', label: 'Favorites', emoji: '⭐' },
    ...DREAM_STYLES.map((s) => ({ id: s.id, label: s.label, emoji: s.emoji })),
  ];

  function navigateToDream(dreamId: string) {
    router.push({ pathname: '/dream-playback', params: { dreamId } });
  }

  function renderDream({ item, index }: { item: Dream; index: number }) {
    if (viewMode === 'list') {
      return (
        <DreamCard
          dream={item}
          variant="list"
          onPress={() => navigateToDream(item.id)}
          onFavorite={() => toggleDreamFavorite(item.id)}
        />
      );
    }
    return (
      <View style={[styles.gridItem, index % 2 === 1 && styles.gridItemRight]}>
        <DreamCard
          dream={item}
          variant="grid"
          onPress={() => navigateToDream(item.id)}
          onFavorite={() => toggleDreamFavorite(item.id)}
        />
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Dream Archive</Text>
          <Text style={styles.headerSub}>{dreams.length} dreamscapes</Text>
        </View>
        <Pressable
          onPress={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
          hitSlop={12}
          style={styles.viewToggle}
        >
          <MaterialIcons
            name={viewMode === 'grid' ? 'view-list' : 'grid-view'}
            size={22}
            color={Colors.textSecondary}
          />
        </Pressable>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <MaterialIcons name="search" size={18} color={Colors.textSubtle} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search dreams..."
          placeholderTextColor={Colors.textSubtle}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 ? (
          <Pressable onPress={() => setSearch('')} hitSlop={8}>
            <MaterialIcons name="close" size={16} color={Colors.textSubtle} />
          </Pressable>
        ) : null}
      </View>

      {/* Filters */}
      <FlatList
        data={filters}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.filtersContent}
        style={styles.filtersRow}
        renderItem={({ item }) => {
          const isSelected = filter === item.id;
          return (
            <Pressable
              onPress={() => setFilter(item.id)}
              style={[styles.filterChip, isSelected && styles.filterChipActive]}
            >
              {item.emoji ? <Text style={styles.filterEmoji}>{item.emoji}</Text> : null}
              <Text style={[styles.filterLabel, isSelected && styles.filterLabelActive]}>
                {item.label}
              </Text>
            </Pressable>
          );
        }}
      />

      {/* Dream list */}
      {isLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={Colors.accent} />
          <Text style={styles.loadingText}>Loading your dreamscapes...</Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyEmoji}>🌑</Text>
          <Text style={styles.emptyTitle}>No Dreams Found</Text>
          <Text style={styles.emptyDesc}>
            {search ? 'Try a different search term.' : 'Capture your first dream to begin the archive.'}
          </Text>
          {search.length === 0 ? (
            <Pressable
              onPress={() => router.push('/dream-input')}
              style={({ pressed }) => [styles.emptyBtn, pressed && styles.pressed]}
            >
              <Text style={styles.emptyBtnText}>Capture a Dream</Text>
            </Pressable>
          ) : null}
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderDream}
          numColumns={viewMode === 'grid' ? 2 : 1}
          key={viewMode}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.listContent,
            viewMode === 'grid' && styles.gridContent,
          ]}
          columnWrapperStyle={viewMode === 'grid' ? styles.gridRow : undefined}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  headerTitle: {
    color: Colors.textPrimary,
    fontSize: Fonts.sizes.xl,
    fontWeight: Fonts.weights.bold,
  },
  headerSub: {
    color: Colors.textSubtle,
    fontSize: Fonts.sizes.sm,
  },
  viewToggle: {
    padding: Spacing.xs,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.lg,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: Fonts.sizes.md,
  },
  filtersRow: {
    marginBottom: Spacing.sm,
    maxHeight: 52,
  },
  filtersContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 4,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primaryLight,
  },
  filterEmoji: {
    fontSize: 13,
  },
  filterLabel: {
    color: Colors.textSubtle,
    fontSize: Fonts.sizes.sm,
    fontWeight: Fonts.weights.medium,
  },
  filterLabelActive: {
    color: Colors.textPrimary,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    color: Colors.textSubtle,
    fontSize: Fonts.sizes.sm,
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },
  emptyEmoji: {
    fontSize: 64,
  },
  emptyTitle: {
    color: Colors.textPrimary,
    fontSize: Fonts.sizes.xl,
    fontWeight: Fonts.weights.bold,
  },
  emptyDesc: {
    color: Colors.textSecondary,
    fontSize: Fonts.sizes.md,
    textAlign: 'center',
    lineHeight: Fonts.sizes.md * 1.6,
  },
  emptyBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.full,
    marginTop: Spacing.sm,
  },
  emptyBtnText: {
    color: Colors.textPrimary,
    fontSize: Fonts.sizes.md,
    fontWeight: Fonts.weights.semibold,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 40,
  },
  gridContent: {
    gap: Spacing.sm,
  },
  gridRow: {
    gap: Spacing.sm,
    justifyContent: 'space-between',
  },
  gridItem: {
    flex: 1,
  },
  gridItemRight: {
    marginLeft: 0,
  },
});
