import { Suspense } from 'react';
import Link from 'next/link';
import AuthControls from '@/components/auth-controls';
import HeaderSearch from '@/components/header-search';
import SiteNavLinks from '@/components/site-nav-links';
import { API_BASE_URL } from '@/lib/api';

const SiteHeader = () => {
  return (
    <header className='site-shell__header'>
      <div className='site-header__row'>
        <Link
          href='/'
          className='brand-panel__identity'
          aria-label='Homemade home'
        >
          <img
            src={`${API_BASE_URL}/images/homemadelogo.png`}
            alt='Homemade logo'
            className='brand-panel__logo'
          />
        </Link>

        <nav className='site-nav' aria-label='Main navigation'>
          <SiteNavLinks />
          <Suspense>
            <HeaderSearch />
          </Suspense>
        </nav>

        <Suspense
          fallback={
            <div className='auth-inline auth-inline--muted'>Loading...</div>
          }
        >
          <AuthControls />
        </Suspense>
      </div>
    </header>
  );
};

export default SiteHeader;
