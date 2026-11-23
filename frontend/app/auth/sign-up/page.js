'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { API_BASE_URL } from '@/lib/api';
import { safeReturnTo } from '../../../../lib/return-to.js';

const postJson = async (path, payload) => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || 'Request failed');
  }

  return data;
};

const SignUpContent = () => {
  const searchParams = useSearchParams();
  const returnTo = safeReturnTo(searchParams.get('returnTo'));
  const googleHref = `${API_BASE_URL}/auth/google?returnTo=${encodeURIComponent(returnTo)}`;
  const githubHref = `${API_BASE_URL}/auth/github?returnTo=${encodeURIComponent(returnTo)}`;
  const microsoftHref = `${API_BASE_URL}/auth/microsoft?returnTo=${encodeURIComponent(returnTo)}`;
  const signInHref = `/auth/sign-in?returnTo=${encodeURIComponent(returnTo)}`;

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [providers, setProviders] = useState({
    google: false,
    github: false,
    microsoft: false,
  });
  const [debugLinksEnabled, setDebugLinksEnabled] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadProviders = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/providers`, {
          credentials: 'include',
        });
        if (!response.ok) {
          return;
        }

        const data = await response.json();
        if (!mounted || !data?.providers) {
          return;
        }

        setProviders({
          google: Boolean(data.providers.google?.enabled),
          github: Boolean(data.providers.github?.enabled),
          microsoft: Boolean(data.providers.microsoft?.enabled),
        });
        setDebugLinksEnabled(Boolean(data.emailDebugLinksEnabled));
      } catch {
        setErrorMessage('Unable to load sign-up options. Refresh to try again.');
      }
    };

    loadProviders();

    return () => {
      mounted = false;
    };
  }, []);

  const handleSignup = async (event) => {
    event.preventDefault();
    setStatusMessage('');
    setErrorMessage('');
    setIsSubmitting(true);

    try {
      const result = await postJson('/auth/signup', {
        name,
        email,
        password,
        returnTo,
      });

      setStatusMessage(
        result.verificationLink
          ? `${result.message} Dev link: ${result.verificationLink}`
          : result.message,
      );
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className='page-stack'>
      <section className='section-panel section-panel--tight auth-shell'>
        <div className='section-panel__header'>
          <div>
            <p className='eyebrow'>Sign up</p>
            <h1>Create your Homemade account</h1>
            <p className='section-copy'>
              {debugLinksEnabled ? 'Choose a provider or create a local test account.' : 'Choose an available sign-in provider to create your account.'}
            </p>
          </div>
          <Link href='/' className='button button--ghost'>
            Back home
          </Link>
        </div>

        <div className='auth-layout auth-layout--single'>
          <div className='auth-card'>
            {debugLinksEnabled ? <form className='form-stack' onSubmit={handleSignup}>
              <label>
                Display name
                <input
                  type='text'
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </label>
              <label>
                Email
                <input
                  type='email'
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </label>
              <label>
                Password
                <input
                  type='password'
                  minLength={8}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
              </label>
              <button type='submit' className='button' disabled={isSubmitting}>
                Create account
              </button>
            </form> : null}

            {debugLinksEnabled ? <p className='auth-separator'>or continue with social sign-in</p> : null}
            <div className='social-grid'>
              {providers.google ? (
                <a href={googleHref} className='button button--ghost'>
                  Continue with Google
                </a>
              ) : null}
              {providers.github ? (
                <a href={githubHref} className='button button--ghost'>
                  Continue with GitHub
                </a>
              ) : null}
              {providers.microsoft ? (
                <a href={microsoftHref} className='button button--ghost'>
                  Continue with Microsoft
                </a>
              ) : null}
            </div>

            <p className='auth-meta'>
              Already have an account?{' '}
              <Link href={signInHref} className='text-link'>
                Sign in
              </Link>
            </p>
          </div>
        </div>

        {statusMessage ? (
          <p className='auth-feedback'>{statusMessage}</p>
        ) : null}
        {errorMessage ? (
          <p className='auth-feedback auth-feedback--error'>{errorMessage}</p>
        ) : null}
      </section>
    </main>
  );
};

const SignUpPage = () => (
  <Suspense
    fallback={
      <main className='page-stack'>
        <section className='section-panel section-panel--tight auth-shell'>
          <p className='eyebrow'>Sign up</p>
          <h1>Loading sign-up form...</h1>
        </section>
      </main>
    }
  >
    <SignUpContent />
  </Suspense>
);

export default SignUpPage;
