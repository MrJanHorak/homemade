'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { API_BASE_URL } from '@/lib/api';

const CommentList = ({ projectId, comments }) => {
  const router = useRouter();
  const [viewer, setViewer] = useState(null);
  const [deleting, setDeleting] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [removed, setRemoved] = useState([]);

  useEffect(() => {
    const controller = new AbortController();
    setRemoved([]);
    fetch(`${API_BASE_URL}/api/session/current`, { credentials: 'include', signal: controller.signal })
      .then((response) => response.ok ? response.json() : null)
      .then((session) => {
        if (!controller.signal.aborted && session?.authenticated) setViewer(session.user?.profile || null);
      })
      .catch(() => {});
    return () => controller.abort();
  }, [projectId]);

  const removeComment = async (commentId) => {
    if (!window.confirm('Delete this comment?')) return;
    setDeleting(commentId);
    setError('');
    setMessage('');
    try {
      const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}/comments/${commentId}`, {
        method: 'DELETE', credentials: 'include',
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || 'Unable to delete comment.');
      }
      setRemoved((ids) => [...ids, commentId]);
      setMessage('Comment deleted.');
      router.refresh();
    } catch (err) {
      setError(err.message || 'Unable to delete comment.');
    } finally {
      setDeleting('');
    }
  };

  const visibleComments = comments.filter((comment) => !removed.includes(comment.id));
  return (
    <>
      {error ? <p className='form-error' role='alert'>{error}</p> : null}
      <p className='helper-copy' role='status'>{message}</p>
      <div className='comment-list'>
        {visibleComments.length ? visibleComments.map((comment) => (
          <article key={comment.id} className='comment-card'>
            <div className='comment-card__header'>
              <img src={comment.avatar} alt={comment.name} className='comment-card__avatar' />
              <div>
                <strong>{comment.name}</strong>
                <p>{comment.createdAt ? new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(new Date(comment.createdAt)) : 'Unknown'}</p>
              </div>
            </div>
            <p>{comment.content}</p>
            {viewer && (viewer.id === comment.owner || viewer.role === 'admin') ? (
              <button type='button' className='button button--ghost button--compact' onClick={() => removeComment(comment.id)} disabled={Boolean(deleting)} aria-label={`Delete comment by ${comment.name || 'maker'}`}>
                {deleting === comment.id ? 'Deleting...' : 'Delete comment'}
              </button>
            ) : null}
          </article>
        )) : <p className='empty-copy'>No feedback yet. Be the first to add some context.</p>}
      </div>
    </>
  );
};

export default CommentList;
