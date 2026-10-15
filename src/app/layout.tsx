import type { Metadata } from 'next';
import '@/styles/globals.css';
import '@/styles/forms.css';

export const metadata: Metadata = {
  title: 'Indeity — Goal Achiever & Personal Execution OS',
  description:
    'Plan, Execute, Measure, Review, Adjust, Repeat. Personal Life Tracking, Goal Achievement & Execution OS.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
