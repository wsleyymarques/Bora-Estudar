import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const COOLDOWN_DAYS = 7;
const EVOLUTION_THRESHOLD = 1.15; // 15% above goal
const EVOLUTION_INCREASE = 1.1; // 10% increase

export function useGoalEvolution() {
  const { profile, updateProfile } = useAuth();
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    if (!profile || hasChecked) return;

    const checkEvolution = async () => {
      setHasChecked(true);
      
      const weeklyGoal = profile.weekly_goal_minutes || 1200; // default 20h
      const dailyGoal = profile.daily_goal_minutes || 120; // default 2h
      
      // Assume xp_weekly is 1:1 with minutes for this algorithm, or we can use an actual minutes query.
      // If we use xp_weekly:
      const weeklyMinutes = profile.xp_weekly; 

      if (!weeklyMinutes || weeklyMinutes <= 0) return;

      const lastEvolutionStr = localStorage.getItem('last_goal_evolution_date');
      if (lastEvolutionStr) {
        const lastEvolution = new Date(lastEvolutionStr);
        const daysSince = (Date.now() - lastEvolution.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSince < COOLDOWN_DAYS) return; // Still in cooldown
      }

      if (weeklyMinutes >= weeklyGoal * EVOLUTION_THRESHOLD) {
        // User exceeded goal by 15%! Let's increase it.
        const newWeeklyGoal = Math.round(weeklyGoal * EVOLUTION_INCREASE);
        const newDailyGoal = Math.round(dailyGoal * EVOLUTION_INCREASE);

        const { error } = await updateProfile({
          weekly_goal_minutes: newWeeklyGoal,
          daily_goal_minutes: newDailyGoal,
        });

        if (!error) {
          localStorage.setItem('last_goal_evolution_date', new Date().toISOString());
          toast.success('Incrível! Você superou sua meta semanal.', {
            description: 'Sua meta diária e semanal foram ajustadas automaticamente para acompanhar seu ritmo. Bora Estudar!',
            duration: 8000,
          });
        }
      }
    };

    checkEvolution();
  }, [profile, hasChecked, updateProfile]);
}
