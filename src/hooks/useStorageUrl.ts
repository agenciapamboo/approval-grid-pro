import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseStorageUrlOptions {
  bucket: string;
  filePath: string | null | undefined;
  expiresIn?: number; // em segundos, padrão 3600 (1 hora)
}

export function useStorageUrl({ bucket, filePath, expiresIn = 3600 }: UseStorageUrlOptions) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    async function fetchSignedUrl() {
      if (!filePath) {
        setUrl(null);
        setLoading(false);
        return;
      }

      // Se for URL externa (começa com http), retornar diretamente
      if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
        setUrl(filePath);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const { data, error: signedUrlError } = await supabase.storage
          .from(bucket)
          .createSignedUrl(filePath, expiresIn);

        if (signedUrlError) throw signedUrlError;

        if (mounted && data?.signedUrl) {
          setUrl(data.signedUrl);
        }
      } catch (err) {
        console.error('Error generating signed URL:', err);
        if (mounted) {
          setError(err as Error);
          setUrl(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    fetchSignedUrl();

    return () => {
      mounted = false;
    };
  }, [bucket, filePath, expiresIn]);

  return { url, loading, error };
}
