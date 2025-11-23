import { Button } from "@/components/ui/button";
import { Mic, Square, X, Loader2 } from "lucide-react";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { cn } from "@/lib/utils";

interface AudioRecorderProps {
  clientId: string;
  onTranscriptionComplete: (transcription: string, audioUrl: string | null) => void;
}

export function AudioRecorder({ clientId, onTranscriptionComplete }: AudioRecorderProps) {
  const { isRecording, isProcessing, startRecording, stopRecording, cancelRecording } = 
    useAudioRecorder({ 
      clientId, 
      onTranscriptionComplete 
    });

  if (isProcessing) {
    return (
      <Button
        variant="outline"
        disabled
        className="border-green-500/20"
      >
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        Processando...
      </Button>
    );
  }

  if (isRecording) {
    return (
      <div className="flex gap-2">
        <Button
          onClick={stopRecording}
          className="bg-green-500 hover:bg-green-600 text-white"
        >
          <Square className="h-4 w-4 mr-2 fill-current" />
          Parar Gravação
        </Button>
        <Button
          onClick={cancelRecording}
          variant="ghost"
          size="icon"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <Button
      onClick={startRecording}
      variant="outline"
      className="border-green-500/20 hover:bg-green-500/10"
    >
      <div className="bg-green-500 rounded p-1 mr-2">
        <Mic className="h-3 w-3 text-white" />
      </div>
      Gravar áudio
    </Button>
  );
}
