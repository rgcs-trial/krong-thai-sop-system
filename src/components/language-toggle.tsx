'use client';

import { useTransition } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { locales, localeNames, localeFlags, type Locale } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Globe, Languages, Check } from 'lucide-react';

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

  const handleLocaleChange = (newLocale: Locale) => {
    if (newLocale === locale) return;

    startTransition(() => {
      // Replace the current locale in the pathname with the new one
      const newPathname = pathname.replace(`/${locale}`, `/${newLocale}`);
      router.push(newPathname);
      router.refresh();
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
              {loc === locale && (
                <Check size={16} className="text-primary" />
              )}
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
            <span className={locale === 'th' ? 'font-thai' : 'font-ui'}>
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
              {loc === locale && (
                <Check size={16} className="text-primary" />
              )}
            </DropdownMenuItem>
          ))}
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
          <span className={`${locale === 'th' ? 'font-thai' : 'font-ui'} font-medium`}>
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
            <span className={`flex-1 ${loc === 'th' ? 'font-thai' : 'font-ui'} font-medium`}>
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

// Quick toggle between just two languages for space-constrained areas
export function QuickLanguageToggle({ className = '' }: { className?: string }) {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const otherLocale = locale === 'en' ? 'th' : 'en';

  const handleToggle = () => {
    startTransition(() => {
      const newPathname = pathname.replace(`/${locale}`, `/${otherLocale}`);
      router.push(newPathname);
      router.refresh();
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
      aria-label={`Switch to ${localeNames[otherLocale]}`}
    >
      <span className="text-sm" role="img" aria-label={localeNames[otherLocale]}>
        {localeFlags[otherLocale]}
      </span>
      <span className={`text-sm font-medium ${otherLocale === 'th' ? 'font-thai' : 'font-ui'}`}>
        {otherLocale.toUpperCase()}
      </span>
    </Button>
  );
}