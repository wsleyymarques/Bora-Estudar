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
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { useAuth } from '@/contexts/AuthContext';
import {
  DEFAULT_THEME_TEMPLATE_KEY,
  FALLBACK_THEME_TEMPLATES,
  ThemeMode,
  ThemeTemplateKey,
  ThemeTemplatePreset,
  ThemeTokenMap,
  createUserTemplateKey,
} from '@/theme/presets';

interface CreateThemeTemplateInput {
  name: string;
  description?: string;
  baseTemplateKey: ThemeTemplateKey;
}

interface AppThemeContextType {
  templateKey: ThemeTemplateKey;
  mode: ThemeMode;
  templates: ThemeTemplatePreset[];
  selectedTemplate: ThemeTemplatePreset;
  templatesLoading: boolean;
  setTemplateKey: (key: ThemeTemplateKey) => Promise<void>;
  setMode: (mode: ThemeMode) => Promise<void>;
  createTemplate: (input: CreateThemeTemplateInput) => Promise<ThemeTemplatePreset | null>;
  refreshTemplates: () => Promise<void>;
}

const AppThemeContext = createContext<AppThemeContextType | undefined>(undefined);

type ThemeTemplateRow = Tables<'theme_templates'>;

function toTokenMap(value: unknown): ThemeTokenMap {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};

  return Object.entries(value as Record<string, unknown>).reduce<ThemeTokenMap>((acc, [key, tokenValue]) => {
    if (typeof tokenValue === 'string') acc[key] = tokenValue;
    return acc;
  }, {});
}

function mapTemplateRow(row: ThemeTemplateRow): ThemeTemplatePreset {
  return {
    key: row.key,
    label: row.name,
    description: row.description ?? '',
    preview: row.preview_colors ?? [],
    lightTokens: toTokenMap(row.light_tokens),
    darkTokens: toTokenMap(row.dark_tokens),
    isSystem: row.is_system,
  };
}

