import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PomodoroQuickSettings } from '@/components/generic/pomodoro-quick-settings';

const setSettings = vi.fn();

describe('PomodoroQuickSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('permite editar minutos de foco', () => {
    render(
      <PomodoroQuickSettings
        settings={{
          focusMinutes: 25,
          shortBreakMinutes: 5,
          longBreakMinutes: 15,
          longBreakEvery: 4,
          autoStartBreak: false,
          autoStartFocus: false,
        }}
        onChange={setSettings}
      />,
    );

    fireEvent.change(screen.getByLabelText(/Foco \(min\)/i), { target: { value: '30' } });

    expect(setSettings).toHaveBeenCalled();
  });

  it('aplica preset e restaura padrao', () => {
    render(
      <PomodoroQuickSettings
        settings={{
          focusMinutes: 25,
          shortBreakMinutes: 5,
          longBreakMinutes: 15,
          longBreakEvery: 4,
          autoStartBreak: false,
          autoStartFocus: false,
        }}
        onChange={setSettings}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Foco 50\/10/i }));
    fireEvent.click(screen.getByRole('button', { name: /Padrao/i }));

    expect(setSettings).toHaveBeenCalledTimes(2);
  });
});

