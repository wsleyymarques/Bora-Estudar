/**
 * Catálogo global de matérias pré-definidas.
 * 
 * - Categoria = agrupamento amplo (Direito, Exatas, Humanas, etc.)
 * - Matéria = disciplina real como aparece em edital/vestibular
 *   (ex: "Direito Constitucional", "Matemática", "Legislação Especial")
 */

export interface SubjectSeed {
  name: string;
  category: string;
  color: string;
}

export interface SubjectCategory {
  name: string;
  emoji: string;
  color: string;
  subjects: SubjectSeed[];
}

export const SUBJECT_CATALOG: SubjectCategory[] = [
  {
    name: 'Direito',
    emoji: '⚖️',
    color: '#6366F1',
    subjects: [
      { name: 'Direito Constitucional', category: 'Direito', color: '#6366F1' },
      { name: 'Direito Administrativo', category: 'Direito', color: '#818CF8' },
      { name: 'Direito Penal', category: 'Direito', color: '#EF4444' },
      { name: 'Direito Processual Penal', category: 'Direito', color: '#F97316' },
      { name: 'Direito Civil', category: 'Direito', color: '#14B8A6' },
      { name: 'Direito Processual Civil', category: 'Direito', color: '#0EA5E9' },
      { name: 'Direito do Trabalho', category: 'Direito', color: '#F59E0B' },
      { name: 'Direito Processual do Trabalho', category: 'Direito', color: '#FBBF24' },
      { name: 'Direito Tributário', category: 'Direito', color: '#10B981' },
      { name: 'Direito Empresarial', category: 'Direito', color: '#8B5CF6' },
      { name: 'Direito Ambiental', category: 'Direito', color: '#22C55E' },
      { name: 'Direito Eleitoral', category: 'Direito', color: '#3B82F6' },
      { name: 'Direito Previdenciário', category: 'Direito', color: '#A78BFA' },
      { name: 'Direito Internacional', category: 'Direito', color: '#06B6D4' },
      { name: 'Direitos Humanos', category: 'Direito', color: '#E11D48' },
      { name: 'Direito do Consumidor', category: 'Direito', color: '#D946EF' },
      { name: 'Direito Financeiro', category: 'Direito', color: '#059669' },
      { name: 'Direito Digital', category: 'Direito', color: '#7C3AED' },
      { name: 'Legislação Especial', category: 'Direito', color: '#FB7185' },
      { name: 'Criminologia', category: 'Direito', color: '#1D4ED8' },
      { name: 'Medicina Legal', category: 'Direito', color: '#60A5FA' },
    ],
  },
  {
    name: 'Linguagens',
    emoji: '📝',
    color: '#EC4899',
    subjects: [
      { name: 'Língua Portuguesa', category: 'Linguagens', color: '#EC4899' },
      { name: 'Redação', category: 'Linguagens', color: '#F472B6' },
      { name: 'Redação Oficial', category: 'Linguagens', color: '#F9A8D4' },
      { name: 'Inglês', category: 'Linguagens', color: '#7C3AED' },
      { name: 'Espanhol', category: 'Linguagens', color: '#8B5CF6' },
      { name: 'Literatura', category: 'Linguagens', color: '#A78BFA' },
    ],
  },
  {
    name: 'Exatas',
    emoji: '🧮',
    color: '#06B6D4',
    subjects: [
      { name: 'Matemática', category: 'Exatas', color: '#06B6D4' },
      { name: 'Raciocínio Lógico', category: 'Exatas', color: '#0EA5E9' },
      { name: 'Matemática Financeira', category: 'Exatas', color: '#22D3EE' },
      { name: 'Estatística', category: 'Exatas', color: '#38BDF8' },
      { name: 'Física', category: 'Exatas', color: '#3B82F6' },
      { name: 'Química', category: 'Exatas', color: '#2563EB' },
      { name: 'Contabilidade', category: 'Exatas', color: '#059669' },
    ],
  },
  {
    name: 'Humanas',
    emoji: '🌍',
    color: '#F59E0B',
    subjects: [
      { name: 'História', category: 'Humanas', color: '#F59E0B' },
      { name: 'Geografia', category: 'Humanas', color: '#84CC16' },
      { name: 'Filosofia', category: 'Humanas', color: '#D946EF' },
      { name: 'Sociologia', category: 'Humanas', color: '#E879F9' },
      { name: 'Atualidades', category: 'Humanas', color: '#FCD34D' },
      { name: 'Geopolítica', category: 'Humanas', color: '#BEF264' },
    ],
  },
  {
    name: 'Ciências da Natureza',
    emoji: '🔬',
    color: '#22C55E',
    subjects: [
      { name: 'Biologia', category: 'Ciências da Natureza', color: '#22C55E' },
      { name: 'Ecologia', category: 'Ciências da Natureza', color: '#4ADE80' },
    ],
  },
  {
    name: 'Administração',
    emoji: '📊',
    color: '#0891B2',
    subjects: [
      { name: 'Administração Geral', category: 'Administração', color: '#0891B2' },
      { name: 'Administração Pública', category: 'Administração', color: '#06B6D4' },
      { name: 'Gestão de Pessoas', category: 'Administração', color: '#22D3EE' },
      { name: 'Gestão de Projetos', category: 'Administração', color: '#67E8F9' },
      { name: 'Arquivologia', category: 'Administração', color: '#0E7490' },
      { name: 'Orçamento Público (AFO)', category: 'Administração', color: '#155E75' },
      { name: 'Economia', category: 'Administração', color: '#164E63' },
      { name: 'Auditoria', category: 'Administração', color: '#083344' },
    ],
  },
  {
    name: 'Informática',
    emoji: '💻',
    color: '#64748B',
    subjects: [
      { name: 'Informática', category: 'Informática', color: '#64748B' },
      { name: 'Segurança da Informação', category: 'Informática', color: '#94A3B8' },
      { name: 'Redes de Computadores', category: 'Informática', color: '#475569' },
      { name: 'Banco de Dados', category: 'Informática', color: '#334155' },
      { name: 'Programação', category: 'Informática', color: '#1E293B' },
      { name: 'Governança de TI', category: 'Informática', color: '#CBD5E1' },
    ],
  },
  {
    name: 'Policial e Segurança',
    emoji: '🛡️',
    color: '#1D4ED8',
    subjects: [
      { name: 'Legislação Policial', category: 'Policial e Segurança', color: '#1D4ED8' },
      { name: 'Investigação Criminal', category: 'Policial e Segurança', color: '#2563EB' },
      { name: 'Inteligência Policial', category: 'Policial e Segurança', color: '#3B82F6' },
      { name: 'Uso da Força', category: 'Policial e Segurança', color: '#60A5FA' },
    ],
  },
  {
    name: 'Saúde',
    emoji: '🩺',
    color: '#DC2626',
    subjects: [
      { name: 'Saúde Pública', category: 'Saúde', color: '#DC2626' },
      { name: 'Enfermagem', category: 'Saúde', color: '#EF4444' },
      { name: 'Farmacologia', category: 'Saúde', color: '#F87171' },
      { name: 'Legislação do SUS', category: 'Saúde', color: '#FCA5A5' },
    ],
  },
  {
    name: 'Ética',
    emoji: '🤝',
    color: '#7C3AED',
    subjects: [
      { name: 'Ética no Serviço Público', category: 'Ética', color: '#7C3AED' },
      { name: 'Ética Profissional', category: 'Ética', color: '#8B5CF6' },
    ],
  },
];

/** All subjects in a flat list */
export function getAllSeedSubjects(): SubjectSeed[] {
  return SUBJECT_CATALOG.flatMap((cat) => cat.subjects);
}
