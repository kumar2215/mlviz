import { create } from "zustand";
import type { BpeDataset } from "@/types/dataset";
import type { RegexFlag } from "@/api/text_preprocessing";

interface RegexDraft { text: string; pattern: string; flags: RegexFlag[] }
interface TokenizationWorkspace {
    regexDraft: RegexDraft | null;
    porterWords: string[] | null;
    bpeSource: BpeDataset | null;
    setRegexDraft: (draft: RegexDraft) => void;
    setPorterWords: (words: string[]) => void;
    setBpeSource: (source: BpeDataset) => void;
}

export const useTokenization = create<TokenizationWorkspace>(set => ({
    regexDraft: null, porterWords: null, bpeSource: null,
    setRegexDraft: regexDraft => set({ regexDraft }),
    setPorterWords: porterWords => set({ porterWords }),
    setBpeSource: bpeSource => set({ bpeSource }),
}));
