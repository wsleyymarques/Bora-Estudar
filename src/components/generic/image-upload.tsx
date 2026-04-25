import React, { ChangeEvent, useMemo, useRef, useState } from 'react';
import { ImagePlus, Loader2, Trash2, UploadCloud } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const DEFAULT_ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const DEFAULT_MAX_SIZE_MB = 5;

type ImageUploadVariant = 'card' | 'compact';

interface ImageUploadProps {
  value?: string;
  onChange: (url: string) => void;
  bucket?: string;
  folder?: string;
  label?: string;
  helperText?: string;
  placeholder?: string;
  disabled?: boolean;
  maxSizeMb?: number;
  acceptedTypes?: string[];
  variant?: ImageUploadVariant;
  className?: string;
}

function getFileExtension(file: File) {
  const extension = file.name.split('.').pop()?.toLowerCase();

  if (extension) return extension;
  if (file.type === 'image/png') return 'png';
  if (file.type === 'image/webp') return 'webp';
  if (file.type === 'image/gif') return 'gif';

  return 'jpg';
}

function sanitizeFolder(folder: string) {
  return folder.replace(/^\/+|\/+$/g, '');
}

export function ImageUpload({
  value,
  onChange,
  bucket = 'study-plan-images',
  folder = 'uploads',
  label = 'Imagem',
  helperText = 'Envie uma imagem do seu computador ou informe uma URL externa.',
  placeholder = 'https://...',
  disabled = false,
  maxSizeMb = DEFAULT_MAX_SIZE_MB,
  acceptedTypes = DEFAULT_ACCEPTED_TYPES,
  variant = 'card',
  className,
}: ImageUploadProps) {
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);

  const accept = useMemo(() => acceptedTypes.join(','), [acceptedTypes]);
  const maxSizeBytes = maxSizeMb * 1024 * 1024;

  const handleUploadClick = () => {
    if (disabled || uploading) return;
    inputRef.current?.click();
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) return;

    if (!acceptedTypes.includes(file.type)) {
      toast.error('Formato de imagem inválido. Use JPG, PNG, WEBP ou GIF.');
      return;
    }

    if (file.size > maxSizeBytes) {
      toast.error(`A imagem deve ter no máximo ${maxSizeMb} MB.`);
      return;
    }

    if (!user) {
      toast.error('Você precisa estar logado para enviar imagens.');
      return;
    }

    setUploading(true);

    try {
      const extension = getFileExtension(file);
      const safeFolder = sanitizeFolder(folder);
      const filePath = `${user.id}/${safeFolder}/${crypto.randomUUID()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type,
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);

      onChange(data.publicUrl);
      toast.success('Imagem enviada com sucesso.');
    } catch (error) {
      console.error(error);
      toast.error('Não foi possível enviar a imagem. Verifique se o bucket existe no Supabase.');
    } finally {
      setUploading(false);
    }
  };

  const clearImage = () => {
    onChange('');
  };

  return (
    <div className={cn('grid gap-2', className)}>
      <Label>{label}</Label>

      <div
        className={cn(
          'overflow-hidden rounded-xl border border-border/80 bg-background/70',
          variant === 'compact' ? 'p-3' : 'p-4',
        )}
      >
        {value ? (
          <div className="mb-3 overflow-hidden rounded-lg border border-border bg-muted">
            <img src={value} alt="Pré-visualização da imagem" className="h-36 w-full object-cover" />
          </div>
        ) : (
          <button
            type="button"
            onClick={handleUploadClick}
            disabled={disabled || uploading}
            className="mb-3 flex h-36 w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/40 text-muted-foreground transition hover:bg-muted/70 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {uploading ? <Loader2 className="h-7 w-7 animate-spin" /> : <ImagePlus className="h-7 w-7" />}
            <span className="text-sm font-medium">Clique para fazer upload</span>
            <span className="text-xs">JPG, PNG, WEBP ou GIF até {maxSizeMb} MB</span>
          </button>
        )}

        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
          <Input
            value={value || ''}
            onChange={(event) => onChange(event.target.value)}
            placeholder={placeholder}
            disabled={disabled || uploading}
          />
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={handleUploadClick} disabled={disabled || uploading}>
              {uploading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-1.5 h-4 w-4" />}
              Upload
            </Button>
            {value ? (
              <Button type="button" variant="outline" onClick={clearImage} disabled={disabled || uploading}>
                <Trash2 className="h-4 w-4" />
              </Button>
            ) : null}
          </div>
        </div>

        {helperText ? <p className="mt-2 text-xs text-muted-foreground">{helperText}</p> : null}
      </div>

      <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={handleFileChange} />
    </div>
  );
}
