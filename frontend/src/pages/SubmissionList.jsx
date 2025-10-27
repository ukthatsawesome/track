import React, { useEffect, useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useSubmissionAPI } from '../api/submissions';
import { useFormAPI } from '../api/forms';
import Loading from '../components/Loading';
import '../styles/Submissions.css';

const formatDate = (iso) => {
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch {
    return iso;
  }
};

const SubmissionList = () => {
  const { formId } = useParams();
  const navigate = useNavigate();
  const { getSubmissions } = useSubmissionAPI();
  const { getForm } = useFormAPI();

  const [form, setForm] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState('');
  const [search, setSearch] = useState('');

 
  const renderFieldValue = (field, value) => {
    if (value === undefined || value === null || value === '') return '—';
    const t = field.field_type;

    if (t === 'boolean') return value === true || value === 'true' ? 'Yes' : 'No';

    if (t === 'date') {
      try {
        return new Date(value).toLocaleDateString();
      } catch {
        return String(value);
      }
    }

    if (t === 'checkbox') {
      const arr = Array.isArray(value)
        ? value
        : String(value).split(',').map(v => v.trim()).filter(Boolean);
      return arr.length ? arr.join(', ') : '—';
    }

    if (t === 'url') {
      const href = String(value);
      return <a href={href} target="_blank" rel="noreferrer">{href}</a>;
    }

    if (t === 'email') {
      const email = String(value);
      return <a href={`mailto:${email}`}>{email}</a>;
    }

    return String(value);
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const f = await getForm(formId);
        if (!mounted) return;
        if (f.association_type !== 'standalone') {
          setApiError('This form is not a standalone form.');
          setLoading(false);
          return;
        }
        setForm(f);
        const list = await getSubmissions({ form: formId, association_type: 'standalone' });
        if (!mounted) return;
        setSubmissions(Array.isArray(list) ? list : []);
      } catch (e) {
        setApiError(e.response?.data?.detail || 'Failed to load submissions.');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => (mounted = false);
  }, [formId]);

  const filtered = useMemo(() => {
    if (!search) return submissions;
    const q = search.toLowerCase();
    return submissions.filter((s) => {
      const by = (s.created_by || '').toLowerCase();
      const when = formatDate(s.created_at).toLowerCase();
      const dataStr = JSON.stringify(s.data || {}).toLowerCase();
      return by.includes(q) || when.includes(q) || dataStr.includes(q);
    });
  }, [search, submissions]);

  if (loading) return <Loading />;
  if (apiError && !form)
    return (
      <div className="submissions-container">
        <div className="error-message">
          {apiError}
          <button onClick={() => navigate('/forms')} className="back-button">Back to Forms</button>
        </div>
      </div>
    );
  if (!form) return <div className="error-message">Form not found.</div>;

  return (
    <div className="submissions-container">
      <div className="form-header">
        <h2>Submissions: {form.name}</h2>
        {form.description && <p className="form-description">{form.description}</p>}
      </div>

      <div style={{ display: 'flex', gap: '.75rem', marginBottom: '1rem' }}>
        <input
          type="text"
          placeholder="Search by user, date, or data..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1, padding: '.5rem .75rem', border: '1px solid #d1d5db', borderRadius: 8 }}
        />
        <Link to={`/submissions/${form.form_id}`} className="back-button">Fill New</Link>
      </div>

      {filtered.length === 0 ? (
        <div className="no-data-message">No submissions found.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filtered.map((s) => (
            <div key={s.submission_id} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '.5rem' }}>
                <strong>#{s.submission_id}</strong>
                <span>{formatDate(s.created_at)}</span>
              </div>
              <div style={{ marginBottom: '.75rem', color: '#6b7280' }}>
                Submitted by: <strong>{s.created_by || '—'}</strong>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr', rowGap: '.5rem' }}>
                {(form.fields || []).map((field) => {
                  const val = s.data?.[field.name];
                  return (
                    <div key={field.name} style={{ display: 'flex', gap: '.5rem' }}>
                      <strong style={{ minWidth: 180 }}>{field.name}:</strong>
                      <span style={{ color: '#374151' }}>{renderFieldValue(field, val)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: '1rem' }}>
        <button onClick={() => navigate('/forms')} className="back-button">Back to Forms</button>
      </div>
    </div>
  );
};

export default SubmissionList;