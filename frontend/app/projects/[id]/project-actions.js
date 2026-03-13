'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { API_BASE_URL } from '@/lib/api';

const ProjectActions = ({ projectId, ownerId }) => {
  const [isOwner, setIsOwner] = useState(false);

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

        setIsOwner(
          Boolean(data.user?.profile?.id && data.user.profile.id === ownerId),
        );
      } catch {
        if (isMounted) {
          setIsOwner(false);
        }
      }
    };

    loadSession();

    return () => {
      isMounted = false;
    };
  }, [ownerId]);

  if (!isOwner) {
    return null;
  }

  return (
    <div className='page-actions'>
      <Link
        href={`/projects/${projectId}/edit`}
        className='button button--ghost'
      >
        Edit project
      </Link>
    </div>
  );
};

export default ProjectActions;
