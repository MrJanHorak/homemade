'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { API_BASE_URL } from '@/lib/api';

const BlockMakerButton = ({ profileId, profileName, initiallyBlocked }) => {
  const router = useRouter();
  const [blocked, setBlocked] = useState(initiallyBlocked);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const toggleBlock = async () => {
    if (!blocked && !window.confirm(`Block ${profileName}? You and this maker will no longer be able to message each other.`)) return;
    setBusy(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/api/profiles/${profileId}/block`, {
        method: blocked ? 'DELETE' : 'POST',
        credentials: 'include',
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Unable to update block settings.');
      setBlocked(Boolean(payload.blocked));
      router.refresh();
    } catch (toggleError) {
      setError(toggleError.message || 'Unable to update block settings.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <button type='button' className='button button--ghost' onClick={toggleBlock} disabled={busy}>
        {busy ? 'Saving…' : blocked ? 'Unblock maker' : 'Block maker'}
      </button>
      {error ? <p className='form-error' role='alert'>{error}</p> : null}
      {blocked ? <p role='status'>Messaging is disabled with this maker until you unblock them.</p> : null}
    </div>
  );
};

export default BlockMakerButton;
