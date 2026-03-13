'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';

const CommentForm = ({ projectId }) => {
  const router = useRouter();
  const [content, setContent] = useState('');
  const [rating, setRating] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError('');

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
      router.refresh();
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className='comment-form' onSubmit={handleSubmit}>
      <div className='comment-form__header'>
        <h3>Rate or comment</h3>
        <p>Posting uses your existing Express session.</p>
      </div>

      <label>
        Rating
        <select
          value={rating}
          onChange={(event) => setRating(event.target.value)}
        >
          <option value=''>Choose a rating</option>
          <option value='1'>1</option>
          <option value='2'>2</option>
          <option value='3'>3</option>
          <option value='4'>4</option>
          <option value='5'>5</option>
        </select>
      </label>

      <label>
        Comment
        <textarea
          rows='5'
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder='Share what worked, what you would change, or what you learned.'
        />
      </label>

      {error ? <p className='form-error'>{error}</p> : null}

      <button type='submit' className='button' disabled={isSubmitting}>
        {isSubmitting ? 'Saving...' : 'Post feedback'}
      </button>
    </form>
  );
};

export default CommentForm;
