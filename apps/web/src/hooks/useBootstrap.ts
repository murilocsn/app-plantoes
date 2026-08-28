import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { domainApi } from "../lib/domain-api";

const bootstrapKey = ["bootstrap"];

export function useBootstrap() {
  return useQuery({
    queryKey: bootstrapKey,
    queryFn: domainApi.bootstrap,
  });
}

export function useRefreshBootstrap() {
  const queryClient = useQueryClient();

  return () => queryClient.invalidateQueries({ queryKey: bootstrapKey });
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
      options?.onError?.(error instanceof Error ? error : new Error("Falha ao concluir a operacao."));
    },
  });
}
