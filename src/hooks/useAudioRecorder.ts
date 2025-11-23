import { useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface UseAudioRecorderProps {
  clientId: string;
  onTranscriptionComplete?: (transcription: string, audioUrl: string | null) => void;
}

export function useAudioRecorder({ clientId, onTranscriptionComplete }: UseAudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm',
      });

      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        await processAudio(audioBlob);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      toast.success("Gravação iniciada");
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error("Erro ao acessar microfone", {
        description: "Verifique as permissões do navegador"
      });
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsProcessing(true);
      toast.info("Processando áudio...");
    }
  }, [isRecording]);

  const processAudio = async (audioBlob: Blob) => {
    try {
      // Convert blob to base64
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      
      reader.onloadend = async () => {
        const base64Audio = (reader.result as string).split(',')[1];

        const { data, error } = await (supabase as any).functions.invoke('transcribe-audio', {
          body: {
            audio: base64Audio,
            clientId,
          },
        });

        if (error) throw error;

        if (data.limitReached) {
          toast.error("Limite de uso de IA atingido para este mês", {
            description: "Considere fazer upgrade do plano"
          });
          setIsProcessing(false);
          return;
        }

        if (data.transcription) {
          toast.success("Áudio transcrito com sucesso");
          onTranscriptionComplete?.(data.transcription, data.audioUrl);
        }

        setIsProcessing(false);
      };

      reader.onerror = () => {
        throw new Error('Failed to read audio file');
      };
    } catch (error) {
      console.error('Error processing audio:', error);
      toast.error("Erro ao processar áudio", {
        description: error instanceof Error ? error.message : "Tente novamente"
      });
      setIsProcessing(false);
    }
  };

  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      // Stop all tracks without processing
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      
      chunksRef.current = [];
      toast.info("Gravação cancelada");
    }
  }, [isRecording]);

  return {
    isRecording,
    isProcessing,
    startRecording,
    stopRecording,
    cancelRecording,
  };
}
