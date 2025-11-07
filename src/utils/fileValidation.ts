export const FILE_CONSTRAINTS = {
  MAX_SIZE: 50 * 1024 * 1024, // 50MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
  ALLOWED_VIDEO_TYPES: ['video/mp4', 'video/quicktime', 'video/x-msvideo'],
  ALLOWED_DOCUMENT_TYPES: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
} as const;

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

export function validateFile(file: File, allowedTypes?: string[]): FileValidationResult {
  // Validar tamanho
  if (file.size > FILE_CONSTRAINTS.MAX_SIZE) {
    return {
      valid: false,
      error: `Arquivo muito grande. Tamanho máximo: ${FILE_CONSTRAINTS.MAX_SIZE / 1024 / 1024}MB`,
    };
  }

  // Validar tipo
  const types = allowedTypes || [
    ...FILE_CONSTRAINTS.ALLOWED_IMAGE_TYPES,
    ...FILE_CONSTRAINTS.ALLOWED_VIDEO_TYPES,
    ...FILE_CONSTRAINTS.ALLOWED_DOCUMENT_TYPES,
  ];

  if (!types.includes(file.type)) {
    return {
      valid: false,
      error: `Tipo de arquivo não permitido. Tipos aceitos: ${types.join(', ')}`,
    };
  }

  return { valid: true };
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}
