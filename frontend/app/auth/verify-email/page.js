'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { API_BASE_URL } from '@/lib/api';

const VerifyEmailPage = () => {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const [status, setStatus] = useState('Verifying your email...');
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const verify = async () => {
      if (!token) {
        setStatus('Missing verification token.');
        setHasError(true);
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/auth/verify-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ token }),
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(data.error || 'Unable to verify email.');
        }

        setStatus('Email verified. Redirecting...');
        window.setTimeout(() => {
          window.location.assign('/');
        }, 800);
      } catch (error) {
        setStatus(error.message);
        setHasError(true);
      }
    };

    verify();
  }, [token]);

  return (
    <main className='page-stack'>
      <section className='section-panel'>
        <h1>Email verification</h1>
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

export default VerifyEmailPage;
