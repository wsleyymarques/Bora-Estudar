import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { getAllSeedSubjects } from '@/data/subject-catalog';

function slugify(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export function useTutorialCompletion() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);

  const processTutorialData = async (recipeId: string, data: Record<string, any>) => {
    if (!user) return;
    setIsProcessing(true);
    toast.loading('Preparando seu plano de estudos...', { id: 'tutorial-complete' });

    try {
      // 1. Determine Plan Name and Type
      const planType = data.goal === 'concurso' ? 'concurso' : data.goal === 'faculdade' ? 'faculdade' : 'outro';
      const planName = planType === 'concurso' ? 'Meu Primeiro Concurso' : 'Meu Plano de Estudos';

      // 2. Create the Schedule (Cronograma)
      const startDate = data.startDate || new Date().toISOString().slice(0, 10);
      const schedulePayload = {
        user_id: user.id,
        name: `Cronograma Inicial`,
        description: 'Cronograma gerado automaticamente pelo assistente inicial.',
        status: 'active',
        start_date: startDate,
        is_active: false,
        view_settings: { 
          source: 'tutorial',
          weeklyHours: data.weeklyHours || 10,
          preferredTimes: data.preferredTimes || [],
          studyDays: data.studyDays || [],
          studyMethod: data.studyMethod || 'pomodoro'
        },
      };

      const { data: schedule, error: scheduleError } = await supabase
        .from('study_schedules')
        .insert(schedulePayload)
        .select('id')
        .single();

      if (scheduleError) throw new Error(`Erro ao criar cronograma: ${scheduleError.message}`);

      // 3. Create the Study Plan
      const { data: plan, error: planError } = await supabase
        .from('study_plans')
        .insert({
          user_id: user.id,
          name: planName,
          title: planName,
          status: 'active',
          schedule_id: schedule.id,
          start_date: startDate,
          review_interval_days: 7,
        })
        .select('id')
        .single();

      if (planError) throw new Error(`Erro ao criar plano: ${planError.message}`);

      // 4. Handle Subjects
      const selectedSubjectIds: string[] = data.subjects || [];
      const customSubjects: any[] = data.customSubjects || [];
      
      const allSeedSubjects = getAllSeedSubjects();
      
      // Get user's existing subjects
      const { data: existingSubjects } = await supabase
        .from('subjects')
        .select('id, name')
        .eq('user_id', user.id);
        
      const existingNames = new Map((existingSubjects || []).map(s => [s.name.toLowerCase().trim(), s.id]));
      
      const subjectsToLink: string[] = [];
      let sortOrderCounter = 0;

      // Helper to link subject to plan
      const linkSubject = async (subjectId: string) => {
        // Check if already linked to avoid duplicates
        if (subjectsToLink.includes(subjectId)) return;
        
        await supabase.from('study_plan_subjects').insert({
          user_id: user.id,
          plan_id: plan.id,
          subject_id: subjectId,
          sort_order: sortOrderCounter++
        });
        subjectsToLink.push(subjectId);
      };

      // Helper to create new subject
      const createSubject = async (name: string, category: string | null, color: string) => {
        const { data: newSub } = await supabase.from('subjects').insert({
          user_id: user.id,
          name: name.trim(),
          slug: slugify(name),
          color: color || '#5B8C7E',
          category: category,
          active: true,
          optional: false,
          origin: 'user',
          status: 'active',
        }).select('id').single();
        return newSub?.id;
      };

      // 4.1 Process Standard Subjects (selected by user)
      for (const subjectId of selectedSubjectIds) {
        // Find if it's a seed
        const seed = allSeedSubjects.find(s => s.name === subjectId || s.name.toLowerCase() === subjectId.toLowerCase());
        const nameToUse = seed ? seed.name : subjectId;
        const lowerName = nameToUse.toLowerCase().trim();
        
        if (existingNames.has(lowerName)) {
          // Already exists for user, just link
          await linkSubject(existingNames.get(lowerName)!);
        } else if (seed) {
          // Create from seed
          const newId = await createSubject(seed.name, seed.category, seed.color);
          if (newId) {
             existingNames.set(lowerName, newId);
             await linkSubject(newId);
          }
        }
      }

      // 4.2 Process Custom Subjects created in the tutorial
      for (const custom of customSubjects) {
        const lowerName = custom.name.toLowerCase().trim();
        if (existingNames.has(lowerName)) {
          await linkSubject(existingNames.get(lowerName)!);
        } else {
          const newId = await createSubject(custom.name, custom.category || 'Personalizado', custom.color);
          if (newId) {
            existingNames.set(lowerName, newId);
            await linkSubject(newId);
          }
        }
      }

      toast.success('Plano criado com sucesso! Bem-vindo(a) ao Bora-Estudar.', { id: 'tutorial-complete' });
      
      // Redirect to the newly created plan
      navigate(`/plans/${plan.id}`);
      
    } catch (err: any) {
      console.error('Erro na finalização do tutorial:', err);
      toast.error(err.message || 'Erro ao finalizar a configuração inicial.', { id: 'tutorial-complete' });
    } finally {
      setIsProcessing(false);
    }
  };

  return { processTutorialData, isProcessing };
}
