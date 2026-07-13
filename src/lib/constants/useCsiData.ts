'use client';

import { useEffect, useState } from 'react';
import {
  loadCsiData,
  getLoadedCsiData,
  formatCsiCodeWith,
  type CsiData,
} from '@/lib/constants/csiCodes';

/**
 * Lazily load the full CSI dataset on mount. Returns null until the (dynamically
 * imported) JSON resolves, then the built maps + tree. The underlying data is
 * cached module-wide, so the second and later consumers get it on first render.
 */
export function useCsiData(): CsiData | null {
  const [data, setData] = useState<CsiData | null>(() => getLoadedCsiData());

  useEffect(() => {
    if (data) return;
    let active = true;
    void loadCsiData().then((d) => {
      if (active) setData(d);
    });
    return () => {
      active = false;
    };
  }, [data]);

  return data;
}

/**
 * Format a single CSI code as "CODE - Name", lazy-loading the dataset. Renders
 * the raw code until the names are available (one extra frame at most), which is
 * fine for the small labels this backs (task header chip, filter chips).
 */
export function useCsiName(code: string | null | undefined): string | null {
  const data = useCsiData();
  if (!code) return null;
  return formatCsiCodeWith(data, code);
}
