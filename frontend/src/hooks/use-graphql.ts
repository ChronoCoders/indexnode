"use client";

import { useCallback, useEffect, useState } from "react";
import { gql } from "@/lib/api";

export interface GraphQLQueryState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useGraphQLQuery<T>(
  query: string,
  variables?: Record<string, unknown>,
): GraphQLQueryState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);
  const serializedVars = JSON.stringify(variables ?? {});

  useEffect(() => {
    let cancelled = false;
    gql<T>(query, JSON.parse(serializedVars) as Record<string, unknown>)
      .then((result) => {
        if (cancelled) return;
        setData(result);
        setError(null);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err : new Error(String(err)));
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [query, serializedVars, version]);

  const refetch = useCallback(() => {
    setLoading(true);
    setVersion((v) => v + 1);
  }, []);

  return { data, loading, error, refetch };
}
