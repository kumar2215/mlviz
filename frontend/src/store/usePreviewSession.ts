import { create } from "zustand";

export type AccountDialog = "sign-in" | "sign-up" | "story-prompt" | null;

interface PreviewSession {
    signedIn: boolean;
    storyPromptShown: boolean;
    dialog: AccountDialog;
    openDialog: (dialog: AccountDialog) => void;
    enterStories: () => void;
    previewSignIn: () => void;
    signOut: () => void;
}

// Presentation only: never persist credentials, account state, or XP.
export const usePreviewSession = create<PreviewSession>((set, get) => ({
    signedIn: false,
    storyPromptShown: false,
    dialog: null,
    openDialog: (dialog) => set({ dialog }),
    enterStories: () => {
        if (!get().signedIn && !get().storyPromptShown) {
            set({ storyPromptShown: true, dialog: "story-prompt" });
        }
    },
    previewSignIn: () => set({ signedIn: true, storyPromptShown: true, dialog: null }),
    signOut: () => set({ signedIn: false, dialog: null }),
}));
