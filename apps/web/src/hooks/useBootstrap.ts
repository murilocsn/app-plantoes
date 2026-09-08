import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { domainApi } from "../lib/domain-api";

const bootstrapKey = ["bootstrap"];
const dashboardOverviewKey = ["dashboard-overview"];

export function useBootstrap() {
  return useQuery({
    queryKey: bootstrapKey,
    queryFn: domainApi.bootstrap,
  });
}

export function useDashboardOverview(month: string) {
  return useQuery({
    queryKey: [...dashboardOverviewKey, month],
    queryFn: () => domainApi.dashboardOverview({ month }),
  });
}

export function useRefreshBootstrap() {
  const queryClient = useQueryClient();

  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: bootstrapKey }),
      queryClient.invalidateQueries({ queryKey: dashboardOverviewKey }),
    ]);
  };
}

export function useAppMutation<TInput>(
  action: (input: TInput) => Promise<unknown>,
  options?: {
    onSuccess?: () => void;
    onError?: (error: Error) => void;
  },
) {
  const refresh = useRefreshBootstrap();

  return useMutation({
    mutationFn: action,
    onSuccess: () => {
      void refresh();
      options?.onSuccess?.();
    },
    onError: (error) => {
      options?.onError?.(
        error instanceof Error ? error : new Error("Falha ao concluir a operacao."),
      );
    },
  });
}
