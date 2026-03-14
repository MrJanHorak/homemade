'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
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

  const endpoint = useMemo(() => {
    if (statusFilter === 'promoted') {
      return `${API_BASE_URL}/api/admin/category-suggestions?status=approved&promoted=true`;
    }

    return `${API_BASE_URL}/api/admin/category-suggestions?status=${statusFilter}`;
  }, [statusFilter]);

  const filteredSuggestions = useMemo(() => {
    const needle = searchQuery.trim().toLowerCase();

    if (!needle) {
      return suggestions;
    }

    return suggestions.filter((suggestion) =>
      suggestion.label.toLowerCase().includes(needle),
    );
  }, [searchQuery, suggestions]);

  const sortedSuggestions = useMemo(() => {
    const next = [...filteredSuggestions];

    next.sort((a, b) => {
      if (sortBy === 'label') {
        const compare = a.label.localeCompare(b.label);
        return sortDirection === 'asc' ? compare : -compare;
      }

      if (sortBy === 'lastUsed') {
        const aTime = new Date(a.lastSuggestedAt || 0).getTime();
        const bTime = new Date(b.lastSuggestedAt || 0).getTime();
        return sortDirection === 'asc' ? aTime - bTime : bTime - aTime;
      }

      const usageCompare = (a.usageCount || 0) - (b.usageCount || 0);
      return sortDirection === 'asc' ? usageCompare : -usageCompare;
    });

    return next;
  }, [filteredSuggestions, sortBy, sortDirection]);

  const loadSuggestions = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(endpoint, {
        credentials: 'include',
      });

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
      setSuggestions(Array.isArray(data.suggestions) ? data.suggestions : []);
    } catch (loadError) {
      setError(loadError.message || 'Could not load category suggestions.');
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSuggestions();
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

      <div className='moderation-toolbar'>
        <button
          type='button'
          className='button button--ghost moderation-toolbar__mobile-toggle'
          onClick={() => setMobileFiltersOpen((current) => !current)}
        >
          {mobileFiltersOpen ? 'Hide filters' : 'Show filters'}
        </button>

        <div
          className={`moderation-toolbar__controls ${
            mobileFiltersOpen ? 'moderation-toolbar__controls--open' : ''
          }`}
        >
          <label>
            Status
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
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
              placeholder='Filter category labels'
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </label>

          <label className='moderation-toolbar__sort'>
            Sort by
            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value)}
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
            onClick={() =>
              setSortDirection((current) =>
                current === 'asc' ? 'desc' : 'asc',
              )
            }
          >
            {sortDirection === 'asc' ? 'Ascending' : 'Descending'}
          </button>
        </div>

        <div className='page-actions'>
          <button
            type='button'
            className='button button--ghost'
            onClick={loadSuggestions}
          >
            Refresh
          </button>
          <Link href='/projects/new' className='button button--ghost'>
            Back to composer
          </Link>
        </div>
      </div>

      {error ? <p className='form-error'>{error}</p> : null}

      {isLoading ? (
        <p className='helper-copy'>Loading suggestions...</p>
      ) : sortedSuggestions.length === 0 ? (
        <p className='helper-copy'>No suggestions found for this status.</p>
      ) : (
        <div className='moderation-list'>
          {sortedSuggestions.map((suggestion) => (
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
                    busyId === suggestion.id || suggestion.status === 'approved'
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
                    busyId === suggestion.id || suggestion.status === 'rejected'
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
                    busyId === suggestion.id || suggestion.status === 'pending'
                  }
                >
                  Reset pending
                </button>
                <button
                  type='button'
                  className='button'
                  onClick={() => promoteSuggestion(suggestion.id)}
                  disabled={busyId === suggestion.id || suggestion.promoted}
                >
                  Promote
                </button>
                <button
                  type='button'
                  className='button button--ghost'
                  onClick={() => demoteSuggestion(suggestion.id)}
                  disabled={busyId === suggestion.id || !suggestion.promoted}
                >
                  Demote
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
};

export default CategoryModerationPage;
