import type { Metadata } from 'next';
import { I18nProvider } from '@/lib/i18n';
import { getI18n } from '@/lib/locale';
import './globals.css';

export async function generateMetadata(): Promise<Metadata> {
  const { tt } = await getI18n();
  return {
    title: `${tt('知巅 管理后台')}`,
    description: tt('知巅 答题竞赛平台运营后台'),
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { locale, htmlLang } = await getI18n();

  return (
    <html lang={htmlLang} data-locale={locale}>
      <body>
        <I18nProvider locale={locale}>{children}</I18nProvider>
      </body>
    </html>
  );
}
