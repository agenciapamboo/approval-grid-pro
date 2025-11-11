import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { validateFile, formatFileSize, FILE_CONSTRAINTS } from '@/utils/fileValidation';
import { toast } from 'sonner';

export interface UploadProgress {
  fileName: string;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
}

export interface UseFileUploadOptions {
  bucket: string;
  allowedTypes?: string[];
  onSuccess?: (filePath: string, publicUrl: string) => void;
  onError?: (error: Error) => void;
}

export function useFileUpload({ bucket, allowedTypes, onSuccess, onError }: UseFileUploadOptions) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);

  const uploadFile = useCallback(async (file: File, pathPrefix?: string): Promise<{ filePath: string; publicUrl: string } | null> => {
    // Validar arquivo
    const validation = validateFile(file, allowedTypes);
    if (!validation.valid) {
      toast.error(validation.error);
      onError?.(new Error(validation.error));
      return null;
    }

    setUploading(true);
    setProgress({
      fileName: file.name,
      progress: 0,
      status: 'uploading',
    });

    try {
      // Gerar nome único do arquivo
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = pathPrefix ? `${pathPrefix}/${fileName}` : fileName;

      // Simular progresso (Supabase não fornece progresso real de upload)
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (!prev || prev.progress >= 90) return prev;
          return { ...prev, progress: prev.progress + 10 };
        });
      }, 200);

      // Upload do arquivo
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type,
        });

      clearInterval(progressInterval);

      if (uploadError) {
        throw uploadError;
      }

      // Completar progresso
      setProgress(prev => prev ? { ...prev, progress: 100, status: 'completed' } : null);

      // Não usar getPublicUrl, apenas retornar o filePath
      // A URL assinada será gerada ao visualizar
      const publicUrl = ''; // Deprecated, usar filePath apenas

      onSuccess?.(filePath, publicUrl);
      
      setTimeout(() => {
        setProgress(null);
        setUploading(false);
      }, 1000);

      return { filePath, publicUrl };
    } catch (error: any) {
      console.error('Error uploading file:', error);
      
      setProgress(prev => prev ? { ...prev, status: 'error' } : null);
      
      let errorMessage = error.message || 'Erro ao fazer upload do arquivo';
      
      // Traduzir erro de tamanho do storage
      if (errorMessage.includes('exceeded the maximum allowed size')) {
        errorMessage = `O arquivo ultrapassa o limite de 100MB do armazenamento. Tamanho do arquivo: ${formatFileSize(file.size)}`;
      }
      
      toast.error(errorMessage);
      onError?.(error);

      setTimeout(() => {
        setProgress(null);
        setUploading(false);
      }, 2000);

      return null;
    }
  }, [bucket, allowedTypes, onSuccess, onError]);

  const uploadMultiple = useCallback(async (files: File[], pathPrefix?: string): Promise<Array<{ filePath: string; publicUrl: string }>> => {
    const results = [];
    
    for (const file of files) {
      const result = await uploadFile(file, pathPrefix);
      if (result) {
        results.push(result);
      }
    }
    
    return results;
  }, [uploadFile]);

  return {
    uploadFile,
    uploadMultiple,
    uploading,
    progress,
  };
}
