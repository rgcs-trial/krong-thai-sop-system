'use client';

import { useTranslations, useLocale } from 'next-intl';
import { LanguageToggle, QuickLanguageToggle } from '@/components/language-toggle';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface HomeProps {
  params: Promise<{ locale: string }>;
}

export default function Home({ params }: HomeProps) {
  const t = useTranslations();
  const locale = useLocale();

  return (
    <div className="min-h-screen bg-background">
      {/* Header with Language Toggle */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-heading font-semibold text-krong-red">
              {t('auth.title')}
            </h1>
            <span className="text-sm text-muted-foreground font-body">
              {t('auth.subtitle')}
            </span>
          </div>
          
          <div className="flex items-center space-x-4">
            <LanguageToggle variant="compact" size="md" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto py-8 px-4">
        {/* Welcome Section */}
        <div className="text-center mb-12">
          <h2 className={`text-4xl font-heading font-bold mb-4 ${locale === 'th' ? 'text-thai' : ''}`}>
            {t('dashboard.welcome')}
          </h2>
          <p className={`text-lg text-muted-foreground font-body ${locale === 'th' ? 'text-thai' : ''}`}>
            {locale === 'th' 
              ? 'ระบบจัดการมาตรฐานการปฏิบัติงานที่ออกแบบมาเพื่อแท็บเล็ต พร้อมการสนับสนุนสองภาษา'
              : 'A tablet-optimized SOP management system with comprehensive bilingual support'
            }
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className={`text-krong-red ${locale === 'th' ? 'font-thai' : 'font-heading'}`}>
                {t('sopCategories.title')}
              </CardTitle>
              <CardDescription className={locale === 'th' ? 'font-thai' : 'font-body'}>
                {t('sopCategories.subtitle')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className={`p-2 bg-accent/20 rounded ${locale === 'th' ? 'font-thai' : 'font-body'}`}>
                  {t('sopCategories.foodSafety')}
                </div>
                <div className={`p-2 bg-accent/20 rounded ${locale === 'th' ? 'font-thai' : 'font-body'}`}>
                  {t('sopCategories.kitchenOperations')}
                </div>
                <div className={`p-2 bg-accent/20 rounded ${locale === 'th' ? 'font-thai' : 'font-body'}`}>
                  {t('sopCategories.serviceStandards')}
                </div>
                <div className="text-center text-muted-foreground pt-2">
                  {locale === 'th' ? 'และอีก 13 หมวดหมู่...' : 'And 13 more categories...'}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className={`text-krong-red ${locale === 'th' ? 'font-thai' : 'font-heading'}`}>
                {t('auth.title')}
              </CardTitle>
              <CardDescription className={locale === 'th' ? 'font-thai' : 'font-body'}>
                {t('auth.pinEntry')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className={`text-sm ${locale === 'th' ? 'font-thai' : 'font-body'}`}>
                  • {locale === 'th' ? 'รหัส PIN 4 หลัก' : '4-digit PIN authentication'}
                </div>
                <div className={`text-sm ${locale === 'th' ? 'font-thai' : 'font-body'}`}>
                  • {locale === 'th' ? 'เซสชันใช้งาน 8 ชั่วโมง' : '8-hour secure sessions'}
                </div>
                <div className={`text-sm ${locale === 'th' ? 'font-thai' : 'font-body'}`}>
                  • {locale === 'th' ? 'การรักษาความปลอดภัยขั้นสูง' : 'Enterprise-grade security'}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className={`text-krong-red ${locale === 'th' ? 'font-thai' : 'font-heading'}`}>
                {t('common.language')}
              </CardTitle>
              <CardDescription className={locale === 'th' ? 'font-thai' : 'font-body'}>
                {locale === 'th' ? 'การสนับสนุนสองภาษา' : 'Bilingual Support'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <span className={`font-medium ${locale === 'th' ? 'font-thai' : 'font-ui'}`}>
                  {locale === 'th' ? 'ภาษาปัจจุบัน:' : 'Current Language:'}
                </span>
                <QuickLanguageToggle />
              </div>
              <div className="space-y-2 text-sm">
                <div className={locale === 'th' ? 'font-thai' : 'font-body'}>
                  🇺🇸 English - {locale === 'th' ? 'อังกฤษ' : 'Full support'}
                </div>
                <div className={locale === 'th' ? 'font-thai' : 'font-body'}>
                  🇹🇭 ไทย - {locale === 'th' ? 'การสนับสนุนเต็มรูปแบบ' : 'Thai language'}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Language Demo Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className={`${locale === 'th' ? 'font-thai' : 'font-heading'}`}>
              {locale === 'th' ? 'การสาธิตการใช้งานสองภาษา' : 'Bilingual Functionality Demo'}
            </CardTitle>
            <CardDescription className={locale === 'th' ? 'font-thai' : 'font-body'}>
              {locale === 'th' 
                ? 'ทดสอบการสลับภาษาและการแสดงผลที่เหมาะสมกับแท็บเล็ต'
                : 'Test language switching and tablet-optimized display'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className={`font-semibold mb-3 ${locale === 'th' ? 'font-thai' : 'font-heading'}`}>
                  {t('navigation.home')}
                </h4>
                <div className="space-y-2 text-sm">
                  <div className={locale === 'th' ? 'font-thai' : 'font-body'}>• {t('navigation.dashboard')}</div>
                  <div className={locale === 'th' ? 'font-thai' : 'font-body'}>• {t('navigation.sops')}</div>
                  <div className={locale === 'th' ? 'font-thai' : 'font-body'}>• {t('navigation.categories')}</div>
                  <div className={locale === 'th' ? 'font-thai' : 'font-body'}>• {t('navigation.settings')}</div>
                </div>
              </div>
              <div>
                <h4 className={`font-semibold mb-3 ${locale === 'th' ? 'font-thai' : 'font-heading'}`}>
                  {t('common.loading')} | {t('common.success')} | {t('common.error')}
                </h4>
                <div className="space-y-2 text-sm">
                  <div className={locale === 'th' ? 'font-thai' : 'font-body'}>✅ {t('common.save')}</div>
                  <div className={locale === 'th' ? 'font-thai' : 'font-body'}>✏️ {t('common.edit')}</div>
                  <div className={locale === 'th' ? 'font-thai' : 'font-body'}>🔍 {t('common.search')}</div>
                  <div className={locale === 'th' ? 'font-thai' : 'font-body'}>📱 {locale === 'th' ? 'เหมาะสำหรับแท็บเล็ต' : 'Tablet Optimized'}</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Font Display Test */}
        <Card>
          <CardHeader>
            <CardTitle className={locale === 'th' ? 'font-thai' : 'font-heading'}>
              {locale === 'th' ? 'การทดสอบแบบอักษร' : 'Font Display Test'}
            </CardTitle>
            <CardDescription className={locale === 'th' ? 'font-thai' : 'font-body'}>
              {locale === 'th' 
                ? 'แสดงแบบอักษรที่เหมาะสมตามแนวทางการออกแบบของแบรนด์'
                : 'Displaying appropriate fonts according to brand guidelines'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <span className="text-sm text-muted-foreground">Heading Font (EB Garamond SC):</span>
                <h3 className="text-2xl font-heading">Restaurant Krong Thai</h3>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Body Font (Source Serif Pro):</span>
                <p className="font-body">
                  Standard operating procedures for exceptional Thai cuisine service.
                </p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">UI Font (Inter):</span>
                <p className="font-ui">
                  User interface elements and interactive components.
                </p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Thai Font (Noto Sans Thai):</span>
                <p className="font-thai text-lg">
                  ภัตตาคารกรองไทย - มาตรฐานการปฏิบัติงานสำหรับอาหารไทยระดับพรีเมียม
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="border-t bg-muted/50 py-8 mt-12">
        <div className="container text-center">
          <p className={`text-sm text-muted-foreground ${locale === 'th' ? 'font-thai' : 'font-body'}`}>
            {locale === 'th' 
              ? '© 2024 ภัตตาคารกรองไทย - ระบบจัดการมาตรฐานการปฏิบัติงาน'
              : '© 2024 Restaurant Krong Thai - SOP Management System'
            }
          </p>
        </div>
      </footer>
    </div>
  );
}
