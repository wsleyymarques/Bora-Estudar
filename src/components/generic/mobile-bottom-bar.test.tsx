import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MobileBottomBar } from '@/components/generic/mobile-bottom-bar';

describe('MobileBottomBar', () => {
  it('renderiza links principais de navegacao', () => {
    render(
      <MemoryRouter initialEntries={['/schedule']}>
        <MobileBottomBar />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: /Inicio/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Materias/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Cronograma/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Timer/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Config/i })).toBeInTheDocument();
  });
});

