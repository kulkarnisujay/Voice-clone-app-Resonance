"use client";

import { useState } from "react";
import { Globe, Loader2, Check, ChevronsUpDown } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { LANGUAGE_OPTIONS } from "@/features/voices/data/languages";
import { env } from "@/lib/env";

interface TranslationSelectorProps {
  text: string;
  onTranslate: (translatedText: string) => void;
  disabled?: boolean;
}

export function TranslationSelector({
  text,
  onTranslate,
  disabled
}: TranslationSelectorProps) {
  const [open, setOpen] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);

  const handleTranslate = async (targetLang: string) => {
    if (!text.trim()) {
      toast.error("Please enter some text to translate.");
      return;
    }

    setIsTranslating(true);
    setOpen(false);

    try {
      // Extract language code (e.g. 'es' from 'es-ES')
      const dest = targetLang.split("-")[0];

      const response = await fetch(`${env.NEXT_PUBLIC_CHATTERBOX_API_URL}/translate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": env.NEXT_PUBLIC_CHATTERBOX_API_KEY,
        },
        body: JSON.stringify({
          text: text,
          target_lang: dest,
        }),
      });

      if (!response.ok) {
        throw new Error("Translation failed");
      }

      const result = await response.json();
      onTranslate(result.translated_text);
      toast.success(`Translated to ${targetLang}!`);
    } catch (error) {
      console.error(error);
      toast.error("Translation failed. Please try again.");
    } finally {
      setIsTranslating(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 shrink-0"
          disabled={disabled || isTranslating || !text.trim()}
        >
          {isTranslating ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Globe className="size-4" />
          )}
          <span className="hidden sm:inline">Translate</span>
          <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="end">
        <Command>
          <CommandInput placeholder="Search language..." />
          <CommandList>
            <CommandEmpty>No language found.</CommandEmpty>
            <CommandGroup heading="All Languages">
              {LANGUAGE_OPTIONS.map((lang) => (
                <CommandItem
                  key={lang.value}
                  value={lang.label}
                  onSelect={() => handleTranslate(lang.value)}
                >
                  <Globe className="mr-2 h-4 w-4 opacity-50" />
                  {lang.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
