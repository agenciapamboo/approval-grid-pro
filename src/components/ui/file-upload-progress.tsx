import { Progress } from '@/components/ui/progress';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { UploadProgress } from '@/hooks/useFileUpload';
import { formatFileSize } from '@/utils/fileValidation';

interface FileUploadProgressProps {
  progress: UploadProgress;
}

export function FileUploadProgress({ progress }: FileUploadProgressProps) {
  return (
    <div className="space-y-2 p-3 bg-muted/50 rounded-lg border">
      <div className="flex items-center gap-2">
        {progress.status === 'uploading' && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
        {progress.status === 'completed' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
        {progress.status === 'error' && <AlertCircle className="h-4 w-4 text-destructive" />}
        
        <span className="text-sm font-medium truncate flex-1">{progress.fileName}</span>
        
        <span className="text-xs text-muted-foreground">
          {progress.progress}%
        </span>
      </div>
      
      <Progress value={progress.progress} className="h-1" />
    </div>
  );
}
