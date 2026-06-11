export type ThemeTemplateKey = string;
export type ThemeMode = 'light' | 'dark' | 'system';
export type ThemeTokenMap = Record<string, string>;

export interface ThemeTemplatePreset {
  key: ThemeTemplateKey;
  label: string;
  description: string;
  preview: string[];
  lightTokens: ThemeTokenMap;
  darkTokens: ThemeTokenMap;
  isSystem?: boolean;
}

export const DEFAULT_THEME_TEMPLATE_KEY: ThemeTemplateKey = 'padrao';

export const FALLBACK_THEME_TEMPLATES: ThemeTemplatePreset[] = [
  {
    key: 'padrao',
    label: 'Padrao',
    description: 'Paleta verde-escura com fundo claro analitico.',
    preview: ['#f6faf7', '#1f4d39', '#50b76f'],
    lightTokens: {
      background: '120 22% 97%',
      foreground: '146 18% 12%',
      card: '0 0% 100%',
      'card-foreground': '146 18% 12%',
      primary: '152 50% 23%',
      'primary-foreground': '0 0% 100%',
      secondary: '122 18% 93%',
      'secondary-foreground': '146 18% 12%',
      muted: '120 16% 94%',
      'muted-foreground': '145 10% 43%',
      accent: '142 54% 40%',
      'accent-foreground': '0 0% 100%',
      border: '127 16% 84%',
      input: '127 16% 84%',
      ring: '152 50% 23%',
      'sidebar-background': '145 30% 9%',
      'sidebar-foreground': '130 18% 84%',
      'sidebar-accent': '145 18% 16%',
      'sidebar-accent-foreground': '0 0% 100%',
      'sidebar-border': '145 22% 14%',
      'workspace-bg-a': '120 20% 97%',
      'workspace-bg-b': '116 24% 92%',
      'workspace-panel': '0 0% 100%',
      'workspace-panel-foreground': '146 18% 12%',
      'workspace-sidebar': '145 30% 9%',
      'workspace-sidebar-foreground': '130 18% 84%',
    },
    darkTokens: {
      background: '145 24% 7%',
      foreground: '120 18% 92%',
      card: '146 23% 11%',
      'card-foreground': '120 18% 92%',
      primary: '142 46% 45%',
      'primary-foreground': '0 0% 100%',
      secondary: '145 12% 17%',
      'secondary-foreground': '120 18% 88%',
      muted: '145 12% 16%',
      'muted-foreground': '130 8% 58%',
      accent: '37 92% 57%',
      'accent-foreground': '0 0% 100%',
      border: '145 10% 20%',
      input: '145 10% 20%',
      ring: '142 46% 45%',
      'sidebar-background': '145 30% 8%',
      'sidebar-foreground': '130 14% 82%',
      'sidebar-accent': '145 16% 15%',
      'sidebar-accent-foreground': '0 0% 100%',
      'sidebar-border': '145 14% 18%',
      'workspace-bg-a': '145 18% 10%',
      'workspace-bg-b': '146 20% 7%',
      'workspace-panel': '146 24% 10%',
      'workspace-panel-foreground': '120 18% 92%',
      'workspace-sidebar': '145 30% 8%',
      'workspace-sidebar-foreground': '130 14% 82%',
    },
    isSystem: true,
  },
  {
    key: 'cutie',
    label: 'Cutie',
    description: 'Paleta rosa/roxo com personalidade mais suave.',
    preview: ['#fff1f7', '#f062a8', '#9c6bff'],
    lightTokens: {
      background: '322 58% 97%',
      foreground: '292 20% 20%',
      card: '0 0% 100%',
      'card-foreground': '292 20% 20%',
      primary: '329 74% 62%',
      'primary-foreground': '0 0% 100%',
      secondary: '319 40% 93%',
      'secondary-foreground': '294 18% 26%',
      muted: '311 30% 94%',
      'muted-foreground': '295 10% 48%',
      accent: '272 78% 66%',
      'accent-foreground': '0 0% 100%',
      border: '310 20% 87%',
      input: '310 20% 87%',
      ring: '329 74% 62%',
      'sidebar-background': '287 30% 17%',
      'sidebar-foreground': '318 28% 90%',
      'sidebar-accent': '292 22% 24%',
      'sidebar-accent-foreground': '0 0% 100%',
      'sidebar-border': '290 18% 30%',
      'workspace-bg-a': '318 65% 95%',
      'workspace-bg-b': '274 45% 91%',
      'workspace-panel': '0 0% 100%',
      'workspace-panel-foreground': '292 20% 20%',
      'workspace-sidebar': '287 30% 17%',
      'workspace-sidebar-foreground': '318 28% 90%',
    },
    darkTokens: {
      background: '284 24% 11%',
      foreground: '319 30% 92%',
      card: '286 20% 13%',
      'card-foreground': '319 30% 92%',
      primary: '327 82% 68%',
      'primary-foreground': '286 22% 12%',
      secondary: '286 16% 18%',
      'secondary-foreground': '315 20% 88%',
      muted: '286 14% 18%',
      'muted-foreground': '295 10% 66%',
      accent: '269 80% 72%',
      'accent-foreground': '286 22% 12%',
      border: '286 12% 23%',
      input: '286 12% 23%',
      ring: '327 82% 68%',
      'sidebar-background': '284 27% 9%',
      'sidebar-foreground': '317 26% 88%',
      'sidebar-accent': '286 18% 15%',
      'sidebar-accent-foreground': '316 28% 92%',
      'sidebar-border': '286 12% 20%',
      'workspace-bg-a': '288 18% 13%',
      'workspace-bg-b': '277 16% 10%',
      'workspace-panel': '286 20% 13%',
      'workspace-panel-foreground': '319 30% 92%',
      'workspace-sidebar': '284 27% 9%',
      'workspace-sidebar-foreground': '317 26% 88%',
    },
    isSystem: true,
  },
  {
    key: 'minimalista',
    label: 'Minimalista',
    description: 'Escala neutra (cinza, branco e preto).',
    preview: ['#f5f5f5', '#9a9a9a', '#1c1c1c'],
    lightTokens: {
      background: '0 0% 97%',
      foreground: '0 0% 12%',
      card: '0 0% 100%',
      'card-foreground': '0 0% 12%',
      primary: '0 0% 18%',
      'primary-foreground': '0 0% 100%',
      secondary: '0 0% 93%',
      'secondary-foreground': '0 0% 20%',
      muted: '0 0% 94%',
      'muted-foreground': '0 0% 42%',
      accent: '0 0% 35%',
      'accent-foreground': '0 0% 100%',
      border: '0 0% 86%',
      input: '0 0% 86%',
      ring: '0 0% 18%',
      'sidebar-background': '0 0% 12%',
      'sidebar-foreground': '0 0% 88%',
      'sidebar-accent': '0 0% 20%',
      'sidebar-accent-foreground': '0 0% 98%',
      'sidebar-border': '0 0% 24%',
      'workspace-bg-a': '0 0% 95%',
      'workspace-bg-b': '0 0% 90%',
      'workspace-panel': '0 0% 100%',
      'workspace-panel-foreground': '0 0% 12%',
      'workspace-sidebar': '0 0% 12%',
      'workspace-sidebar-foreground': '0 0% 88%',
    },
    darkTokens: {
      background: '0 0% 8%',
      foreground: '0 0% 92%',
      card: '0 0% 10%',
      'card-foreground': '0 0% 92%',
      primary: '0 0% 90%',
      'primary-foreground': '0 0% 10%',
      secondary: '0 0% 16%',
      'secondary-foreground': '0 0% 88%',
      muted: '0 0% 15%',
      'muted-foreground': '0 0% 64%',
      accent: '0 0% 74%',
      'accent-foreground': '0 0% 12%',
      border: '0 0% 22%',
      input: '0 0% 22%',
      ring: '0 0% 82%',
      'sidebar-background': '0 0% 6%',
      'sidebar-foreground': '0 0% 84%',
      'sidebar-accent': '0 0% 14%',
      'sidebar-accent-foreground': '0 0% 92%',
      'sidebar-border': '0 0% 18%',
      'workspace-bg-a': '0 0% 12%',
      'workspace-bg-b': '0 0% 9%',
      'workspace-panel': '0 0% 10%',
      'workspace-panel-foreground': '0 0% 92%',
      'workspace-sidebar': '0 0% 6%',
      'workspace-sidebar-foreground': '0 0% 84%',
    },
    isSystem: true,
  },
];

export const FALLBACK_THEME_TEMPLATE_MAP = FALLBACK_THEME_TEMPLATES.reduce<Record<ThemeTemplateKey, ThemeTemplatePreset>>(
  (acc, template) => {
    acc[template.key] = template;
    return acc;
  },
  {},
);

export const THEME_MODE_LABELS: Record<ThemeMode, string> = {
  light: 'Claro',
  dark: 'Escuro',
  system: 'Sistema',
};

export function createUserTemplateKey(name: string): string {
  const normalized = name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32);

  const safeBase = normalized || 'tema';
  const suffix = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  return `${safeBase}-${suffix}`;
}
