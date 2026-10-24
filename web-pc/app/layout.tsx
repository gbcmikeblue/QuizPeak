import type { Metadata } from 'next';
import Link from 'next/link';
import { BRAND } from '@quizpeak/shared';
import { SiteHeader } from '@/components/site-header';
import { I18nProvider } from '@/lib/i18n';
import { getI18n } from '@/lib/locale';
import './globals.css';

export async function generateMetadata(): Promise<Metadata> {
  const { tt } = await getI18n();
  return {
    title: `${BRAND.nameZh} ${BRAND.nameEn} · ${tt('答题登顶，积分上榜')}`,
    description: tt('答题闯关、竞赛上榜，用积分赢取站内权益。'),
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const i18n = await getI18n();
  const { locale, htmlLang, tt } = i18n;

  return (
    <html lang={htmlLang} data-locale={locale}>
      <body>
        <I18nProvider locale={locale}>
          <SiteHeader />
          {children}
          <footer className="mt-16 border-t border-black/5 bg-[#FAFBFA] py-10">
            <div className="container-page flex flex-col justify-between gap-4 text-sm text-[#667085] md:flex-row">
              <p>
                © {new Date().getFullYear()} {BRAND.nameZh} {BRAND.nameEn}. {tt('保留所有权利')}
              </p>
              <div className="flex gap-5">
                <Link href="/about-us">{tt('关于我们')}</Link>
                <Link href="/contact">{tt('联系我们')}</Link>
                <Link href="/privacy-policy">{tt('隐私政策')}</Link>
              </div>
            </div>
          </footer>
        </I18nProvider>
      </body>
    </html>
  );
}
