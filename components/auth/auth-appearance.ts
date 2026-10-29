import { dark } from "@clerk/ui/themes";
import type { Appearance } from "@clerk/ui";

export const authAppearance: Appearance = {
  cssLayerName: "clerk",
  theme: dark,
  variables: {
    colorPrimary: "var(--accent-primary)",
    colorPrimaryForeground: "var(--bg-base)",
    colorBackground: "var(--bg-surface)",
    colorForeground: "var(--text-primary)",
    colorMutedForeground: "var(--text-muted)",
    colorInput: "var(--bg-elevated)",
    colorInputForeground: "var(--text-primary)",
    colorNeutral: "var(--text-secondary)",
    colorDanger: "var(--state-error)",
    colorSuccess: "var(--state-success)",
    colorWarning: "var(--state-warning)",
    fontFamily: "var(--font-geist-sans)",
    fontFamilyButtons: "var(--font-geist-sans)",
    fontFamilyMono: "var(--font-geist-mono)",
    borderRadius: "0.75rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "w-full shadow-none",
    card: "w-full rounded-2xl border border-surface-border bg-surface p-8 shadow-2xl",
    headerTitle: "text-lg font-semibold text-copy-primary",
    headerSubtitle: "text-sm text-copy-muted",
    formFieldLabel: "text-sm font-medium text-copy-primary",
    formFieldInput: "rounded-lg border-surface-border bg-elevated text-copy-primary focus:border-brand",
    formButtonPrimary: "rounded-lg bg-brand py-3 font-semibold text-copy-on-brand hover:opacity-90",
    socialButtonsBlockButton: "rounded-lg border-surface-border bg-subtle text-copy-primary hover:bg-elevated",
    socialButtonsBlockButtonText: "text-sm font-medium text-copy-primary",
    footerActionLink: "font-medium text-brand hover:underline",
    dividerLine: "bg-surface-border",
    dividerText: "bg-surface px-2 text-xs uppercase text-copy-muted",
  },
};