function sortTemplates(templates: ThemeTemplatePreset[]) {
  return [...templates].sort((a, b) => {
    if (Boolean(a.isSystem) !== Boolean(b.isSystem)) {
      return a.isSystem ? -1 : 1;
    }
    return a.label.localeCompare(b.label, 'pt-BR');
  });
}

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { setTheme, resolvedTheme } = useTheme();

  const [templateKey, setTemplateKeyState] = useState<ThemeTemplateKey>(DEFAULT_THEME_TEMPLATE_KEY);
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [templates, setTemplates] = useState<ThemeTemplatePreset[]>(FALLBACK_THEME_TEMPLATES);
  const [templatesLoading, setTemplatesLoading] = useState(true);

  const appliedTokenKeysRef = useRef<string[]>([]);

  const persist = useCallback(
    async (nextTemplate: ThemeTemplateKey, nextMode: ThemeMode) => {
      if (!user) return;

      const { error } = await supabase.from('user_theme_preferences').upsert(
        {
          user_id: user.id,
          template_key: nextTemplate,
          mode: nextMode,
        },
        { onConflict: 'user_id' },
      );

      if (error) {
        console.error('Erro ao salvar tema do usuario', error);
      }
    },
    [user],
  );

  const refreshTemplates = useCallback(async () => {
    setTemplatesLoading(true);

    const { data, error } = await supabase
      .from('theme_templates')
      .select('*')
      .order('is_system', { ascending: false })
      .order('name', { ascending: true });

    if (error) {
      console.error('Erro ao carregar templates de tema', error);
      setTemplates(FALLBACK_THEME_TEMPLATES);
      setTemplatesLoading(false);
      return;
    }

    const mapped = (data ?? []).map(mapTemplateRow);
    setTemplates(mapped.length > 0 ? sortTemplates(mapped) : FALLBACK_THEME_TEMPLATES);
    setTemplatesLoading(false);
  }, []);

  useEffect(() => {
    void refreshTemplates();
  }, [refreshTemplates, user?.id]);

  useEffect(() => {
    if (!user) {
      setTemplateKeyState(DEFAULT_THEME_TEMPLATE_KEY);
      setModeState('system');
      return;
    }

    let active = true;

    supabase
      .from('user_theme_preferences')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) return;

        if (error) {
          console.error('Erro ao carregar tema do usuario', error);
          return;
        }

        if (data?.template_key) setTemplateKeyState(data.template_key);
        if (data?.mode) setModeState(data.mode as ThemeMode);
      });

    return () => {
      active = false;
    };
  }, [user]);

  useEffect(() => {
    if (templatesLoading) return;
    if (templates.some((template) => template.key === templateKey)) return;

    const fallbackTemplate =
      templates.find((template) => template.key === DEFAULT_THEME_TEMPLATE_KEY) ?? templates[0] ?? FALLBACK_THEME_TEMPLATES[0];

    if (!fallbackTemplate) return;

    setTemplateKeyState(fallbackTemplate.key);
    void persist(fallbackTemplate.key, mode);
  }, [templatesLoading, templates, templateKey, mode, persist]);

  useEffect(() => {
    setTheme(mode);
  }, [mode, setTheme]);

  const selectedTemplate = useMemo(
    () =>
      templates.find((template) => template.key === templateKey) ??
      templates.find((template) => template.key === DEFAULT_THEME_TEMPLATE_KEY) ??
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

  const setTemplateKey = useCallback(
    async (key: ThemeTemplateKey) => {
      setTemplateKeyState(key);
      await persist(key, mode);
    },
    [mode, persist],
  );

  const setMode = useCallback(
    async (nextMode: ThemeMode) => {
      setModeState(nextMode);
      await persist(templateKey, nextMode);
    },
    [templateKey, persist],
  );

  const createTemplate = useCallback(
    async ({ name, description, baseTemplateKey }: CreateThemeTemplateInput) => {
      if (!user) {
        throw new Error('Voce precisa estar autenticado para criar templates.');
      }

      const trimmedName = name.trim();
      if (!trimmedName) {
        throw new Error('Informe um nome para o template.');
      }

      const baseTemplate =
        templates.find((template) => template.key === baseTemplateKey) ??
        templates.find((template) => template.key === DEFAULT_THEME_TEMPLATE_KEY) ??
        FALLBACK_THEME_TEMPLATES[0];

      const templateKeyCandidate = createUserTemplateKey(trimmedName);

      const { data, error } = await supabase
        .from('theme_templates')
        .insert({
          key: templateKeyCandidate,
          name: trimmedName,
          description: description?.trim() || null,
          is_system: false,
          owner_user_id: user.id,
          preview_colors: baseTemplate.preview,
          light_tokens: baseTemplate.lightTokens,
          dark_tokens: baseTemplate.darkTokens,
        })
        .select('*')
        .single();

      if (error) {
        console.error('Erro ao criar template personalizado', error);
        throw new Error('Nao foi possivel criar o template personalizado.');
      }

      const createdTemplate = mapTemplateRow(data);
      setTemplates((prev) => sortTemplates([...prev, createdTemplate]));
      await setTemplateKey(createdTemplate.key);
      return createdTemplate;
    },
    [templates, user, setTemplateKey],
  );

  const value = useMemo(
    () => ({
      templateKey,
      mode,
      templates,
      selectedTemplate,
      templatesLoading,
      setTemplateKey,
      setMode,
      createTemplate,
      refreshTemplates,
    }),
    [templateKey, mode, templates, selectedTemplate, templatesLoading, setTemplateKey, setMode, createTemplate, refreshTemplates],
  );

  return <AppThemeContext.Provider value={value}>{children}</AppThemeContext.Provider>;
}

export function useAppTheme() {
  const ctx = useContext(AppThemeContext);
  if (!ctx) throw new Error('useAppTheme must be used within AppThemeProvider');
  return ctx;
}
