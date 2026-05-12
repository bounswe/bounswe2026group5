import { act, renderHook } from "@testing-library/react-native";

import { useRefreshControl } from "@/hooks/use-refresh-control";

describe("useRefreshControl", () => {
  it("returns refreshing as false before any refresh is triggered", () => {
    const { result } = renderHook(() =>
      useRefreshControl(jest.fn().mockResolvedValue(undefined)),
    );

    expect(result.current.refreshing).toBe(false);
  });

  it("sets refreshing to true while the async refresh function is pending", async () => {
    let resolveRefresh!: () => void;
    const refreshFn = jest.fn(
      () => new Promise<void>((resolve) => { resolveRefresh = resolve; }),
    );
    const { result } = renderHook(() => useRefreshControl(refreshFn));

    act(() => {
      result.current.onRefresh();
    });

    expect(result.current.refreshing).toBe(true);

    await act(async () => { resolveRefresh(); });
  });

  it("resets refreshing to false once the refresh function resolves", async () => {
    const refreshFn = jest.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useRefreshControl(refreshFn));

    await act(async () => {
      await result.current.onRefresh();
    });

    expect(result.current.refreshing).toBe(false);
  });

  it("resets refreshing to false even when the refresh function rejects", async () => {
    const refreshFn = jest.fn().mockRejectedValue(new Error("network error"));
    const { result } = renderHook(() => useRefreshControl(refreshFn));

    await act(async () => {
      await result.current.onRefresh().catch(() => {});
    });

    expect(result.current.refreshing).toBe(false);
  });
});
