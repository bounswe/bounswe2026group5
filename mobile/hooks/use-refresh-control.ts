import { useCallback, useState } from "react";

export function useRefreshControl(refreshFn: () => Promise<unknown>) {
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshFn();
    } finally {
      setRefreshing(false);
    }
  }, [refreshFn]);

  return {
    refreshing,
    onRefresh,
  };
}
