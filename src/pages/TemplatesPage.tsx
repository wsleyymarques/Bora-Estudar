import React from 'react';
import TemplateEditor from '@/components/schedule/TemplateEditor';
import ApplyTemplateDialog from '@/components/schedule/ApplyTemplateDialog';

export default function TemplatesPage() {
  const [applyTemplateId, setApplyTemplateId] = React.useState<string>('');
  const [applyOpen, setApplyOpen] = React.useState(false);

  const openApply = (templateId: string) => {
    setApplyTemplateId(templateId);
    setApplyOpen(true);
  };

  return (
    <div className="space-y-5">
      <div className="workspace-panel p-4 sm:p-5">
        <h1 className="text-2xl font-display font-bold text-foreground">Templates</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Crie, edite, duplique e aplique templates de estudo em poucos passos.
        </p>
      </div>

      <TemplateEditor onApply={openApply} />

      {applyTemplateId ? (
        <ApplyTemplateDialog
          open={applyOpen}
          onOpenChange={setApplyOpen}
          templateId={applyTemplateId}
          templateName="Template selecionado"
        />
      ) : null}
    </div>
  );
}
