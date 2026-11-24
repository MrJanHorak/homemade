import SiteHeader from '@/components/site-header';
import './globals.css';
import '../components/rich-text-editor.css';

export const metadata = {
  title: 'Homemade',
  description: 'A maker community for projects, tutorials, and collaboration.',
};

const RootLayout = ({ children }) => {
  return (
    <html lang='en'>
      <body>
        <a className='skip-link' href='#main-content'>Skip to main content</a>
        <div className='site-shell'>
          <SiteHeader />
          <main id='main-content' tabIndex={-1} className='site-shell__content'>{children}</main>
        </div>
      </body>
    </html>
  );
};

export default RootLayout;
