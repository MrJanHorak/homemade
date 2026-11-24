'use client';

import { useEffect, useState } from 'react';
import { API_BASE_URL } from '@/lib/api';

const ChatReportsPage = () => {
  const [reports, setReports] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await fetch(`${API_BASE_URL}/api/admin/chat-reports?page=${page}&limit=25`, { credentials: 'include' });
        if (response.status === 401) throw new Error('Sign in to review reports.');
        if (response.status === 403) throw new Error('Admin role required to review reports.');
        if (!response.ok) throw new Error('Unable to load reports.');
        const data = await response.json();
        if (active) {
          setReports(data.reports || []);
          setPagination(data.pagination || { page: 1, totalPages: 1 });
        }
      } catch (loadError) {
        if (active) setError(loadError.message);
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, [page]);

  const updateStatus = async (reportId, status) => {
    setBusyId(reportId);
    setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/chat-reports/${reportId}`, {
        method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Unable to update report.');
      setReports((items) => items.map((item) => item.id === reportId ? { ...item, status: payload.status } : item));
    } catch (updateError) {
      setError(updateError.message);
    } finally {
      setBusyId('');
    }
  };

  return (
    <section className='section-panel'>
      <div className='section-panel__header'>
        <div><p className='eyebrow'>Admin</p><h1>Chat reports</h1></div>
      </div>
      <p>Reported message text is private and appears here only for moderator review.</p>
      {error ? <p className='form-error' role='alert'>{error}</p> : null}
      {loading ? <p role='status'>Loading reports…</p> : reports.length ? (
        <div className='moderation-list'>
          {reports.map((report) => (
            <article className='moderation-card' key={report.id}>
              <div className='moderation-card__header'>
                <h2>{report.reason[0].toUpperCase() + report.reason.slice(1)}</h2>
                <span className={`moderation-badge moderation-badge--${report.status}`}>{report.status}</span>
              </div>
              <p><strong>Reported by:</strong> {report.reporter?.name || 'Former member'}</p>
              <p><strong>About:</strong> {report.reportedProfile?.name || 'Former member'}</p>
              <blockquote>{report.message}</blockquote>
              {report.details ? <p><strong>Details:</strong> {report.details}</p> : null}
              <p className='moderation-meta'>Received {new Date(report.createdAt).toLocaleString()}</p>
              {report.status === 'open' ? (
                <div className='page-actions'>
                  <button className='button button--small' type='button' onClick={() => updateStatus(report.id, 'reviewed')} disabled={Boolean(busyId)}>Mark reviewed</button>
                  <button className='button button--ghost button--small' type='button' onClick={() => updateStatus(report.id, 'dismissed')} disabled={Boolean(busyId)}>Dismiss</button>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      ) : <p className='empty-copy'>No reports on this page.</p>}
      <nav className='projects-pagination' aria-label='Report pages'>
        <button className='button button--ghost button--compact' type='button' onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page <= 1 || loading}>Previous</button>
        <span>Page {pagination.page} of {pagination.totalPages}</span>
        <button className='button button--ghost button--compact' type='button' onClick={() => setPage((value) => Math.min(pagination.totalPages, value + 1))} disabled={page >= pagination.totalPages || loading}>Next</button>
      </nav>
    </section>
  );
};

export default ChatReportsPage;
