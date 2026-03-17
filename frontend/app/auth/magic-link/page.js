'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { API_BASE_URL } from '@/lib/api';

const MagicLinkPage = () => {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const returnTo = useMemo(
    () => searchParams.get('returnTo') || '/',
    [searchParams],
  );
  const [status, setStatus] = useState('Signing you in...');
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const consume = async () => {
      if (!token) {
        setStatus('Missing magic link token.');
        setHasError(true);
        return;
      }

      try {
        const response = await fetch(
          `${API_BASE_URL}/auth/magic-link/consume`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({ token }),
          },
        );

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(data.error || 'Unable to use this magic link.');
        }

        setStatus('Signed in. Redirecting...');
        window.setTimeout(() => {
          window.location.assign(returnTo);
        }, 800);
      } catch (error) {
        setStatus(error.message);
        setHasError(true);
      }
    };

    consume();
  }, [token, returnTo]);

  return (
    <main className='page-stack'>
      <section className='section-panel'>
        <h1>Magic link sign in</h1>
        <p>{status}</p>
        {hasError ? (
          <Link href='/auth/sign-in' className='button button--ghost'>
            Back to sign in
          </Link>
        ) : null}
      </section>
    </main>
  );
};

export default MagicLinkPage;
