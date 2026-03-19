'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { API_BASE_URL } from '@/lib/api';

const ProjectActions = ({ projectId, ownerId }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    const loadSession = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/session/current`, {
          credentials: 'include',
        });

        if (!response.ok) {
          return;
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

          if (saveStatusResponse.ok) {
            const saveStatus = await saveStatusResponse.json();
            if (isMounted) {
              setIsSaved(Boolean(saveStatus.saved));
            }
          }
        }
      } catch {
        if (isMounted) {
          setIsAuthenticated(false);
          setIsOwner(false);
        }
      }
    };

    loadSession();

    return () => {
      isMounted = false;
    };
  }, [ownerId, projectId]);

  const toggleSave = async () => {
    if (!isAuthenticated || isOwner || isSaving) {
      return;
    }

    setIsSaving(true);
    setError('');

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
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isAuthenticated) {
    return null;
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
          >
            {isSaving ? 'Saving...' : isSaved ? 'Saved' : 'Save project'}
          </button>
        )}
      </div>
      {error ? <p className='form-error'>{error}</p> : null}
    </>
  );
};

export default ProjectActions;
