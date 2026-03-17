import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  TextInput,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SYMBOL_LIBRARY, SYMBOL_CATEGORIES, SymbolEntry, SymbolCategory } from '@/constants/symbols';
import { Colors, Fonts, Spacing, Radius } from '@/constants/theme';

export default function EncyclopediaScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<SymbolCategory | 'all'>('all');
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, []);

  const filtered = useMemo(() => {
    return SYMBOL_LIBRARY.filter((s) => {
      const matchSearch =
        search.length === 0 ||
        s.symbol.toLowerCase().includes(search.toLowerCase()) ||
        s.shortMeaning.toLowerCase().includes(search.toLowerCase()) ||
        s.relatedSymbols.some((r) => r.toLowerCase().includes(search.toLowerCase()));
      const matchCategory = activeCategory === 'all' || s.category === activeCategory;
      return matchSearch && matchCategory;
    });
  }, [search, activeCategory]);

  function renderSymbolCard({ item }: { item: SymbolEntry; index: number }) {
    const category = SYMBOL_CATEGORIES.find((c) => c.id === item.category);

    return (
      <Pressable
        onPress={() => router.push({ pathname: '/symbol-detail', params: { symbolId: item.id } })}
        style={({ pressed }) => [styles.symbolCard, pressed && styles.pressed]}
      >
        <View style={[styles.symbolEmojiBg, { backgroundColor: category?.bgColor ?? Colors.surfaceElevated }]}>
          <Text style={styles.symbolEmoji}>{item.emoji}</Text>
        </View>
        <View style={styles.symbolInfo}>
          <Text style={styles.symbolName}>{item.symbol}</Text>
          <Text style={styles.symbolMeaning} numberOfLines={2}>{item.shortMeaning}</Text>
          {category ? (
            <View style={[styles.catPill, { backgroundColor: category.bgColor }]}>
              <Text style={[styles.catPillText, { color: category.color }]}>
                {category.emoji} {category.label}
              </Text>
            </View>
          ) : null}
        </View>
        <MaterialIcons name="arrow-forward-ios" size={14} color={Colors.textSubtle} />
      </Pressable>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar style="light" />

      {/* Header */}
      <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <MaterialIcons name="arrow-back-ios" size={20} color={Colors.textSecondary} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Symbol Encyclopedia</Text>
          <Text style={styles.headerSub}>{SYMBOL_LIBRARY.length} symbols · Jungian & Archetypal</Text>
        </View>
        <View style={{ width: 32 }} />
      </Animated.View>

      {/* Search */}
      <Animated.View style={[styles.searchWrap, { opacity: fadeAnim }]}>
        <MaterialIcons name="search" size={18} color={Colors.textSubtle} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search symbols, meanings..."
          placeholderTextColor={Colors.textSubtle}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 ? (
          <Pressable onPress={() => setSearch('')} hitSlop={8}>
            <MaterialIcons name="close" size={16} color={Colors.textSubtle} />
          </Pressable>
        ) : null}
      </Animated.View>

      {/* Category Filters */}
      <Animated.View style={{ opacity: fadeAnim }}>
        <FlatList
          data={[{ id: 'all', label: 'All', emoji: '✦', color: Colors.accent, bgColor: Colors.accentDim } as any, ...SYMBOL_CATEGORIES]}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.filtersContent}
          style={styles.filtersRow}
          renderItem={({ item }) => {
            const isActive = activeCategory === item.id;
            return (
              <Pressable
                onPress={() => setActiveCategory(item.id as SymbolCategory | 'all')}
                style={[styles.filterChip, isActive && { backgroundColor: item.bgColor, borderColor: item.color + '60' }]}
              >
                <Text style={styles.filterEmoji}>{item.emoji}</Text>
                <Text style={[styles.filterLabel, isActive && { color: item.color }]}>{item.label}</Text>
              </Pressable>
            );
          }}
        />
      </Animated.View>

      {/* Results count */}
      {search.length > 0 || activeCategory !== 'all' ? (
        <Text style={styles.resultsCount}>{filtered.length} symbol{filtered.length !== 1 ? 's' : ''} found</Text>
      ) : null}

      {/* Symbol List */}
      {filtered.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyEmoji}>🔮</Text>
          <Text style={styles.emptyTitle}>No Symbols Found</Text>
          <Text style={styles.emptyDesc}>Try a different search or category.</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderSymbolCard}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md, paddingTop: Spacing.sm,
  },
  backBtn: { padding: Spacing.xs },
  headerCenter: { alignItems: 'center', gap: 2 },
  headerTitle: { color: Colors.textPrimary, fontSize: Fonts.sizes.lg, fontWeight: Fonts.weights.bold },
  headerSub: { color: Colors.textSubtle, fontSize: Fonts.sizes.xs },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: Spacing.lg, backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    gap: Spacing.sm, marginBottom: Spacing.sm,
  },
  searchInput: { flex: 1, color: Colors.textPrimary, fontSize: Fonts.sizes.md },
  filtersRow: { maxHeight: 52, marginBottom: Spacing.xs },
  filtersContent: { paddingHorizontal: Spacing.lg, gap: Spacing.sm, paddingVertical: Spacing.xs },
  filterChip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.full, backgroundColor: Colors.surfaceElevated,
    borderWidth: 1, borderColor: Colors.border, gap: 4,
  },
  filterEmoji: { fontSize: 13 },
  filterLabel: { color: Colors.textSubtle, fontSize: Fonts.sizes.sm, fontWeight: Fonts.weights.medium },
  resultsCount: {
    color: Colors.textSubtle, fontSize: Fonts.sizes.xs,
    paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xs,
  },
  listContent: { paddingHorizontal: Spacing.lg, paddingBottom: 40, gap: Spacing.sm },
  symbolCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surfaceElevated, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.border,
    padding: Spacing.md, gap: Spacing.md,
  },
  pressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
  symbolEmojiBg: {
    width: 52, height: 52, borderRadius: 26,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  symbolEmoji: { fontSize: 26 },
  symbolInfo: { flex: 1, gap: 4 },
  symbolName: { color: Colors.textPrimary, fontSize: Fonts.sizes.md, fontWeight: Fonts.weights.semibold },
  symbolMeaning: { color: Colors.textSecondary, fontSize: Fonts.sizes.sm, lineHeight: Fonts.sizes.sm * 1.5 },
  catPill: {
    alignSelf: 'flex-start', paddingHorizontal: Spacing.xs + 2, paddingVertical: 2,
    borderRadius: Radius.full, marginTop: 2,
  },
  catPillText: { fontSize: Fonts.sizes.xs, fontWeight: Fonts.weights.medium },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md, paddingHorizontal: Spacing.xl },
  emptyEmoji: { fontSize: 56 },
  emptyTitle: { color: Colors.textPrimary, fontSize: Fonts.sizes.xl, fontWeight: Fonts.weights.bold },
  emptyDesc: { color: Colors.textSecondary, fontSize: Fonts.sizes.md, textAlign: 'center' },
});
