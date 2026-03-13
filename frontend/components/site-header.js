import Link from 'next/link';
import AuthControls from '@/components/auth-controls';
import { API_BASE_URL } from '@/lib/api';

const SiteHeader = () => {
  return (
    <header className='site-shell__header'>
      <div className='brand-panel'>
        <div className='brand-panel__identity'>
          <img
            src={`${API_BASE_URL}/images/homemadelogo.png`}
            alt='Homemade logo'
            className='brand-panel__logo'
          />
          <div>
            <p className='brand-panel__kicker'>Homemade</p>
            <Link href='/' className='brand-panel__title'>
              A maker community for build logs, ideas, and collaboration.
            </Link>
          </div>
        </div>

        <div className='brand-panel__search'>
          <p className='brand-panel__subcopy'>
            Search projects, find creators, and keep your latest work visible.
          </p>
          <form action='/search' className='search-box'>
            <input
              type='search'
              name='query'
              placeholder='Search projects, materials, and ideas'
              aria-label='Search projects'
            />
            <button type='submit' className='button'>
              Search
            </button>
          </form>
        </div>
      </div>

      <nav className='site-nav'>
        <Link href='/'>Home</Link>
        <Link href='/projects'>Projects</Link>
        <Link href='/profiles'>Profiles</Link>
      </nav>

      <AuthControls />
    </header>
  );
};

export default SiteHeader;
