'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { API_BASE_URL } from '@/lib/api';
import { safeReturnTo } from '../../../../lib/return-to.js';
import { removeTokenFromAddress } from '@/lib/auth-token';

const MagicLinkContent = () => {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const returnTo = useMemo(
    () => safeReturnTo(searchParams.get('returnTo')),
    [searchParams],
  );
  const [status, setStatus] = useState('Signing you in...');
  const [hasError, setHasError] = useState(false);
  const started = useRef(null);

  useEffect(() => {
    if (started.current === token || (!token && started.current !== null)) return;
    started.current = token;
    setHasError(false);
    setStatus('Signing you in...');
    const consume = async () => {
      if (!token) {
        setStatus('Missing magic link token.');
        setHasError(true);
        return;
      }

      try {
        removeTokenFromAddress(window);
        const response = await fetch(
          `${API_BASE_URL}/auth/magic-link/consume`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
            },
            credentials: 'include',
            referrerPolicy: 'no-referrer',
            body: JSON.stringify({ token }),
          },
        );

        const data = await response.json().catch(() => ({}));
        if (started.current !== token) return;

        if (!response.ok) {
          throw new Error(data.error || 'Unable to use this magic link.');
        }

        setStatus('Signed in. Redirecting...');
        window.setTimeout(() => {
          if (started.current === token) window.location.replace(returnTo);
        }, 800);
      } catch (error) {
        if (started.current !== token) return;
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
        <p role='status'>{status}</p>
        {hasError ? (
          <p>If the request failed, open your original link to try again.</p>
        ) : null}
        {hasError ? (
          <Link href={`/auth/sign-in?returnTo=${encodeURIComponent(returnTo)}`} className='button button--ghost'>
            Back to sign in
          </Link>
        ) : null}
      </section>
    </main>
  );
};

const MagicLinkPage = () => (
  <Suspense
    fallback={
      <main className='page-stack'>
        <section className='section-panel'>
          <h1>Magic link sign in</h1>
          <p>Loading your sign-in link...</p>
        </section>
      </main>
    }
  >
    <MagicLinkContent />
  </Suspense>
);

export default MagicLinkPage;
