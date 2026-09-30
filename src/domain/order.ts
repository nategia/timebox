/**
 * Where a dragged item lands after removal from `from`, given the gap it was dropped
 * into (`gap` 0 = above the first item, n = below the last).
 */
export const dropIndex = (from: number, gap: number) => (gap > from ? gap - 1 : gap);
