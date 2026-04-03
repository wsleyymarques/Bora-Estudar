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
    description: 'Paleta azul/verde com fundo claro limpo.',
    preview: ['#f7fbff', '#2f6fe4', '#33a07f'],
    lightTokens: {
      background: '210 45% 98%',
      foreground: '220 24% 16%',
      card: '0 0% 100%',
      'card-foreground': '220 24% 16%',
      primary: '212 73% 48%',
      'primary-foreground': '0 0% 100%',
      secondary: '210 26% 94%',
      'secondary-foreground': '220 22% 22%',
      muted: '210 24% 95%',
      'muted-foreground': '220 10% 46%',
      accent: '158 45% 42%',
      'accent-foreground': '0 0% 100%',
      border: '210 20% 88%',
      input: '210 20% 88%',
      ring: '212 73% 48%',
      'sidebar-background': '215 30% 14%',
      'sidebar-foreground': '210 20% 88%',
      'sidebar-accent': '215 22% 20%',
      'sidebar-accent-foreground': '0 0% 100%',
      'sidebar-border': '215 18% 26%',
      'workspace-bg-a': '210 50% 97%',
      'workspace-bg-b': '197 36% 92%',
      'workspace-panel': '0 0% 100%',
      'workspace-panel-foreground': '220 24% 16%',
      'workspace-sidebar': '215 30% 14%',
      'workspace-sidebar-foreground': '210 20% 88%',
    },
    darkTokens: {
      background: '222 28% 11%',
      foreground: '210 25% 92%',
      card: '223 24% 13%',
      'card-foreground': '210 25% 92%',
      primary: '212 78% 62%',
      'primary-foreground': '222 35% 10%',
      secondary: '222 16% 18%',
      'secondary-foreground': '210 20% 88%',
      muted: '222 14% 18%',
      'muted-foreground': '215 12% 64%',
      accent: '158 50% 48%',
      'accent-foreground': '222 35% 10%',
      border: '222 12% 24%',
      input: '222 12% 24%',
      ring: '212 78% 62%',
      'sidebar-background': '222 33% 10%',
      'sidebar-foreground': '210 18% 86%',
      'sidebar-accent': '221 20% 16%',
      'sidebar-accent-foreground': '210 20% 92%',
      'sidebar-border': '222 14% 22%',
      'workspace-bg-a': '223 20% 13%',
      'workspace-bg-b': '213 18% 10%',
      'workspace-panel': '223 22% 13%',
      'workspace-panel-foreground': '210 24% 92%',
      'workspace-sidebar': '222 33% 10%',
      'workspace-sidebar-foreground': '210 18% 86%',
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
