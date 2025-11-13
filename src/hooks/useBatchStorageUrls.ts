import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseBatchStorageUrlsOptions {
  bucket: string;
  filePaths: (string | null | undefined)[];
  expiresIn?: number;
}

export function useBatchStorageUrls({ bucket, filePaths, expiresIn = 3600 }: UseBatchStorageUrlsOptions) {
  const [urls, setUrls] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    async function fetchBatchUrls() {
      // Filtrar apenas paths válidos (não null, não vazio, não já URL)
      const validPaths = filePaths.filter((path): path is string => {
        if (!path) return false;
        if (path.startsWith('http://') || path.startsWith('https://')) {
          // Já é URL externa, adicionar ao Map
          if (mounted) {
            setUrls(prev => new Map(prev).set(path, path));
          }
          return false;
        }
        return true;
      });

      if (validPaths.length === 0) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Criar signed URLs em batch usando Promise.all
        const urlPromises = validPaths.map(async (filePath) => {
          try {
            const { data, error: signedUrlError } = await supabase.storage
              .from(bucket)
              .createSignedUrl(filePath, expiresIn);

            if (signedUrlError) throw signedUrlError;

            return { filePath, signedUrl: data?.signedUrl || null };
          } catch (err) {
            console.error(`Error generating signed URL for ${filePath}:`, err);
            return { filePath, signedUrl: null };
          }
        });

        const results = await Promise.all(urlPromises);

        if (mounted) {
          const newUrlsMap = new Map<string, string>();
          
          // Adicionar URLs externas (já adicionadas acima)
          filePaths.forEach(path => {
            if (path && (path.startsWith('http://') || path.startsWith('https://'))) {
              newUrlsMap.set(path, path);
            }
          });

          // Adicionar signed URLs geradas
          results.forEach(({ filePath, signedUrl }) => {
            if (signedUrl) {
              newUrlsMap.set(filePath, signedUrl);
            }
          });

          setUrls(newUrlsMap);
        }
      } catch (err) {
        console.error('Error batch loading signed URLs:', err);
        if (mounted) {
          setError(err as Error);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    fetchBatchUrls();

    return () => {
      mounted = false;
    };
  }, [bucket, JSON.stringify(filePaths), expiresIn]);

  return { urls, loading, error };
}
