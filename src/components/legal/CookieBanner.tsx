import React, { useState, useEffect } from 'react';
import { X, Cookie } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CookieConsent {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
  timestamp: number;
}

const CONSENT_KEY = 'bora-estudar-cookie-consent';

export function CookieBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [consent, setConsent] = useState<CookieConsent | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(CONSENT_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as CookieConsent;
        setConsent(parsed);
      } catch {
        localStorage.removeItem(CONSENT_KEY);
        setShowBanner(true);
      }
    } else {
      setShowBanner(true);
    }
  }, []);

  const handleAcceptAll = () => {
    const newConsent: CookieConsent = {
      necessary: true,
      analytics: true,
      marketing: true,
      timestamp: Date.now(),
    };
    localStorage.setItem(CONSENT_KEY, JSON.stringify(newConsent));
    setConsent(newConsent);
    setShowBanner(false);
  };

  const handleRejectAll = () => {
    const newConsent: CookieConsent = {
      necessary: true,
      analytics: false,
      marketing: false,
      timestamp: Date.now(),
    };
    localStorage.setItem(CONSENT_KEY, JSON.stringify(newConsent));
    setConsent(newConsent);
    setShowBanner(false);
  };

  if (!showBanner || consent) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 md:bottom-4 md:right-4 md:left-auto md:w-[420px] md:rounded-xl md:shadow-2xl"
      role="dialog"
      aria-label="Consentimento de cookies"
    >
      <div className="glass-card p-4 sm:p-6 border-t border-border/50 md:border md:ring-1 md:ring-border/50 animate-slide-up">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            <Cookie className="h-5 w-5 text-emerald-500" aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-foreground">
              Valorizamos sua privacidade
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Usamos cookies para melhorar sua experiência, analisar tráfego e personalizar conteúdo.
              Cookies necessários não podem ser desativados.
            </p>
            <div className="mt-3 flex flex-col sm:flex-row gap-2">
              <Button
                onClick={handleAcceptAll}
                className="w-full sm:w-auto bg-gradient-to-r from-emerald-400 to-emerald-600 text-card-foreground hover:from-emerald-500 hover:to-emerald-700"
              >
                Aceitar todos
              </Button>
              <Button
                variant="outline"
                onClick={handleRejectAll}
                className="w-full sm:w-auto border-border/50 hover:bg-secondary/50"
              >
                Recusar não essenciais
              </Button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Ao continuar, você concorda com nossa{' '}
              <a href="/privacidade" className="underline hover:text-emerald-400">
                Política de Privacidade
              </a>
              {''}
              e{' '}
              <a href="/termos" className="underline hover:text-emerald-400">
                Termos de Uso
              </a>
              .
            </p>
          </div>
          <button
            onClick={() => setShowBanner(false)}
            className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Fechar banner de cookies"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}