import type { Metadata } from 'next';
import { Space_Grotesk } from 'next/font/google';
import './globals.css';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-sg',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Prep Helper — Active Learning for JEE & Boards',
  description: 'The only platform where AI watches the lecture with you and quizzes you in real time.',
  keywords: 'JEE preparation, active learning, AI tutor, board exams, study tool',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={spaceGrotesk.variable}>{children}</body>
    </html>
  );
}
