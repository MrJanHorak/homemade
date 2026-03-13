'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { API_BASE_URL } from '@/lib/api';

const StartChatButton = ({ profileId }) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleStartChat = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/chats`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user2: profileId }),
      });

      if (response.status === 401) {
        window.location.href = `${API_BASE_URL}/auth/google?returnTo=${encodeURIComponent(`/profiles/${profileId}`)}`;
        return;
      }

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.chat?.id) {
        throw new Error(data.error || 'Unable to start chat');
      }

      router.push(`/chats/${data.chat.id}`);
    } catch (startError) {
      setError(startError.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className='inline-form'>
      <button
        type='button'
        className='button'
        onClick={handleStartChat}
        disabled={isLoading}
      >
        {isLoading ? 'Starting chat...' : 'Contact maker'}
      </button>
      {error ? <p className='form-error'>{error}</p> : null}
    </div>
  );
};

export default StartChatButton;
