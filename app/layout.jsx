import './globals.css';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://freecartop.vercel.app';

export const metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: 'FreeCar Top — Аналіз авто та підбір по потребах',
    template: '%s | FreeCar Top',
  },
  description:
    'Перевір оголошення про продаж авто на чесність: скручений пробіг, підозрілих власників, завищену ціну. Підбери авто під свої потреби за бюджетом.',
  keywords: [
    'аналіз авто', 'скручений пробіг', 'купити авто Україна', 'перевірка авто',
    'підбір авто', 'ризик', 'auto.ria', 'перекуп', 'VIN перевірка',
  ],
  openGraph: {
    title: 'FreeCar Top — Аналіз авто без обману',
    description: 'Вводь дані оголошення — ми покажемо всі червоні прапорці та реальний рейтинг довіри.',
    type: 'website',
    locale: 'uk_UA',
    siteName: 'FreeCar Top',
    url: BASE_URL,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FreeCar Top — Аналіз авто без обману',
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }) {
  return (
    <html lang="uk">
      <body>{children}</body>
    </html>
  );
}
