import { memo, useCallback, useRef, useState, type ReactElement } from "react";
import {
  FlatList,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ListRenderItemInfo,
} from "react-native";

interface VerticalReelPagerProps<T extends { id: string }> {
  data: T[];
  renderItem: (info: {
    item: T;
    index: number;
    isActive: boolean;
    height: number;
  }) => ReactElement;
  onActiveChange?: (item: T, index: number) => void;
  /** Remount key if the list identity changes (e.g. curate). */
  listKey?: string;
}

/**
 * Full-screen vertical reel pager: one item per viewport, snap only after
 * the gesture settles (avoids mid-scroll multi-image flicker).
 */
export function VerticalReelPager<T extends { id: string }>({
  data,
  renderItem,
  onActiveChange,
  listKey,
}: VerticalReelPagerProps<T>) {
  const [viewportHeight, setViewportHeight] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const activeIndexRef = useRef(0);
  const dataRef = useRef(data);
  dataRef.current = data;

  const onListLayout = useCallback((e: LayoutChangeEvent) => {
    const next = Math.floor(e.nativeEvent.layout.height);
    if (next > 0) {
      setViewportHeight((prev) => (prev === next ? prev : next));
    }
  }, []);

  const settleActive = useCallback(
    (offsetY: number) => {
      if (viewportHeight <= 0) return;
      const nextIndex = Math.max(
        0,
        Math.min(
          dataRef.current.length - 1,
          Math.round(offsetY / viewportHeight)
        )
      );
      if (nextIndex === activeIndexRef.current) return;
      activeIndexRef.current = nextIndex;
      setActiveIndex(nextIndex);
      const item = dataRef.current[nextIndex];
      if (item) onActiveChange?.(item, nextIndex);
    },
    [viewportHeight, onActiveChange]
  );

  const onMomentumScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      settleActive(e.nativeEvent.contentOffset.y);
    },
    [settleActive]
  );

  const onScrollEndDrag = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      // iOS sometimes skips momentum when the snap is short.
      const { velocity } = e.nativeEvent;
      if (!velocity || Math.abs(velocity.y) < 0.05) {
        settleActive(e.nativeEvent.contentOffset.y);
      }
    },
    [settleActive]
  );

  const listRenderItem = useCallback(
    ({ item, index }: ListRenderItemInfo<T>) =>
      renderItem({
        item,
        index,
        isActive: index === activeIndex,
        height: viewportHeight,
      }),
    [activeIndex, renderItem, viewportHeight]
  );

  const getItemLayout = useCallback(
    (_: ArrayLike<T> | null | undefined, index: number) => ({
      length: viewportHeight,
      offset: viewportHeight * index,
      index,
    }),
    [viewportHeight]
  );

  return (
    <View style={styles.wrap} onLayout={onListLayout}>
      {viewportHeight > 0 ? (
        <FlatList
          key={listKey ?? "pager"}
          data={data}
          keyExtractor={(item) => item.id}
          renderItem={listRenderItem}
          extraData={activeIndex}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          decelerationRate="fast"
          bounces={false}
          overScrollMode="never"
          disableIntervalMomentum
          // Avoid snapToInterval + pagingEnabled together — they fight and flicker.
          onMomentumScrollEnd={onMomentumScrollEnd}
          onScrollEndDrag={onScrollEndDrag}
          getItemLayout={getItemLayout}
          windowSize={3}
          initialNumToRender={1}
          maxToRenderPerBatch={1}
          updateCellsBatchingPeriod={50}
          removeClippedSubviews={false}
          style={styles.list}
        />
      ) : null}
    </View>
  );
}

export const MemoVerticalReelPager = memo(VerticalReelPager) as typeof VerticalReelPager;

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: "#0B1F14" },
  list: { flex: 1 },
});
