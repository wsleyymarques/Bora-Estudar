import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useTheme } from 'next-themes';
import {
  DEFAULT_THEME_TEMPLATE_KEY,
  FALLBACK_THEME_TEMPLATES,
  ThemeMode,
  ThemeTemplateKey,
  ThemeTemplatePreset,
} from '@/theme/presets';

interface AppThemeContextType {
  templateKey: ThemeTemplateKey;
  mode: ThemeMode;
  templates: ThemeTemplatePreset[];
  selectedTemplate: ThemeTemplatePreset;
  templatesLoading: boolean;
  setTemplateKey: (key: ThemeTemplateKey) => Promise<void>;
  setMode: (mode: ThemeMode) => Promise<void>;
  refreshTemplates: () => Promise<void>;
}

const AppThemeContext = createContext<AppThemeContextType | undefined>(undefined);

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const { setTheme, resolvedTheme } = useTheme();

  const [templateKey, setTemplateKeyState] = useState<ThemeTemplateKey>(DEFAULT_THEME_TEMPLATE_KEY);
  const [mode, setModeState] = useState<ThemeMode>('system');
  const templates = FALLBACK_THEME_TEMPLATES;
  const templatesLoading = false;

  const appliedTokenKeysRef = useRef<string[]>([]);

  const refreshTemplates = useCallback(async () => {}, []);

  useEffect(() => {
    setTheme(mode);
  }, [mode, setTheme]);

  const selectedTemplate = useMemo(
    () =>
      templates.find((t) => t.key === templateKey) ??
      templates.find((t) => t.key === DEFAULT_THEME_TEMPLATE_KEY) ??
      FALLBACK_THEME_TEMPLATES[0],
    [templates, templateKey],
  );

  useEffect(() => {
    if (!selectedTemplate) return;

    const root = document.documentElement;
    root.setAttribute('data-theme-template', selectedTemplate.key);

    const effectiveMode = resolvedTheme === 'dark' ? 'dark' : 'light';
    const tokens = effectiveMode === 'dark' ? selectedTemplate.darkTokens : selectedTemplate.lightTokens;

    for (const oldKey of appliedTokenKeysRef.current) {
      root.style.removeProperty(`--${oldKey}`);
    }

    for (const [tokenKey, tokenValue] of Object.entries(tokens)) {
      root.style.setProperty(`--${tokenKey}`, tokenValue);
    }

    appliedTokenKeysRef.current = Object.keys(tokens);
  }, [selectedTemplate, resolvedTheme]);

  const setTemplateKey = useCallback(async (key: ThemeTemplateKey) => {
    setTemplateKeyState(key);
  }, []);

  const setMode = useCallback(async (nextMode: ThemeMode) => {
    setModeState(nextMode);
  }, []);

  const value = useMemo(
    () => ({
      templateKey,
      mode,
      templates,
      selectedTemplate,
      templatesLoading,
      setTemplateKey,
      setMode,
      refreshTemplates,
    }),
    [templateKey, mode, templates, selectedTemplate, templatesLoading, setTemplateKey, setMode, refreshTemplates],
  );

  return <AppThemeContext.Provider value={value}>{children}</AppThemeContext.Provider>;
}

export function useAppTheme() {
  const ctx = useContext(AppThemeContext);
  if (!ctx) throw new Error('useAppTheme must be used within AppThemeProvider');
  return ctx;
}
