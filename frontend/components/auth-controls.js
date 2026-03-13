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
    return (
      <div className='auth-strip auth-strip--muted'>Loading session...</div>
    );
  }

  if (!session.authenticated) {
    return (
      <div className='auth-strip'>
        <span>
          Browse public builds now, sign in when you want to post or chat.
        </span>
        <a href={loginHref} className='button'>
          Sign in with Google
        </a>
      </div>
    );
  }

  return (
    <div className='auth-strip auth-strip--active'>
      <div className='auth-strip__user'>
        <img
          src={session.user.profile.avatar}
          alt={session.user.profile.name}
          className='auth-strip__avatar'
        />
        <span>{session.user.profile.name}</span>
      </div>

      <div className='auth-strip__actions'>
        <Link href='/projects/new' className='button button--ghost'>
          Add project
        </Link>
        <Link href='/chats' className='button button--ghost'>
          Chats
        </Link>
        <Link
          href={`/profiles/${session.user.profile.id}`}
          className='button button--ghost'
        >
          My profile
        </Link>
        <a href={session.links.logout} className='button'>
          Sign out
        </a>
      </div>
    </div>
  );
};

export default AuthControls;
