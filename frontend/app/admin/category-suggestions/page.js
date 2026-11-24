'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { API_BASE_URL } from '@/lib/api';

const STATUS_OPTIONS = ['pending', 'approved', 'rejected', 'promoted'];
const SORT_OPTIONS = [
  { value: 'usage', label: 'Usage count' },
  { value: 'lastUsed', label: 'Last used' },
  { value: 'label', label: 'Label' },
];

const formatDate = (value) => {
  if (!value) {
    return '-';
  }

  return new Date(value).toLocaleString();
};

const CategoryModerationPage = () => {
  const [statusFilter, setStatusFilter] = useState('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('usage');
  const [sortDirection, setSortDirection] = useState('desc');
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const requestVersion = useRef(0);

  const endpoint = useMemo(() => {
    const params = new URLSearchParams({
      status: statusFilter === 'promoted' ? 'approved' : statusFilter,
      page: String(page), limit: '25', sort: sortBy, direction: sortDirection,
    });
    if (statusFilter === 'promoted') params.set('promoted', 'true');
    if (searchQuery.trim()) params.set('query', searchQuery.trim());
    return `${API_BASE_URL}/api/admin/category-suggestions?${params}`;
  }, [statusFilter, searchQuery, sortBy, sortDirection, page]);

  const loadSuggestions = async () => {
    const version = ++requestVersion.current;
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(endpoint, {
        credentials: 'include',
      });
      if (version !== requestVersion.current) return;

      if (response.status === 401) {
        setError('Please sign in first.');
        setSuggestions([]);
        return;
      }

      if (response.status === 403) {
        setError('Admin role required to view moderation queue.');
        setSuggestions([]);
        return;
      }

      if (!response.ok) {
        throw new Error(`Failed to load suggestions (${response.status})`);
      }

      const data = await response.json();
      if (version !== requestVersion.current) return;
      setSuggestions(Array.isArray(data.suggestions) ? data.suggestions : []);
      setPagination(data.pagination || null);
    } catch (loadError) {
      if (version !== requestVersion.current) return;
      setError(loadError.message || 'Could not load category suggestions.');
      setSuggestions([]);
    } finally {
      if (version === requestVersion.current) setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSuggestions();
    return () => { requestVersion.current += 1; };
  }, [endpoint]);

  const updateSuggestionStatus = async (id, nextStatus) => {
    setBusyId(id);
    setError('');

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/admin/category-suggestions/${id}`,
        {
          method: 'PUT',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status: nextStatus }),
        },
      );

      if (!response.ok) {
        throw new Error(`Update failed (${response.status})`);
      }

      await loadSuggestions();
    } catch (updateError) {
      setError(updateError.message || 'Could not update suggestion status.');
    } finally {
      setBusyId('');
    }
  };

  const promoteSuggestion = async (id) => {
    setBusyId(id);
    setError('');

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/admin/category-suggestions/${id}/promote`,
        {
          method: 'POST',
          credentials: 'include',
        },
      );

      if (!response.ok) {
        throw new Error(`Promote failed (${response.status})`);
      }

      await loadSuggestions();
    } catch (promoteError) {
      setError(promoteError.message || 'Could not promote suggestion.');
    } finally {
      setBusyId('');
    }
  };

  const demoteSuggestion = async (id) => {
    setBusyId(id);
    setError('');

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/admin/category-suggestions/${id}/demote`,
        {
          method: 'POST',
          credentials: 'include',
        },
      );

      if (!response.ok) {
        throw new Error(`Demote failed (${response.status})`);
      }

      await loadSuggestions();
    } catch (demoteError) {
      setError(demoteError.message || 'Could not demote suggestion.');
    } finally {
      setBusyId('');
    }
  };

  return (
    <section className='section-panel'>
      <div className='section-panel__header'>
        <div>
          <p className='eyebrow'>Admin</p>
          <h1>Category moderation</h1>
        </div>
        <p className='section-copy'>
          Review community category suggestions, approve valid ideas, and reject
          unsafe or duplicate labels.
        </p>
      </div>
      <p className='helper-copy'>Approval marks a suggestion as reviewed. Promote publishes it as an available category and also approves it. Rejecting or resetting a promoted category removes it from the available list; demoting keeps it approved.</p>

      <div className='moderation-toolbar'>
        <button
          type='button'
          className='button button--ghost moderation-toolbar__mobile-toggle'
          aria-expanded={mobileFiltersOpen}
          aria-controls='moderation-filters'
          onClick={() => setMobileFiltersOpen((current) => !current)}
        >
          {mobileFiltersOpen ? 'Hide filters' : 'Show filters'}
        </button>

        <div
          id='moderation-filters'
          className={`moderation-toolbar__controls ${
            mobileFiltersOpen ? 'moderation-toolbar__controls--open' : ''
          }`}
        >
          <label>
            Status
            <select
              value={statusFilter}
              disabled={Boolean(busyId)}
              onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }}
            >
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>

          <label className='moderation-toolbar__search'>
            Search label
            <input
              type='search'
              value={searchQuery}
              disabled={Boolean(busyId)}
              placeholder='Filter category labels'
              maxLength={80}
              onChange={(event) => { setSearchQuery(event.target.value); setPage(1); }}
            />
          </label>

          <label className='moderation-toolbar__sort'>
            Sort by
            <select
              value={sortBy}
              disabled={Boolean(busyId)}
              onChange={(event) => { setSortBy(event.target.value); setPage(1); }}
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <button
            type='button'
            className='button button--ghost moderation-toolbar__direction'
            disabled={Boolean(busyId)}
            onClick={() => {
              setSortDirection((current) =>
                current === 'asc' ? 'desc' : 'asc',
              );
              setPage(1);
            }}
          >
            {sortDirection === 'asc' ? 'Ascending' : 'Descending'}
          </button>
        </div>

        <div className='page-actions'>
          <button
            type='button'
            className='button button--ghost'
            onClick={loadSuggestions}
            disabled={Boolean(busyId)}
          >
            Refresh
          </button>
          <Link href='/projects/new' className='button button--ghost'>
            Back to composer
          </Link>
        </div>
      </div>

      {error ? <p className='form-error' role='alert'>{error}</p> : null}

      {isLoading ? (
        <p className='helper-copy' role='status'>Loading suggestions...</p>
      ) : error ? null : suggestions.length === 0 ? (
        <p className='helper-copy'>No suggestions found on this page.</p>
      ) : (
        <div className='moderation-list'>
          {suggestions.map((suggestion) => (
            <article key={suggestion.id} className='moderation-card'>
              <div className='moderation-card__header'>
                <h2>{suggestion.label}</h2>
                <div className='moderation-card__badges'>
                  <span
                    className={`moderation-badge moderation-badge--${suggestion.status}`}
                  >
                    {suggestion.status}
                  </span>
                  {suggestion.promoted ? (
                    <span className='moderation-badge moderation-badge--promoted'>
                      promoted
                    </span>
                  ) : null}
                </div>
              </div>

              <div className='moderation-meta'>
                <span>Usage: {suggestion.usageCount}</span>
                <span>
                  Unique suggesters: {suggestion.uniqueSuggesterCount}
                </span>
                <span>Last used: {formatDate(suggestion.lastSuggestedAt)}</span>
              </div>

              {suggestion.autoPromoteCandidate ? (
                <p className='helper-copy'>
                  This suggestion reached auto-promote threshold (
                  {suggestion.usageCount}).
                </p>
              ) : null}

              <div className='page-actions'>
                <button
                  type='button'
                  className='button button--ghost'
                  onClick={() =>
                    updateSuggestionStatus(suggestion.id, 'approved')
                  }
                  disabled={
                    Boolean(busyId) || suggestion.status === 'approved'
                  }
                >
                  Approve
                </button>
                <button
                  type='button'
                  className='button button--ghost'
                  onClick={() =>
                    updateSuggestionStatus(suggestion.id, 'rejected')
                  }
                  disabled={
                    Boolean(busyId) || suggestion.status === 'rejected'
                  }
                >
                  Reject
                </button>
                <button
                  type='button'
                  className='button button--ghost'
                  onClick={() =>
                    updateSuggestionStatus(suggestion.id, 'pending')
                  }
                  disabled={
                    Boolean(busyId) || suggestion.status === 'pending'
                  }
                >
                  Reset pending
                </button>
                <button
                  type='button'
                  className='button'
                  onClick={() => promoteSuggestion(suggestion.id)}
                  disabled={Boolean(busyId) || suggestion.promoted}
                >
                  Promote
                </button>
                <button
                  type='button'
                  className='button button--ghost'
                  onClick={() => demoteSuggestion(suggestion.id)}
                  disabled={Boolean(busyId) || !suggestion.promoted}
                >
                  Demote
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
      {!isLoading && !error && pagination ? (
        <div className='projects-pagination'>
          <button type='button' className='button button--ghost button--compact' disabled={page <= 1 || Boolean(busyId)} onClick={() => setPage((value) => value - 1)}>Previous</button>
          <p className='projects-pagination__status'>Page {pagination.page} of {pagination.totalPages} · {pagination.total} suggestions</p>
          <button type='button' className='button button--ghost button--compact' disabled={page >= pagination.totalPages || Boolean(busyId)} onClick={() => setPage((value) => value + 1)}>Next</button>
        </div>
      ) : null}
    </section>
  );
};

export default CategoryModerationPage;
