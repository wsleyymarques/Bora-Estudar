import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { LogOut, Palette, User } from 'lucide-react';
import { useAppTheme } from '@/contexts/AppThemeContext';
import { DEFAULT_THEME_TEMPLATE_KEY, THEME_MODE_LABELS, ThemeMode, ThemeTemplateKey } from '@/theme/presets';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const {
    templateKey,
    mode,
    templates,
    selectedTemplate,
    templatesLoading,
    setTemplateKey,
    setMode,
    createTemplate,
  } = useAppTheme();

  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateDescription, setNewTemplateDescription] = useState('');
  const [baseTemplateKey, setBaseTemplateKey] = useState<ThemeTemplateKey>(DEFAULT_THEME_TEMPLATE_KEY);
  const [creatingTemplate, setCreatingTemplate] = useState(false);

  const hasTemplates = templates.length > 0;

  const baseTemplateOptions = useMemo(
    () => templates.map((template) => ({ value: template.key, label: template.label })),
    [templates],
  );

  useEffect(() => {
    if (!hasTemplates) return;
    if (templates.some((template) => template.key === baseTemplateKey)) return;
    setBaseTemplateKey(templates[0].key);
  }, [hasTemplates, templates, baseTemplateKey]);

  const handleCreateTemplate = async () => {
    if (!newTemplateName.trim()) {
      toast.error('Informe um nome para o template.');
      return;
    }

    setCreatingTemplate(true);

    try {
      const created = await createTemplate({
        name: newTemplateName,
        description: newTemplateDescription,
        baseTemplateKey,
      });

      if (created) {
        toast.success(`Template "${created.label}" criado e aplicado.`);
        setNewTemplateName('');
        setNewTemplateDescription('');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao criar template.');
    } finally {
      setCreatingTemplate(false);
    }
  };

  return (
    <div className="space-y-6 w-full max-w-none">
      <h1 className="text-2xl font-display font-bold text-foreground">Configuracoes</h1>

      <div className="glass-card p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="w-6 h-6 text-primary" />
          </div>
          <div>
            <p className="font-medium text-foreground">{user?.email?.split('@')[0]}</p>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
        </div>
      </div>

      <div className="glass-card p-5 space-y-4">
        <h3 className="font-display font-semibold text-sm">Tema Visual</h3>
        <p className="text-sm text-muted-foreground">
          Os templates sao carregados do banco e todas as cores da interface herdam do template ativo.
        </p>

        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Template de cores</p>
          <Select
            value={templateKey}
            onValueChange={(value) => void setTemplateKey(value)}
            disabled={!hasTemplates || templatesLoading}
          >
            <SelectTrigger>
              <SelectValue placeholder={templatesLoading ? 'Carregando templates...' : 'Selecione um template'} />
            </SelectTrigger>
            <SelectContent>
              {templates.map((template) => (
                <SelectItem key={template.key} value={template.key}>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      {template.preview.slice(0, 3).map((color) => (
                        <span
                          key={`${template.key}-${color}`}
                          className="w-2.5 h-2.5 rounded-full border border-border/70"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                    <span>{template.label}</span>
                    <Badge variant="outline" className="ml-1 h-5 px-1.5 text-[10px] leading-none">
                      {template.isSystem ? 'Sistema' : 'Meu'}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">{selectedTemplate.description || 'Sem descricao.'}</p>
        </div>

        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Modo</p>
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(THEME_MODE_LABELS) as ThemeMode[]).map((modeOption) => (
              <button
                key={modeOption}
                type="button"
                onClick={() => void setMode(modeOption)}
                className={`h-9 rounded-lg text-xs font-semibold border transition-colors ${
                  mode === modeOption
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background text-muted-foreground border-border hover:text-foreground'
                }`}
              >
                {THEME_MODE_LABELS[modeOption]}
              </button>
            ))}
          </div>
        </div>

        <div className="pt-2 border-t border-border/60 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Palette className="w-4 h-4" />
            Criar template personalizado
          </div>
          <p className="text-xs text-muted-foreground">
            O novo template nasce como copia de um template base e pode evoluir depois sem impactar os templates padrao.
          </p>

          <div className="grid gap-2">
            <Input
              value={newTemplateName}
              onChange={(event) => setNewTemplateName(event.target.value)}
              placeholder="Nome do template"
              maxLength={60}
            />
            <Textarea
              value={newTemplateDescription}
              onChange={(event) => setNewTemplateDescription(event.target.value)}
              placeholder="Descricao opcional"
              rows={2}
              maxLength={180}
            />
            <Select value={baseTemplateKey} onValueChange={(value) => setBaseTemplateKey(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Template base" />
              </SelectTrigger>
              <SelectContent>
                {baseTemplateOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button onClick={handleCreateTemplate} disabled={creatingTemplate || templatesLoading} className="w-full">
            {creatingTemplate ? 'Criando template...' : 'Criar template'}
          </Button>
        </div>
      </div>

      <div className="glass-card p-5 space-y-4">
        <h3 className="font-display font-semibold text-sm">Sobre</h3>
        <p className="text-sm text-muted-foreground">
          StudyFlow e um sistema de planejamento e acompanhamento de estudos.
          Organize materias, acompanhe progresso e alcance objetivos.
        </p>
        <p className="text-xs text-muted-foreground">Versao 1.0.0</p>
      </div>

      <Button variant="outline" onClick={logout} className="w-full">
        <LogOut className="w-4 h-4 mr-2" /> Sair da conta
      </Button>
    </div>
  );
}
