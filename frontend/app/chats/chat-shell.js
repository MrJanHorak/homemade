'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { API_BASE_URL } from '@/lib/api';

const emptySession = {
  authenticated: false,
  user: null,
  links: {
    login: `${API_BASE_URL}/auth/google`,
    logout: `${API_BASE_URL}/auth/logout`,
  },
};

const formatTimestamp = (value) => {
  if (!value) {
    return '';
  }

  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    month: 'short',
    day: 'numeric',
  }).format(new Date(value));
};

const ChatShell = ({ chatId }) => {
  const [session, setSession] = useState(emptySession);
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const returnTo = useMemo(
    () => (chatId ? `/chats/${chatId}` : '/chats'),
    [chatId],
  );

  const loadChats = async () => {
    const chatsResponse = await fetch(`${API_BASE_URL}/api/chats`, {
      credentials: 'include',
    });

    if (chatsResponse.status === 401) {
      setSession(emptySession);
      setChats([]);
      setActiveChat(null);
      return;
    }

    const chatsData = await chatsResponse.json();
    setChats(chatsData.chats || []);

    if (!chatId && chatsData.chats?.length) {
      setActiveChat(null);
      return;
    }

    if (chatId) {
      const chatResponse = await fetch(`${API_BASE_URL}/api/chats/${chatId}`, {
        credentials: 'include',
      });

      if (chatResponse.ok) {
        const chatData = await chatResponse.json();
        setActiveChat(chatData.chat);
      } else {
        setActiveChat(null);
      }
    }
  };

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      setIsLoading(true);
      setError('');

      try {
        const sessionResponse = await fetch(
          `${API_BASE_URL}/api/session/current`,
          {
            credentials: 'include',
          },
        );
        const sessionData = await sessionResponse
          .json()
          .catch(() => emptySession);

        if (!isMounted) {
          return;
        }

        setSession(sessionData);

        if (!sessionData.authenticated) {
          setChats([]);
          setActiveChat(null);
          return;
        }

        await loadChats();
      } catch {
        if (isMounted) {
          setError('Unable to load chats');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [chatId]);

  useEffect(() => {
    if (!session.authenticated || !chatId) {
      return;
    }

    const intervalId = setInterval(() => {
      loadChats().catch(() => {});
    }, 5000);

    return () => {
      clearInterval(intervalId);
    };
  }, [chatId, session.authenticated]);

  const handleSendMessage = async (event) => {
    event.preventDefault();
    if (!message.trim() || !chatId) {
      return;
    }

    setIsSending(true);
    setError('');

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/chats/${chatId}/messages`,
        {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ message }),
        },
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'Unable to send message');
      }

      const payload = await response.json();
      setActiveChat(payload.chat);
      setMessage('');
      await loadChats();
    } catch (sendError) {
      setError(sendError.message);
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading) {
    return (
      <section className='section-panel section-panel--tight'>
        <p className='eyebrow'>Chats</p>
        <h1>Loading conversations...</h1>
      </section>
    );
  }

  if (!session.authenticated) {
    return (
      <section className='section-panel section-panel--tight'>
        <p className='eyebrow'>Chats</p>
        <h1>Sign in to view your chats.</h1>
        <div className='page-actions'>
          <a
            href={`${API_BASE_URL}/auth/google?returnTo=${encodeURIComponent(returnTo)}`}
            className='button'
          >
            Sign in with Google
          </a>
          <Link href='/profiles' className='button button--ghost'>
            Browse makers
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className='section-panel'>
      <div className='section-panel__header'>
        <div>
          <p className='eyebrow'>Chats</p>
          <h1>Direct messages</h1>
        </div>
      </div>

      <div className='chat-layout'>
        <aside className='chat-sidebar'>
          {chats.length ? (
            chats.map((chat) => (
              <Link
                key={chat.id}
                href={`/chats/${chat.id}`}
                className={`chat-sidebar__item ${chatId === chat.id ? 'chat-sidebar__item--active' : ''}`}
              >
                <img
                  src={
                    chat.otherUser?.avatar ||
                    'https://placehold.co/100x100?text=HM'
                  }
                  alt={chat.otherUser?.name || 'Chat user'}
                  className='chat-sidebar__avatar'
                />
                <div>
                  <strong>{chat.otherUser?.name || 'Conversation'}</strong>
                  <p>
                    {chat.messages.length
                      ? chat.messages.at(-1)?.message
                      : 'No messages yet'}
                  </p>
                </div>
              </Link>
            ))
          ) : (
            <p className='empty-copy'>
              No chats yet. Start one from a profile page.
            </p>
          )}
        </aside>

        <div className='chat-thread'>
          {activeChat ? (
            <>
              <header className='chat-thread__header'>
                <h2>{activeChat.otherUser?.name || 'Conversation'}</h2>
              </header>

              <div className='chat-thread__messages'>
                {activeChat.messages.length ? (
                  activeChat.messages.map((entry) => {
                    const isMine = entry.user?.id === session.user?.profile?.id;

                    return (
                      <article
                        key={entry.id}
                        className={`chat-bubble ${isMine ? 'chat-bubble--mine' : ''}`}
                      >
                        {!isMine ? (
                          <strong>{entry.user?.name || 'User'}</strong>
                        ) : null}
                        <p>{entry.message}</p>
                        <span>{formatTimestamp(entry.timestamp)}</span>
                      </article>
                    );
                  })
                ) : (
                  <p className='empty-copy'>No messages yet. Say hello.</p>
                )}
              </div>

              <form
                className='chat-thread__composer'
                onSubmit={handleSendMessage}
              >
                <input
                  type='text'
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder='Type a message...'
                />
                <button type='submit' className='button' disabled={isSending}>
                  {isSending ? 'Sending...' : 'Send'}
                </button>
              </form>
            </>
          ) : (
            <div className='chat-thread__empty'>
              <h2>Select a conversation</h2>
              <p className='empty-copy'>
                Choose one from the left to read and send messages.
              </p>
            </div>
          )}
          {error ? <p className='form-error'>{error}</p> : null}
        </div>
      </div>
    </section>
  );
};

export default ChatShell;
