export const FILE_CONSTRAINTS = {
  MAX_IMAGE_SIZE: 50 * 1024 * 1024, // 50MB
  MAX_VIDEO_SIZE: 100 * 1024 * 1024, // 100MB
  MAX_DOCUMENT_SIZE: 50 * 1024 * 1024, // 50MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
  ALLOWED_VIDEO_TYPES: ['video/mp4', 'video/quicktime', 'video/x-msvideo'],
  ALLOWED_DOCUMENT_TYPES: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
} as const;

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

export function validateFile(file: File, allowedTypes?: string[]): FileValidationResult {
  // Determinar limite de tamanho baseado no tipo de arquivo
  let maxSize: number;
  let sizeLabel: string;
  
  if (file.type.startsWith('video/')) {
    maxSize = FILE_CONSTRAINTS.MAX_VIDEO_SIZE;
    sizeLabel = `${FILE_CONSTRAINTS.MAX_VIDEO_SIZE / 1024 / 1024}MB`;
  } else if (file.type.startsWith('image/')) {
    maxSize = FILE_CONSTRAINTS.MAX_IMAGE_SIZE;
    sizeLabel = `${FILE_CONSTRAINTS.MAX_IMAGE_SIZE / 1024 / 1024}MB`;
  } else {
    maxSize = FILE_CONSTRAINTS.MAX_DOCUMENT_SIZE;
    sizeLabel = `${FILE_CONSTRAINTS.MAX_DOCUMENT_SIZE / 1024 / 1024}MB`;
  }

  // Validar tamanho
  if (file.size > maxSize) {
    const fileType = file.type.startsWith('video/') ? 'Vídeos' : 
                     file.type.startsWith('image/') ? 'Imagens' : 'Documentos';
    return {
      valid: false,
      error: `Arquivo muito grande. ${fileType} podem ter até ${sizeLabel}`,
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
