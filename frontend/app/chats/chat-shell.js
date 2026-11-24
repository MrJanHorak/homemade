'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { API_BASE_URL } from '@/lib/api';
import { MAX_CHAT_MESSAGE_LENGTH } from '../../../lib/chat-message.js';

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

const mergeChatMessages = (older = [], newer = []) => {
  const messages = new Map();
  [...older, ...newer].forEach((entry) => messages.set(entry.id, entry));
  return [...messages.values()].sort((a, b) => (
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    || a.id.localeCompare(b.id)
  ));
};

const ChatShell = ({ chatId }) => {
  const router = useRouter();
  const [session, setSession] = useState(emptySession);
  const [chats, setChats] = useState([]);
  const [inboxPage, setInboxPage] = useState(1);
  const [inboxHasMore, setInboxHasMore] = useState(false);
  const [isLoadingMoreChats, setIsLoadingMoreChats] = useState(false);
  const [activeChat, setActiveChat] = useState(null);
  const [isLoadingOlderMessages, setIsLoadingOlderMessages] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [hidingChatId, setHidingChatId] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [retryLoad, setRetryLoad] = useState(0);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState('');
  const composerRef = useRef(null);
  const requestVersion = useRef(0);
  const inboxPageRef = useRef(1);

  const returnTo = useMemo(
    () => (chatId ? `/chats/${chatId}` : '/chats'),
    [chatId],
  );

  const loadChats = async () => {
    const version = ++requestVersion.current;
    const chatsResponse = await fetch(`${API_BASE_URL}/api/chats?summary=1&page=1&limit=30`, {
      credentials: 'include',
    });
    if (version !== requestVersion.current) return;

    if (chatsResponse.status === 401) {
      setSession(emptySession);
      setChats([]);
      setActiveChat(null);
      return;
    }

    if (!chatsResponse.ok) throw new Error('Unable to load conversations.');

    const chatsData = await chatsResponse.json();
    if (version !== requestVersion.current) return;
    const firstPage = chatsData.chats || [];
    setChats((previous) => {
      if (inboxPageRef.current === 1) return firstPage;
      const firstIds = new Set(firstPage.map((chat) => chat.id));
      return [...firstPage, ...previous.filter((chat) => !firstIds.has(chat.id))];
    });
    setInboxHasMore(Boolean(chatsData.hasMore));

    if (!chatId && chatsData.chats?.length) {
      setActiveChat(null);
      return;
    }

    if (chatId) {
      const chatResponse = await fetch(`${API_BASE_URL}/api/chats/${chatId}?summary=1`, {
        credentials: 'include',
      });
      if (version !== requestVersion.current) return;

      if (chatResponse.ok) {
        const chatData = await chatResponse.json();
        if (version === requestVersion.current) {
          setActiveChat((previous) => ({
            ...chatData.chat,
            messages: mergeChatMessages(previous?.id === chatId ? previous.messages : [], chatData.chat.messages),
          }));
        }
      } else {
        setActiveChat(null);
      }
    }
  };

  const loadOlderMessages = async () => {
    if (!chatId || !activeChat?.hasMoreOlder || !activeChat.messages.length || isLoadingOlderMessages) return;
    setIsLoadingOlderMessages(true);
    try {
      const before = activeChat.messages[0].id;
      const response = await fetch(`${API_BASE_URL}/api/chats/${chatId}/messages?before=${before}&limit=50`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Unable to load older messages.');
      const payload = await response.json();
      setActiveChat((previous) => previous?.id === chatId ? {
        ...previous,
        messages: mergeChatMessages(payload.messages, previous.messages),
        hasMoreOlder: Boolean(payload.hasMoreOlder),
      } : previous);
    } catch {
      setError('Unable to load older messages. Try again.');
    } finally {
      setIsLoadingOlderMessages(false);
    }
  };

  const loadMoreChats = async () => {
    if (isLoadingMoreChats || !inboxHasMore) return;
    setIsLoadingMoreChats(true);
    try {
      const nextPage = inboxPage + 1;
      const response = await fetch(`${API_BASE_URL}/api/chats?summary=1&page=${nextPage}&limit=30`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Unable to load more conversations.');
      const payload = await response.json();
      setChats((previous) => {
        const seen = new Set(previous.map((chat) => chat.id));
        return [...previous, ...(payload.chats || []).filter((chat) => !seen.has(chat.id))];
      });
      inboxPageRef.current = nextPage;
      setInboxPage(nextPage);
      setInboxHasMore(Boolean(payload.hasMore));
    } catch {
      setError('Unable to load more conversations. Try again.');
    } finally {
      setIsLoadingMoreChats(false);
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
        if (!sessionResponse.ok) throw new Error('Unable to load your account.');
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
      requestVersion.current += 1;
    };
  }, [chatId, retryLoad]);

  useEffect(() => {
    if (!session.authenticated || !chatId) {
      return;
    }

    let stopped = false;
    let timer;
    const poll = async () => {
      try { await loadChats(); } catch { /* Keep the last successful view and retry. */ }
      if (!stopped) timer = setTimeout(poll, 5000);
    };
    timer = setTimeout(poll, 5000);

    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [chatId, session.authenticated]);

  const handleSendMessage = async (event) => {
    event.preventDefault();
    if (!message.trim() || !chatId || isSending || isEditing) {
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
      requestVersion.current += 1;
      setActiveChat((previous) => ({
        ...payload.chat,
        messages: mergeChatMessages(previous?.id === chatId ? previous.messages : [], payload.chat.messages),
        hasMoreOlder: previous?.id === chatId ? previous.hasMoreOlder : false,
      }));
      setMessage('');
      if (composerRef.current) {
        composerRef.current.style.height = 'auto';
      }
      await loadChats().catch(() => setError('Message sent, but the conversation list could not be refreshed.'));
    } catch (sendError) {
      setError(sendError.message);
    } finally {
      setIsSending(false);
    }
  };

  const handleHideChat = async (hideChatId) => {
    if (hidingChatId) return;
    setHidingChatId(hideChatId);
    setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/api/chats/${hideChatId}/hide`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Unable to hide this conversation.');
      requestVersion.current += 1;
      setChats((prev) => prev.filter((chat) => chat.id !== hideChatId));
      if (chatId === hideChatId) {
        setActiveChat(null);
        router.replace('/chats');
      }
    } catch {
      setError('Unable to hide this conversation. Try again.');
    } finally {
      setHidingChatId('');
    }
  };

  const handleEditStart = (msg) => {
    setEditingMessageId(msg.id);
    setEditText(msg.message);
  };

  const handleEditCancel = () => {
    setEditingMessageId(null);
    setEditText('');
  };

  const handleEditSave = async (messageId) => {
    if (!editText.trim() || !chatId || isEditing || isSending) {
      return;
    }

    setIsEditing(true);
    setError('');
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/chats/${chatId}/messages/${messageId}`,
        {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: editText }),
        },
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        setError(payload.error || 'Unable to edit message');
        return;
      }

      const payload = await response.json();
      requestVersion.current += 1;
      setActiveChat((previous) => ({
        ...payload.chat,
        messages: mergeChatMessages(previous?.id === chatId ? previous.messages : [], payload.chat.messages),
        hasMoreOlder: previous?.id === chatId ? previous.hasMoreOlder : false,
      }));
      setEditingMessageId(null);
      setEditText('');
    } catch {
      setError('Unable to edit message');
    } finally {
      setIsEditing(false);
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

  if (!session.authenticated && error) {
    return (
      <section className='section-panel section-panel--tight'>
        <h1>Unable to load conversations</h1>
        <p role='alert'>{error}</p>
        <button type='button' className='button' onClick={() => setRetryLoad((value) => value + 1)}>Try again</button>
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
            href={`/auth/sign-in?returnTo=${encodeURIComponent(returnTo)}`}
            className='button'
          >
            Sign in
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

      {error ? <p className='form-error' role='alert'>{error}</p> : null}
      <div className={`chat-layout ${chatId ? 'chat-layout--thread' : 'chat-layout--inbox'}`}>
        <aside className='chat-sidebar'>
          {chats.length ? (
            chats.map((chat) => (
              <div key={chat.id} className='chat-sidebar__item-wrapper'>
                <Link
                  href={`/chats/${chat.id}`}
                  className={`chat-sidebar__item ${chatId === chat.id ? 'chat-sidebar__item--active' : ''}`}
                  aria-current={chatId === chat.id ? 'page' : undefined}
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
                <button
                  className='chat-sidebar__hide-btn'
                  type='button'
                  onClick={() => handleHideChat(chat.id)}
                  disabled={Boolean(hidingChatId)}
                  title='Hide conversation'
                  aria-label={`Hide conversation with ${chat.otherUser?.name || 'maker'}`}
                >
                  ✕
                </button>
              </div>
            ))
          ) : (
            <p className='empty-copy'>
              No chats yet. Start one from a profile page.
            </p>
          )}
          {inboxHasMore ? (
            <button type='button' className='button button--ghost button--compact' onClick={loadMoreChats} disabled={isLoadingMoreChats}>
              {isLoadingMoreChats ? 'Loading…' : 'Load more conversations'}
            </button>
          ) : null}
        </aside>

        <div className='chat-thread'>
          <Link href='/chats' className='chat-thread__back button button--ghost button--compact'>Back to conversations</Link>
          {activeChat ? (
            <>
              <header className='chat-thread__header'>
                <h2>{activeChat.otherUser?.name || 'Conversation'}</h2>
              </header>

              <div className='chat-thread__messages'>
                {activeChat.hasMoreOlder ? (
                  <button type='button' className='button button--ghost button--compact' onClick={loadOlderMessages} disabled={isLoadingOlderMessages}>
                    {isLoadingOlderMessages ? 'Loading…' : 'Load older messages'}
                  </button>
                ) : null}
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

                        {editingMessageId === entry.id ? (
                          <form
                            className='chat-bubble__edit-form'
                            onSubmit={(e) => {
                              e.preventDefault();
                              handleEditSave(entry.id);
                            }}
                          >
                            <textarea
                              value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                              autoFocus
                              aria-label='Edit message'
                              maxLength={MAX_CHAT_MESSAGE_LENGTH}
                              disabled={isEditing}
                            />
                            <div className='chat-bubble__edit-actions'>
                              <button
                                type='submit'
                                className='button button--small'
                                disabled={isEditing}
                              >
                                Save
                              </button>
                              <button
                                type='button'
                                className='button button--ghost button--small'
                                onClick={handleEditCancel}
                                disabled={isEditing}
                              >
                                Cancel
                              </button>
                            </div>
                          </form>
                        ) : (
                          <>
                            <p>{entry.message}</p>
                            {entry.edited ? (
                              <span className='chat-bubble__edited'>
                                (edited)
                              </span>
                            ) : null}
                            {isMine ? (
                              <button
                                className='chat-bubble__edit-btn'
                                disabled={isEditing || isSending}
                                onClick={() => handleEditStart(entry)}
                                aria-label='Edit message'
                                title='Edit message'
                              >
                                <svg
                                  xmlns='http://www.w3.org/2000/svg'
                                  width='14'
                                  height='14'
                                  viewBox='0 0 24 24'
                                  fill='none'
                                  stroke='currentColor'
                                  strokeWidth='2'
                                  strokeLinecap='round'
                                  strokeLinejoin='round'
                                  aria-hidden='true'
                                >
                                  <path d='M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7' />
                                  <path d='M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z' />
                                </svg>
                                Edit
                              </button>
                            ) : null}
                          </>
                        )}

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
                <textarea
                  ref={composerRef}
                  rows={1}
                  value={message}
                  disabled={isSending || isEditing}
                  onChange={(event) => setMessage(event.target.value)}
                  onInput={(event) => {
                    event.target.style.height = 'auto';
                    event.target.style.height = `${event.target.scrollHeight}px`;
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                      event.preventDefault();
                      handleSendMessage(event);
                    }
                  }}
                  placeholder='Type a message...'
                  aria-label='Message'
                  maxLength={MAX_CHAT_MESSAGE_LENGTH}
                />
                <button type='submit' className='button' disabled={isSending || isEditing}>
                  {isSending ? 'Sending...' : 'Send'}
                </button>
              </form>
            </>
          ) : (
            <div className='chat-thread__empty'>
              <h2>{chatId ? 'Conversation unavailable' : 'Select a conversation'}</h2>
              <p className='empty-copy'>
                {chatId ? 'This conversation could not be loaded. If you hid it, contact the maker from their profile to reopen it.' : 'Choose one from the left to read and send messages.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default ChatShell;
