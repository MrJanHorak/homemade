'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { API_BASE_URL } from '@/lib/api';

const ProjectActions = ({ projectId, ownerId }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const [isOwner, setIsOwner] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [statusReady, setStatusReady] = useState(false);
  const [retry, setRetry] = useState(0);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let isMounted = true;

    const loadSession = async () => {
      setStatusReady(false);
      setError('');
      try {
        const response = await fetch(`${API_BASE_URL}/api/session/current`, {
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error('Unable to check your account.');
        }

        const data = await response.json();
        if (!isMounted) {
          return;
        }

        const authenticated = Boolean(data.authenticated);
        const ownerMatch = Boolean(
          data.user?.profile?.id && data.user.profile.id === ownerId,
        );

        setIsAuthenticated(authenticated);
        setIsOwner(ownerMatch);

        if (authenticated && !ownerMatch) {
          const saveStatusResponse = await fetch(
            `${API_BASE_URL}/api/projects/${projectId}/save-status`,
            {
              credentials: 'include',
            },
          );

          if (!saveStatusResponse.ok) throw new Error('Unable to check whether this project is saved.');
          const saveStatus = await saveStatusResponse.json();
          if (isMounted) setIsSaved(Boolean(saveStatus.saved));
        }
        if (isMounted) setStatusReady(true);
      } catch {
        if (isMounted) {
          setError('Unable to check your account or saved status.');
        }
      }
    };

    loadSession();

    return () => {
      isMounted = false;
    };
  }, [ownerId, projectId, retry]);

  const toggleSave = async () => {
    if (!isAuthenticated || isOwner || isSaving) {
      return;
    }

    setIsSaving(true);
    setError('');
    setMessage('');

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/projects/${projectId}/save`,
        {
          method: isSaved ? 'DELETE' : 'POST',
          credentials: 'include',
        },
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'Unable to update saved project');
      }

      const payload = await response.json();
      setIsSaved(Boolean(payload.saved));
      setMessage(payload.saved ? 'Project saved.' : 'Project removed from saved projects.');
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (!statusReady) {
    return error ? (
      <p className='form-error' role='alert'>
        {error} <button type='button' onClick={() => setRetry((value) => value + 1)}>Try again</button>
      </p>
    ) : <p className='helper-copy' role='status'>Checking project actions...</p>;
  }

  if (!isAuthenticated) {
    return (
      <Link href={`/auth/sign-in?returnTo=${encodeURIComponent(`/projects/${projectId}`)}`} className='button button--ghost'>
        Sign in to save this project
      </Link>
    );
  }

  return (
    <>
      <div className='page-actions'>
        {isOwner ? (
          <Link
            href={`/projects/${projectId}/edit`}
            className='button button--ghost'
          >
            Edit project
          </Link>
        ) : (
          <button
            type='button'
            className='button button--ghost'
            onClick={toggleSave}
            disabled={isSaving}
            aria-pressed={isSaved}
          >
            {isSaving ? 'Saving...' : isSaved ? 'Remove from saved projects' : 'Save project'}
          </button>
        )}
      </div>
      {error ? <p className='form-error' role='alert'>{error}</p> : null}
      <p className='helper-copy' role='status'>{message}</p>
    </>
  );
};

export default ProjectActions;
