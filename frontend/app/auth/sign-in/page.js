'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
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

const SignInPage = () => {
  const searchParams = useSearchParams();
  const returnTo = searchParams.get('returnTo') || '/';
  const googleHref = `${API_BASE_URL}/auth/google?returnTo=${encodeURIComponent(returnTo)}`;
  const githubHref = `${API_BASE_URL}/auth/github?returnTo=${encodeURIComponent(returnTo)}`;
  const microsoftHref = `${API_BASE_URL}/auth/microsoft?returnTo=${encodeURIComponent(returnTo)}`;
  const appleHref = `${API_BASE_URL}/auth/apple?returnTo=${encodeURIComponent(returnTo)}`;
  const signUpHref = `/auth/sign-up?returnTo=${encodeURIComponent(returnTo)}`;

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [magicEmail, setMagicEmail] = useState('');
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

  const resetMessages = () => {
    setStatusMessage('');
    setErrorMessage('');
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    resetMessages();
    setIsSubmitting(true);

    try {
      await postJson('/auth/login', {
        email: loginEmail,
        password: loginPassword,
      });

      window.location.assign(returnTo);
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMagicLink = async (event) => {
    event.preventDefault();
    resetMessages();
    setIsSubmitting(true);

    try {
      const result = await postJson('/auth/magic-link/request', {
        email: magicEmail,
        returnTo,
      });

      setStatusMessage(
        result.magicLink
          ? `${result.message} Dev link: ${result.magicLink}`
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
            <p className='eyebrow'>Sign in</p>
            <h1>Access your Homemade account</h1>
            <p className='section-copy'>
              Choose your preferred way to sign in.
            </p>
          </div>
          <Link href='/' className='button button--ghost'>
            Back home
          </Link>
        </div>

        <div className='auth-layout'>
          <div className='auth-card'>
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

            <p className='auth-separator'>or use email and password</p>

            <form className='form-stack' onSubmit={handleLogin}>
              <label>
                Email
                <input
                  type='email'
                  value={loginEmail}
                  onChange={(event) => setLoginEmail(event.target.value)}
                  required
                />
              </label>
              <label>
                Password
                <input
                  type='password'
                  value={loginPassword}
                  onChange={(event) => setLoginPassword(event.target.value)}
                  required
                />
              </label>
              <button type='submit' className='button' disabled={isSubmitting}>
                Sign in with email
              </button>
            </form>

            <p className='auth-meta'>
              Need an account?{' '}
              <Link href={signUpHref} className='text-link'>
                Create one
              </Link>
            </p>
          </div>

          <div className='auth-card auth-card--secondary'>
            <h2>Passwordless option</h2>
            <p className='section-copy'>
              Use a magic link if your account already exists and your email is
              verified.
            </p>
            <form className='form-stack' onSubmit={handleMagicLink}>
              <label>
                Email
                <input
                  type='email'
                  value={magicEmail}
                  onChange={(event) => setMagicEmail(event.target.value)}
                  required
                />
              </label>
              <button
                type='submit'
                className='button button--ghost'
                disabled={isSubmitting}
              >
                Send sign-in link
              </button>
            </form>
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

export default SignInPage;
