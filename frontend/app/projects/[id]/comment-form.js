'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';

const CommentForm = ({ projectId, ownerId }) => {
  const router = useRouter();
  const [content, setContent] = useState('');
  const [rating, setRating] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadSession = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/session/current`, {
          credentials: 'include',
        });

        if (!response.ok) {
          if (isMounted) setIsAuthenticated(false);
          return;
        }

        const data = await response.json();

        if (isMounted) {
          setIsAuthenticated(Boolean(data.authenticated));
          setIsOwner(
            Boolean(data.user?.profile?.id && data.user.profile.id === ownerId),
          );
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
  }, [ownerId]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/projects/${projectId}/comments`,
        {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ content, rating }),
        },
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'Unable to save comment');
      }

      setContent('');
      setRating('');
      setSuccess('Your feedback was saved.');
      router.refresh();
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isAuthenticated === null) return null;

  if (!isAuthenticated) {
    const returnTo = encodeURIComponent(`/projects/${projectId}`);
    return (
      <Link href={`/auth/sign-in?returnTo=${returnTo}`} className='button button--ghost'>
        Sign in to rate or comment
      </Link>
    );
  }

  return (
    <form className='comment-form' onSubmit={handleSubmit}>
      <div className='comment-form__header'>
        <h3>Rate or comment</h3>
      </div>

      <label>
        Rating
        <select
          value={rating}
          onChange={(event) => setRating(event.target.value)}
          disabled={isOwner}
        >
          <option value=''>Choose a rating</option>
          <option value='1'>1</option>
          <option value='2'>2</option>
          <option value='3'>3</option>
          <option value='4'>4</option>
          <option value='5'>5</option>
        </select>
      </label>

      {isOwner ? (
        <p className='helper-copy'>
          You can comment on your project, but you cannot rate it.
        </p>
      ) : (
        <p className='helper-copy'>
          Updating your rating will replace your previous score.
        </p>
      )}

      <label>
        Comment
        <textarea
          rows='5'
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder='Share what worked, what you would change, or what you learned.'
        />
      </label>

      {error ? <p className='form-error' role='alert'>{error}</p> : null}
      <p className='helper-copy' role='status'>{success}</p>

      <button type='submit' className='button' disabled={isSubmitting}>
        {isSubmitting ? 'Saving...' : 'Post feedback'}
      </button>
    </form>
  );
};

export default CommentForm;
