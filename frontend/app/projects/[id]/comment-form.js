'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { API_BASE_URL } from '@/lib/api';

const CommentForm = ({ projectId, ownerId }) => {
  const router = useRouter();
  const [viewer, setViewer] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [retry, setRetry] = useState(0);
  const [rating, setRating] = useState('');
  const [savedRating, setSavedRating] = useState(null);
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState('');
  const [ratingError, setRatingError] = useState('');
  const [commentError, setCommentError] = useState('');
  const [ratingMessage, setRatingMessage] = useState('');
  const [commentMessage, setCommentMessage] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    setViewer(null);
    setLoadError('');
    const load = async () => {
      try {
        const sessionResponse = await fetch(`${API_BASE_URL}/api/session/current`, {
          credentials: 'include', signal: controller.signal,
        });
        if (!sessionResponse.ok) throw new Error('Unable to load your account.');
        const session = await sessionResponse.json();
        if (!session.authenticated) {
          if (!controller.signal.aborted) setViewer({ authenticated: false });
          return;
        }
        const isOwner = session.user?.profile?.id === ownerId;
        if (!isOwner) {
          const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}/rating`, {
            credentials: 'include', signal: controller.signal,
          });
          if (!response.ok) throw new Error('Unable to load your rating.');
          const data = await response.json();
          if (controller.signal.aborted) return;
          setSavedRating(data.rating);
          setRating(data.rating == null ? '' : String(data.rating));
        }
        if (!controller.signal.aborted) setViewer({ authenticated: true, isOwner });
      } catch (error) {
        if (!controller.signal.aborted) setLoadError(error.message || 'Unable to load feedback.');
      }
    };
    load();
    return () => controller.abort();
  }, [ownerId, projectId, retry]);

  const submit = async (kind, payload) => {
    setSubmitting(kind);
    if (kind === 'rating') { setRatingError(''); setRatingMessage(''); }
    else { setCommentError(''); setCommentMessage(''); }
    try {
      const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}/comments`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || 'Unable to save feedback.');
      }
      if (kind === 'rating') {
        setSavedRating(Number(payload.rating));
        setRatingMessage('Your rating was saved.');
      } else {
        setContent('');
        setCommentMessage('Your comment was posted.');
      }
      router.refresh();
    } catch (error) {
      if (kind === 'rating') setRatingError(error.message || 'Unable to save rating.');
      else setCommentError(error.message || 'Unable to post comment.');
    } finally {
      setSubmitting('');
    }
  };

  if (loadError) return <p className='form-error' role='alert'>{loadError} <button type='button' onClick={() => setRetry((value) => value + 1)}>Try again</button></p>;
  if (!viewer) return <p className='helper-copy' role='status'>Loading feedback options...</p>;
  if (!viewer.authenticated) {
    return <Link href={`/auth/sign-in?returnTo=${encodeURIComponent(`/projects/${projectId}`)}`} className='button button--ghost'>Sign in to rate or comment</Link>;
  }

  return (
    <div>
      {!viewer.isOwner ? (
        <form className='comment-form' onSubmit={(event) => { event.preventDefault(); submit('rating', { rating }); }}>
          <div className='comment-form__header'><h3>Your rating</h3></div>
          <p className='helper-copy'>{savedRating == null ? 'You have not rated this project yet.' : `Your current rating: ${savedRating} out of 5.`}</p>
          <label>
            Rating
            <select value={rating} onChange={(event) => setRating(event.target.value)} required>
              <option value=''>Choose a rating</option>
              {[1, 2, 3, 4, 5].map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
          {ratingError ? <p className='form-error' role='alert'>{ratingError}</p> : null}
          <p className='helper-copy' role='status'>{ratingMessage}</p>
          <button type='submit' className='button' disabled={Boolean(submitting)}>{submitting === 'rating' ? 'Saving...' : savedRating == null ? 'Save rating' : 'Update rating'}</button>
        </form>
      ) : <p className='helper-copy'>You can comment on your project, but you cannot rate it.</p>}
      <form className='comment-form' onSubmit={(event) => { event.preventDefault(); submit('comment', { content }); }}>
        <div className='comment-form__header'><h3>Post a comment</h3></div>
        <label>
          Comment
          <textarea rows='5' value={content} onChange={(event) => setContent(event.target.value)} required placeholder='Share what worked, what you would change, or what you learned.' />
        </label>
        {commentError ? <p className='form-error' role='alert'>{commentError}</p> : null}
        <p className='helper-copy' role='status'>{commentMessage}</p>
        <button type='submit' className='button' disabled={Boolean(submitting)}>{submitting === 'comment' ? 'Posting...' : 'Post comment'}</button>
      </form>
    </div>
  );
};

export default CommentForm;
