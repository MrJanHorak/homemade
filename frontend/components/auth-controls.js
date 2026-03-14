'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';

const AuthControls = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [session, setSession] = useState({
    authenticated: false,
    user: null,
    links: {
      login: `${API_BASE_URL}/auth/google`,
      logout: `${API_BASE_URL}/auth/logout`,
    },
  });
  const [isLoading, setIsLoading] = useState(true);
  const queryString = searchParams?.toString();
  const returnTo = `${pathname || '/'}${queryString ? `?${queryString}` : ''}`;
  const loginHref = `${session.links.login}?returnTo=${encodeURIComponent(returnTo)}`;

  useEffect(() => {
    let isMounted = true;

    const loadSession = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/session/current`, {
          credentials: 'include',
        });
        const data = await response.json();

        if (isMounted) {
          setSession(data);
        }
      } catch (error) {
        if (isMounted) {
          setSession((current) => current);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadSession();

    return () => {
      isMounted = false;
    };
  }, []);

  if (isLoading) {
    return <div className='auth-inline auth-inline--muted'>Loading...</div>;
  }

  if (!session.authenticated) {
    return (
      <a href={loginHref} className='button button--compact'>
        Sign in
      </a>
    );
  }

  return (
    <details className='account-menu'>
      <summary className='account-menu__trigger'>
        <img
          src={session.user.profile.avatar}
          alt={session.user.profile.name}
          className='account-menu__avatar'
        />
        <span className='account-menu__name'>{session.user.profile.name}</span>
        <span className='account-menu__chevron' aria-hidden='true'>
          ▾
        </span>
      </summary>

      <div className='account-menu__panel'>
        <Link href='/chats' className='account-menu__link'>
          Chats
        </Link>
        <Link href='/projects/new' className='account-menu__link'>
          Add project
        </Link>
        <Link
          href={`/profiles/${session.user.profile.id}`}
          className='account-menu__link'
        >
          My profile
        </Link>
        <Link
          href={`/profiles/${session.user.profile.id}/edit`}
          className='account-menu__link'
        >
          Profile settings
        </Link>
        <a href={session.links.logout} className='account-menu__link'>
          Sign out
        </a>
      </div>
    </details>
  );
};

export default AuthControls;
