'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { fetchJson } from '@/lib/api-client';

export type EndResult = {
  sessionId: string;
  chatSummary: string;
  reflectionCard: string;
  structurePoints: {
    chatTheme: string;
    chatEmotions: string;
    coreEvent: string;
    relationshipImpact: string;
    deepNeed: string;
  };
};

export function useEndResult() {
  const searchParams = useSearchParams();
  const sessionId = useMemo(() => searchParams.get('sessionId') ?? '', [searchParams]);
  const [result, setResult] = useState<EndResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!sessionId) {
      return;
    }

    setLoading(true);
    setError('');

    fetchJson<EndResult>(`/api/chat/end-result?sessionId=${encodeURIComponent(sessionId)}`)
      .then((data) => setResult(data))
      .catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : '结果加载失败');
      })
      .finally(() => setLoading(false));
  }, [sessionId]);

  return { sessionId, result, loading, error };
}
