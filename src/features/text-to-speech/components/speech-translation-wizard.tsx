"use client";

import { useState } from "react";
import { Mic, Globe, Loader2, Play, ArrowRight, Languages, Check } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { VoiceRecorder } from "@/features/voices/components/voice-recorder";
import { LANGUAGE_OPTIONS } from "@/features/voices/data/languages";
import { env } from "@/lib/env";
import { useTTSVoices } from "../contexts/tts-voices-context";

interface SpeechTranslationWizardProps {
  onComplete: (text: string, voiceId: string) => void;
  disabled?: boolean;
}

type Step = "RECORD" | "TRANSCRIBE" | "SELECT_LANGUAGE" | "TRANSLATE";

export function SpeechTranslationWizard({
  onComplete,
  disabled
}: SpeechTranslationWizardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<Step>("RECORD");
  const [recordedFile, setRecordedFile] = useState<File | null>(null);
  const [transcript, setTranscript] = useState("");
  const [sourceLang, setSourceLang] = useState("");
  const [targetLang, setTargetLang] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const { allVoices } = useTTSVoices();

  const reset = () => {
    setStep("RECORD");
    setRecordedFile(null);
    setTranscript("");
    setSourceLang("");
    setTargetLang("");
    setIsProcessing(false);
  };

  const handleTranscribe = async () => {
    if (!recordedFile) return;
    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append("file", recordedFile);

      const response = await fetch(`${env.NEXT_PUBLIC_CHATTERBOX_API_URL}/transcribe`, {
        method: "POST",
        headers: { "x-api-key": env.NEXT_PUBLIC_CHATTERBOX_API_KEY },
        body: formData,
      });

      if (!response.ok) throw new Error("Transcription failed");
      const result = await response.json();
      setTranscript(result.text);
      setSourceLang(result.language);
      setStep("SELECT_LANGUAGE");
    } catch (error) {
      toast.error("Failed to transcribe audio.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTranslate = async (selectedLangTag: string) => {
    setTargetLang(selectedLangTag);
    setIsProcessing(true);
    try {
      const destCode = selectedLangTag.split("-")[0];
      const response = await fetch(`${env.NEXT_PUBLIC_CHATTERBOX_API_URL}/translate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": env.NEXT_PUBLIC_CHATTERBOX_API_KEY,
        },
        body: JSON.stringify({ text: transcript, target_lang: destCode }),
      });

      if (!response.ok) throw new Error("Translation failed");
      const result = await response.json();
      
      // Find a matching voice for the target language
      const bestVoice = allVoices.find(v => 
        v.language?.toLowerCase() === selectedLangTag.toLowerCase() ||
        v.language?.toLowerCase().startsWith(destCode.toLowerCase())
      ) || allVoices[0];

      onComplete(result.translated_text, bestVoice.id);
      toast.success("Speech translated and ready!");
      setIsOpen(false);
      reset();
    } catch (error) {
      toast.error("Failed to translate text.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(v) => { setIsOpen(v); if(!v) reset(); }}>
      <DialogTrigger asChild>
        <Button
          variant="default"
          size="sm"
          className="gap-2 bg-chart-5 hover:bg-chart-5/90 text-white shadow-lg shadow-chart-5/20 shrink-0"
          disabled={disabled}
        >
          <Languages className="size-4" />
          <span className="hidden sm:inline">Speech-to-Speech</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Languages className="size-5 text-chart-5" />
            Universal Translator
          </DialogTitle>
        </DialogHeader>

        <div className="py-6">
          {step === "RECORD" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                Record your voice in any language. Whisper will detect it automatically.
              </p>
              <VoiceRecorder file={recordedFile} onFileChange={setRecordedFile} />
            </div>
          )}

          {step === "SELECT_LANGUAGE" && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted p-4 space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Original ({sourceLang.toUpperCase()})</p>
                <p className="text-sm font-medium leading-relaxed italic">"{transcript}"</p>
              </div>
              <p className="text-sm font-medium text-center pt-2">Choose target language:</p>
              <Command className="rounded-lg border shadow-sm">
                <CommandInput placeholder="Search language..." />
                <CommandList className="max-h-[200px]">
                  <CommandEmpty>No language found.</CommandEmpty>
                  <CommandGroup>
                    {LANGUAGE_OPTIONS.map((lang) => (
                      <CommandItem
                        key={lang.value}
                        value={lang.label}
                        onSelect={() => handleTranslate(lang.value)}
                        className="cursor-pointer"
                      >
                        <Globe className="mr-2 h-4 w-4 opacity-50" />
                        {lang.label}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </div>
          )}
        </div>

        <DialogFooter>
          {step === "RECORD" && (
            <Button
              onClick={handleTranscribe}
              disabled={!recordedFile || isProcessing}
              className="w-full gap-2"
            >
              {isProcessing ? <Loader2 className="size-4 animate-spin" /> : <Mic className="size-4" />}
              Transcribe Recording
            </Button>
          )}
          {step === "SELECT_LANGUAGE" && (
            <Button variant="ghost" onClick={() => setStep("RECORD")} disabled={isProcessing} className="w-full">
              Start Over
            </Button>
          )}
          {isProcessing && step !== "RECORD" && (
            <div className="flex w-full items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Translating & Matching Voices...
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
