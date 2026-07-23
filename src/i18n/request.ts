import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';
import { cookies } from 'next/headers';

export default getRequestConfig(async () => {
  const cookieStore = await cookies();

  // Check NEXT_LOCALE cookie, otherwise default to English
  const cookieLocale = cookieStore.get('NEXT_LOCALE')?.value;
  const locale =
    cookieLocale && routing.locales.includes(cookieLocale as 'en' | 'id')
      ? cookieLocale
      : routing.defaultLocale;

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
