"use client";

import { useState } from "react";
import { Mic, Loader2, Languages } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { VoiceRecorder } from "@/features/voices/components/voice-recorder";
import { env } from "@/lib/env";
import { chatterbox } from "@/lib/chatterbox-client";

interface VoiceTranscribeButtonProps {
  onTranscribe: (text: string) => void;
  disabled?: boolean;
}

export function VoiceTranscribeButton({
  onTranscribe,
  disabled
}: VoiceTranscribeButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [recordedFile, setRecordedFile] = useState<File | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);

  const handleTranscribe = async () => {
    if (!recordedFile) return;

    setIsTranscribing(true);
    try {
      const formData = new FormData();
      formData.append("file", recordedFile);

      // Using verified env variables for client-side fetch
      const response = await fetch(`${env.NEXT_PUBLIC_CHATTERBOX_API_URL}/transcribe`, {
        method: "POST",
        headers: {
          "x-api-key": env.NEXT_PUBLIC_CHATTERBOX_API_KEY,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to transcribe audio");
      }

      const result = await response.json();
      onTranscribe(result.text);
      toast.success("Transcription complete!");
      setIsOpen(false);
      setRecordedFile(null);
    } catch (error) {
      console.error(error);
      toast.error("Transcription failed. Please try again.");
    } finally {
      setIsTranscribing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 shrink-0"
          disabled={disabled}
        >
          <Mic className="size-4" />
          <span className="hidden sm:inline">Transcribe Voice</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Transcribe Voice with Whisper</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <VoiceRecorder
            file={recordedFile}
            onFileChange={setRecordedFile}
          />
        </div>
        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => setIsOpen(false)}
            disabled={isTranscribing}
          >
            Cancel
          </Button>
          <Button
            onClick={handleTranscribe}
            disabled={!recordedFile || isTranscribing}
            className="gap-2"
          >
            {isTranscribing ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Transcribing...
              </>
            ) : (
              <>
                <Mic className="size-4" />
                Transcribe Recording
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
