import React from 'react';
import { Brain, Lightbulb, Sparkles, Target } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const reflectionCategories = [
  {
    id: 'gratitude',
    title: 'Gratidão',
    description: 'Registre pelo que você é grato hoje',
    icon: Sparkles,
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/20',
  },
  {
    id: 'achievements',
    title: 'Conquistas',
    description: 'Celebre suas vitórias, por menores que sejam',
    icon: Target,
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/20',
  },
  {
    id: 'learning',
    title: 'Aprendizados',
    description: 'O que você aprendeu hoje?',
    icon: Lightbulb,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/20',
  },
  {
    id: 'challenges',
    title: 'Desafios',
    description: 'O que foi difícil e como você superou?',
    icon: Brain,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/20',
  },
];

export default function ReflectionsPage() {
  return (
    <div className="w-full max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Reflexões</h1>
        <p className="mt-2 text-muted-foreground">
          Um momento para pausar, refletir e registrar sua jornada de estudos.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {reflectionCategories.map((category) => {
          const Icon = category.icon;
          return (
            <Card
              key={category.id}
              className={cn(
                'bg-card border-border/50 hover:border-primary/30 transition-colors cursor-pointer',
                category.borderColor,
              )}
              asChild
            >
              <a href={`/reflections/${category.id}`}>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-xl', category.bgColor)}>
                      <Icon className={cn('h-6 w-6', category.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground">{category.title}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{category.description}</p>
                    </div>
                  </div>
                </CardContent>
              </a>
            </Card>
          );
        })}
      </div>

      {/* Recent Reflections */}
      <section>
        <h2 className="text-lg font-semibold text-foreground mb-4">Reflexões Recentes</h2>
        <Card className="bg-card border-border/50">
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Brain className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
              <p className="text-muted-foreground text-sm mb-4">
                Você ainda não tem reflexões registradas.
              </p>
              <Button variant="outline" asChild>
                <a href="/reflections/gratitude">Começar a refletir</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}