import './globals.css';

import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from '@/components/ui/sonner';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'Erik Santos - Desenvolvimento Web',
  description:
    'Portfólio de Erik Santos, desenvolvedor web especializado em soluções modernas e responsivas, com atenção ao design e experiência do usuário.',
  openGraph: {
    title: 'Erik Santos - Desenvolvimento Web',
    description:
      'Portfólio de Erik Santos, desenvolvedor web especializado em soluções modernas e responsivas, com atenção ao design e experiência do usuário.',
    url: 'https://portfolioeriksantos.vercel.app',
    siteName: 'Erik Santos Portfolio',
    images: [
      {
        url: 'https://1hcgs7spbatxhpzg.public.blob.vercel-storage.com/cover_eriksantos.png',
        width: 1200,
        height: 630,
        alt: 'Erik Santos - Desenvolvimento Web',
      },
    ],
    locale: 'pt_BR',
    type: 'website',
  },
  icons: {
    icon: 'https://1hcgs7spbatxhpzg.public.blob.vercel-storage.com/cover_eriksantos.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.className} antialiased`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
