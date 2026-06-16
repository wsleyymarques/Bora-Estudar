import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ChevronLeft, Save, Clock, Calendar, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TimeSpinner } from '@/components/ui/time-spinner';
import { toast } from 'sonner';

export default function ProfileGoalsPage() {
  const { profile, updateProfile } = useAuth();
  const navigate = useNavigate();

  const [dailyGoalHours, setDailyGoalHours] = useState(2);
  const [dailyGoalMinutes, setDailyGoalMinutes] = useState(0);
  const [weeklyGoalHours, setWeeklyGoalHours] = useState(20);
  const [weeklyGoalMinutes, setWeeklyGoalMinutes] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      const dg = profile.daily_goal_minutes || 120;
      setDailyGoalHours(Math.floor(dg / 60));
      setDailyGoalMinutes(dg % 60);

      const wg = profile.weekly_goal_minutes || 1200;
      setWeeklyGoalHours(Math.floor(wg / 60));
      setWeeklyGoalMinutes(wg % 60);
    }
  }, [profile]);

  const handleSaveGoals = async () => {
    const totalDaily = dailyGoalHours * 60 + dailyGoalMinutes;
    const totalWeekly = weeklyGoalHours * 60 + weeklyGoalMinutes;

    if (totalDaily <= 0 || totalWeekly <= 0) {
      toast.error('As metas devem ser maiores que zero.');
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await updateProfile({
        daily_goal_minutes: totalDaily,
        weekly_goal_minutes: totalWeekly,
      });
      if (error) throw new Error(error);
      
      toast.success('Metas atualizadas com sucesso!');
      navigate('/profile');
    } catch (err: any) {
      toast.error('Erro ao atualizar metas.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background relative -mx-4 -mt-20 md:mx-auto md:max-w-md md:mt-0 md:bg-transparent">
      {/* Header */}
      <div className="flex items-center px-4 pt-6 pb-4">
        <button 
          onClick={() => navigate('/profile')} 
          className="flex items-center gap-2 text-foreground font-semibold"
        >
          <ChevronLeft className="w-5 h-5" />
          <span>Perfil</span>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 pb-32 flex flex-col pt-0 overflow-y-auto">
        
        <div className="flex flex-row md:flex-col items-center md:text-center gap-5 md:gap-0 md:space-y-4 mb-8 text-left">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex flex-shrink-0 items-center justify-center md:mb-6 md:mx-auto border border-primary/20">
            <Target className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-foreground">Defina suas Metas</h1>
            <p className="text-muted-foreground text-sm max-w-md mx-auto mt-1 md:mt-0">
              A consistência é o segredo da aprovação. Quanto tempo você pretende se dedicar?
            </p>
          </div>
        </div>

        {/* Form Fields */}
        <div className="space-y-6 flex-1">
          {/* Daily Goal */}
          <div className="bg-card border border-border/50 rounded-3xl p-6 space-y-6 shadow-sm">
            <div className="flex items-center gap-3 text-primary">
              <Clock className="w-5 h-5" />
              <h3 className="font-bold text-lg text-foreground">Meta Diária</h3>
            </div>
            
            <div className="flex items-center gap-4 justify-center">
              <div className="flex flex-col items-center">
                <TimeSpinner 
                  value={dailyGoalHours}
                  onChange={setDailyGoalHours}
                  min={0} max={23}
                  activeColorClass="focus-within:border-primary focus-within:ring-primary"
                />
                <span className="text-[10px] text-muted-foreground font-bold mt-2 uppercase tracking-widest">Horas</span>
              </div>
              <span className="text-3xl font-black text-muted-foreground/30 mb-6">:</span>
              <div className="flex flex-col items-center">
                <TimeSpinner 
                  value={dailyGoalMinutes}
                  onChange={setDailyGoalMinutes}
                  min={0} max={59} step={5}
                  activeColorClass="focus-within:border-primary focus-within:ring-primary"
                />
                <span className="text-[10px] text-muted-foreground font-bold mt-2 uppercase tracking-widest">Min</span>
              </div>
            </div>
          </div>

          {/* Weekly Goal */}
          <div className="bg-card border border-border/50 rounded-3xl p-6 space-y-6 shadow-sm">
            <div className="flex items-center gap-3 text-blue-500 dark:text-blue-400">
              <Calendar className="w-5 h-5" />
              <h3 className="font-bold text-lg text-foreground">Meta Semanal</h3>
            </div>
            
            <div className="flex items-center gap-4 justify-center">
              <div className="flex flex-col items-center">
                <TimeSpinner 
                  value={weeklyGoalHours}
                  onChange={setWeeklyGoalHours}
                  min={0} max={168}
                  activeColorClass="focus-within:border-blue-500 focus-within:ring-blue-500"
                />
                <span className="text-[10px] text-muted-foreground font-bold mt-2 uppercase tracking-widest">Horas</span>
              </div>
              <span className="text-3xl font-black text-muted-foreground/30 mb-6">:</span>
              <div className="flex flex-col items-center">
                <TimeSpinner 
                  value={weeklyGoalMinutes}
                  onChange={setWeeklyGoalMinutes}
                  min={0} max={59} step={5}
                  activeColorClass="focus-within:border-blue-500 focus-within:ring-blue-500"
                />
                <span className="text-[10px] text-muted-foreground font-bold mt-2 uppercase tracking-widest">Min</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="fixed md:static bottom-20 md:bottom-0 left-0 right-0 p-6 md:p-0 bg-gradient-to-t from-background via-background/90 to-transparent md:bg-none z-20 mt-auto md:mt-8 pt-4 md:pt-0 pointer-events-none md:pointer-events-auto">
          <Button 
            onClick={handleSaveGoals} 
            disabled={isSaving}
            className="w-full rounded-2xl h-14 text-base font-bold shadow-md transition-transform active:scale-95 pointer-events-auto"
          >
            {isSaving ? (
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                <span>Salvando...</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Save className="w-5 h-5" />
                <span>Salvar Metas</span>
              </div>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
