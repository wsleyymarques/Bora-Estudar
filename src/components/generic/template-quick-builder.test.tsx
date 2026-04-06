import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { TemplateQuickBuilder } from '@/components/generic/template-quick-builder';

const onGenerate = vi.fn();
const onDuplicateDay = vi.fn();

describe('TemplateQuickBuilder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('gera semana com payload rapido', async () => {
    onGenerate.mockResolvedValue(undefined);

    render(
      <TemplateQuickBuilder
        dayNames={['Segunda', 'Terca', 'Quarta', 'Quinta', 'Sexta', 'Sabado', 'Domingo']}
        subjects={[
          { id: 's1', name: 'Matematica', color: '#6B9BD2' },
          { id: 's2', name: 'Portugues', color: '#E8A838' },
        ]}
        onGenerate={onGenerate}
        onDuplicateDay={onDuplicateDay}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Matematica/i }));
    fireEvent.click(screen.getByRole('button', { name: /Gerar semana rapidamente/i }));

    await waitFor(() => {
      expect(onGenerate).toHaveBeenCalledTimes(1);
    });

    const payload = onGenerate.mock.calls[0][0];
    expect(payload.selectedSubjectIds).toEqual(['s1']);
    expect(payload.selectedDays).toEqual([0, 1, 2, 3, 4]);
    expect(payload.intervalMinutes).toBe(90);
    expect(payload.replaceDays).toBe(true);
  });

  it('duplica dia com acao rapida', async () => {
    onDuplicateDay.mockResolvedValue(undefined);

    render(
      <TemplateQuickBuilder
        dayNames={['Segunda', 'Terca', 'Quarta', 'Quinta', 'Sexta', 'Sabado', 'Domingo']}
        subjects={[{ id: 's1', name: 'Matematica', color: '#6B9BD2' }]}
        onGenerate={onGenerate}
        onDuplicateDay={onDuplicateDay}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Duplicar/i }));

    await waitFor(() => {
      expect(onDuplicateDay).toHaveBeenCalledWith(0, 1);
    });
  });
});

