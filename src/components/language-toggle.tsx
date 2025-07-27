'use client';

import { useTransition, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { locales, localeNames, localeFlags, type Locale } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Globe, Languages, Check, Loader2 } from 'lucide-react';
import { useSettingsStore } from '@/lib/stores/settings-store';

interface LanguageToggleProps {
  variant?: 'default' | 'compact' | 'icon-only';
  size?: 'sm' | 'md' | 'lg';
  showFlag?: boolean;
  className?: string;
}

export function LanguageToggle({
  variant = 'default',
  size = 'md',
  showFlag = true,
  className = '',
}: LanguageToggleProps) {
  const t = useTranslations('common');
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const { setLanguage } = useSettingsStore();
  const [isMounted, setIsMounted] = useState(false);

  // Ensure component is mounted before showing content (hydration safety)
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleLocaleChange = async (newLocale: Locale) => {
    if (newLocale === locale) return;

    startTransition(async () => {
      try {
        // Update language preference in settings store
        await setLanguage(newLocale as 'en' | 'fr' | 'th');
        
        // Store language preference in session storage for immediate persistence
        sessionStorage.setItem('preferred-language', newLocale);
        
        // Replace the current locale in the pathname with the new one
        const segments = pathname.split('/');
        if (locales.includes(segments[1] as Locale)) {
          segments[1] = newLocale;
        } else {
          segments.splice(1, 0, newLocale);
        }
        const newPathname = segments.join('/');
        
        router.push(newPathname);
        router.refresh();
      } catch (error) {
        console.error('Failed to change language:', error);
      }
    });
  };

  // Button size configurations optimized for tablet
  const sizeClasses = {
    sm: 'h-9 px-3 text-sm',
    md: 'h-11 px-4 text-base',
    lg: 'h-14 px-6 text-lg',
  };

  // Icon size configurations
  const iconSizes = {
    sm: 16,
    md: 20,
    lg: 24,
  };

  const currentFlag = localeFlags[locale];
  const currentName = localeNames[locale];

  if (variant === 'icon-only') {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={`
              ${sizeClasses[size]}
              w-auto aspect-square
              hover:bg-accent
              focus-visible:ring-2
              focus-visible:ring-ring
              transition-colors
              ${className}
            `}
            disabled={isPending}
            aria-label={t('switchLanguage')}
          title={`Current: ${currentName} • Click to switch language`}
          >
            {showFlag ? (
              <span className="text-lg" role="img" aria-label={currentName}>
                {currentFlag}
              </span>
            ) : (
              <Globe size={iconSizes[size]} />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          align="end" 
          className="min-w-[160px] p-2"
          sideOffset={8}
        >
          {locales.map((loc) => (
            <DropdownMenuItem
              key={loc}
              onClick={() => handleLocaleChange(loc)}
              className={`
                flex items-center gap-3 px-3 py-3
                cursor-pointer rounded-md
                hover:bg-accent
                focus:bg-accent
                ${loc === locale ? 'bg-accent/50' : ''}
              `}
              disabled={isPending}
            >
              <span className="text-lg" role="img" aria-label={localeNames[loc]}>
                {localeFlags[loc]}
              </span>
              <span className={`flex-1 ${loc === 'th' ? 'font-thai' : 'font-ui'}`}>
                {localeNames[loc]}
              </span>
              {isPending ? (
                <Loader2 size={16} className="animate-spin text-muted-foreground" />
              ) : loc === locale ? (
                <Check size={16} className="text-primary" />
              ) : null}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  if (variant === 'compact') {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className={`
              ${sizeClasses[size]}
              flex items-center gap-2
              hover:bg-accent
              focus-visible:ring-2
              focus-visible:ring-ring
              transition-colors
              ${className}
            `}
            disabled={isPending}
          >
            {showFlag && (
              <span className="text-lg" role="img" aria-label={currentName}>
                {currentFlag}
              </span>
            )}
            <span className="font-ui">
              {locale.toUpperCase()}
            </span>
            <Languages size={iconSizes[size]} className="opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          align="end" 
          className="min-w-[160px] p-2"
          sideOffset={8}
        >
          {locales.map((loc) => (
            <DropdownMenuItem
              key={loc}
              onClick={() => handleLocaleChange(loc)}
              className={`
                flex items-center gap-3 px-3 py-3
                cursor-pointer rounded-md
                hover:bg-accent
                focus:bg-accent
                ${loc === locale ? 'bg-accent/50' : ''}
              `}
              disabled={isPending}
            >
              <span className="text-lg" role="img" aria-label={localeNames[loc]}>
                {localeFlags[loc]}
              </span>
              <span className={`flex-1 ${loc === 'th' ? 'font-thai' : 'font-ui'}`}>
                {localeNames[loc]}
              </span>
              {isPending ? (
                <Loader2 size={16} className="animate-spin text-muted-foreground" />
              ) : loc === locale ? (
                <Check size={16} className="text-primary" />
              ) : null}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <div className="px-3 py-2 text-xs text-muted-foreground">
            Language preference saved to your account
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Default variant - full button with text
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={`
            ${sizeClasses[size]}
            flex items-center gap-3
            hover:bg-accent
            focus-visible:ring-2
            focus-visible:ring-ring
            transition-colors
            ${className}
          `}
          disabled={isPending}
        >
          {showFlag && (
            <span className="text-lg" role="img" aria-label={currentName}>
              {currentFlag}
            </span>
          )}
          <span className="font-ui font-medium">
            {currentName}
          </span>
          <Languages size={iconSizes[size]} className="opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className="min-w-[200px] p-2"
        sideOffset={8}
      >
        <div className="px-3 py-2 text-sm font-medium text-muted-foreground border-b border-border mb-2">
          {t('language')}
        </div>
        {!isMounted && (
          <div className="px-3 py-2 text-xs text-muted-foreground">
            Loading languages...
          </div>
        )}
        {isMounted && isPending && (
          <div className="px-3 py-2 text-xs text-muted-foreground flex items-center gap-2">
            <Loader2 size={12} className="animate-spin" />
            Switching language...
          </div>
        )}
        {locales.map((loc) => (
          <DropdownMenuItem
            key={loc}
            onClick={() => handleLocaleChange(loc)}
            className={`
              flex items-center gap-3 px-3 py-3
              cursor-pointer rounded-md
              hover:bg-accent
              focus:bg-accent
              ${loc === locale ? 'bg-accent/50' : ''}
            `}
            disabled={isPending}
          >
            <span className="text-lg" role="img" aria-label={localeNames[loc]}>
              {localeFlags[loc]}
            </span>
            <span className={`flex-1 ${loc === 'fr' ? 'font-ui' : 'font-ui'} font-medium`}>
              {localeNames[loc]}
            </span>
            {loc === locale && (
              <Check size={16} className="text-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Quick toggle between languages for space-constrained areas
export function QuickLanguageToggle({ 
  className = '',
  preferredLanguages = ['en', 'th'] 
}: { 
  className?: string;
  preferredLanguages?: Locale[];
}) {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const { setLanguage } = useSettingsStore();

  // Get the next language in the rotation
  const getNextLocale = () => {
    const currentIndex = preferredLanguages.indexOf(locale);
    const nextIndex = (currentIndex + 1) % preferredLanguages.length;
    return preferredLanguages[nextIndex];
  };

  const nextLocale = getNextLocale();

  const handleToggle = async () => {
    startTransition(async () => {
      try {
        // Update language preference in settings store
        await setLanguage(nextLocale as 'en' | 'fr' | 'th');
        
        // Store language preference in session storage for immediate persistence
        sessionStorage.setItem('preferred-language', nextLocale);
        
        // Replace the current locale in the pathname
        const segments = pathname.split('/');
        if (locales.includes(segments[1] as Locale)) {
          segments[1] = nextLocale;
        } else {
          segments.splice(1, 0, nextLocale);
        }
        const newPathname = segments.join('/');
        
        router.push(newPathname);
        router.refresh();
      } catch (error) {
        console.error('Failed to change language:', error);
      }
    });
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleToggle}
      disabled={isPending}
      className={`
        h-9 px-3
        flex items-center gap-2
        hover:bg-accent
        focus-visible:ring-2
        focus-visible:ring-ring
        transition-colors
        ${className}
      `}
      aria-label={`Switch to ${localeNames[nextLocale]}`}
    >
      {isPending ? (
        <Loader2 size={14} className="animate-spin" />
      ) : (
        <>
          <span className="text-sm" role="img" aria-label={localeNames[nextLocale]}>
            {localeFlags[nextLocale]}
          </span>
          <span className={`text-sm font-medium ${nextLocale === 'th' ? 'font-thai' : 'font-ui'}`}>
            {nextLocale.toUpperCase()}
          </span>
        </>
      )}
    </Button>
  );
}