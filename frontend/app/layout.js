import { Arvo, Source_Sans_3 } from 'next/font/google';
import SiteHeader from '@/components/site-header';
import './globals.css';
import '../components/rich-text-editor.css';

const displayFont = Arvo({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-display',
});

const bodyFont = Source_Sans_3({
  subsets: ['latin'],
  variable: '--font-body',
});

export const metadata = {
  title: 'Homemade',
  description: 'A maker community for projects, tutorials, and collaboration.',
};

const RootLayout = ({ children }) => {
  return (
    <html lang='en'>
      <body className={`${displayFont.variable} ${bodyFont.variable}`}>
        <div className='site-shell'>
          <SiteHeader />
          <main className='site-shell__content'>{children}</main>
        </div>
      </body>
    </html>
  );
};

export default RootLayout;
