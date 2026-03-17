'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { API_BASE_URL } from '@/lib/api';

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
  const returnTo = searchParams.get('returnTo') || '/';
  const googleHref = `${API_BASE_URL}/auth/google?returnTo=${encodeURIComponent(returnTo)}`;
  const githubHref = `${API_BASE_URL}/auth/github?returnTo=${encodeURIComponent(returnTo)}`;
  const microsoftHref = `${API_BASE_URL}/auth/microsoft?returnTo=${encodeURIComponent(returnTo)}`;
  const appleHref = `${API_BASE_URL}/auth/apple?returnTo=${encodeURIComponent(returnTo)}`;
  const signInHref = `/auth/sign-in?returnTo=${encodeURIComponent(returnTo)}`;

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [providers, setProviders] = useState({
    google: true,
    github: true,
    microsoft: true,
    apple: true,
  });

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
          apple: Boolean(data.providers.apple?.enabled),
        });
      } catch {
        // Keep default visible buttons when provider metadata cannot be loaded.
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
              Use email and password, then verify your email.
            </p>
          </div>
          <Link href='/' className='button button--ghost'>
            Back home
          </Link>
        </div>

        <div className='auth-layout auth-layout--single'>
          <div className='auth-card'>
            <form className='form-stack' onSubmit={handleSignup}>
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
            </form>

            <p className='auth-separator'>or continue with social sign-in</p>
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
              {providers.apple ? (
                <a href={appleHref} className='button button--ghost'>
                  Continue with Apple
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
