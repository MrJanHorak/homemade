import { Suspense } from 'react';
import Link from 'next/link';
import AuthControls from '@/components/auth-controls';
import HeaderSearch from '@/components/header-search';
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

        <nav className='site-nav'>
          <Link href='/' className='site-nav__item'>
            <img
              src={`${API_BASE_URL}/images/nav/home-button-svgrepo-com.svg`}
              alt='Home'
              className='site-nav__icon'
            />
            <span>Home</span>
          </Link>
          <Link href='/projects' className='site-nav__item'>
            <img
              src={`${API_BASE_URL}/images/nav/add-square-svgrepo-com.svg`}
              alt='Projects'
              className='site-nav__icon'
            />
            <span>Projects</span>
          </Link>
          <Link href='/profiles' className='site-nav__item'>
            <img
              src={`${API_BASE_URL}/images/nav/multiple-user-profile-images-svgrepo-com.svg`}
              alt='Profiles'
              className='site-nav__icon'
            />
            <span>Profiles</span>
          </Link>
          <HeaderSearch />
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
