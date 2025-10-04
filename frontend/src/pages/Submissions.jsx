import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useFormAPI } from '../api/forms';
import { useSubmissionAPI } from '../api/submissions';
import Loading from '../components/Loading';
import FormBuilder from '../components/FormBuilder';
import '../styles/Submissions.css';

const buildInitialData = (fields) => {
  const data = {};
  (fields || []).forEach((f) => {
    switch (f.field_type) {
      case 'boolean':
        data[f.name] = false;
        break;
      case 'checkbox':
        data[f.name] = '';
        break;
      case 'number':
        data[f.name] = '';
        break;
      default:
        data[f.name] = '';
    }
  });
  return data;
};

const Submissions = () => {
  const { formId } = useParams();
  const navigate = useNavigate();
  const { getForm } = useFormAPI();
  const { createSubmission } = useSubmissionAPI();

  const [formDetails, setFormDetails] = useState(null);
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetch = async () => {
      try {
        const data = await getForm(formId);
        if (!isMounted) return;
        if (data.association_type !== 'standalone') {
          setApiError('This form is not available for standalone submissions.');
          setIsLoading(false);
          return;
        }
        setFormDetails(data);
        setFormData(buildInitialData(data.fields));
      } catch (e) {
        setApiError(e.response?.data?.detail || 'Failed to load form.');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    fetch();
    return () => (isMounted = false);
  }, [formId, getForm]);

  const handleChange = (name, val) => {
    setFormData((d) => ({ ...d, [name]: val }));
    setErrors((e) => ({ ...e, [name]: '' }));
    setApiError('');
  };

  const validate = () => {
    const e = {};
    (formDetails.fields || []).forEach((f) => {
      const v = formData[f.name];

      if (f.required) {
        if (f.field_type === 'checkbox') {
          if (!v || v.split(',').filter(Boolean).length === 0) e[f.name] = `${f.name} is required`;
        } else if (f.field_type === 'boolean') {
          if (v !== true && v !== 'true') e[f.name] = `${f.name} must be checked`;
        } else if (!v || String(v).trim() === '') {
          e[f.name] = `${f.name} is required`;
        }
      }

      if (v == null || String(v).trim() === '') return;

      if (f.field_type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
        e[f.name] = 'Invalid email';
      } else if (f.field_type === 'number' && Number.isNaN(Number(v))) {
        e[f.name] = 'Must be a number';
      } else if (f.field_type === 'url') {
        try { new URL(v); } catch { e[f.name] = 'Invalid URL'; }
      }
    });
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (evt) => {
    evt.preventDefault();
    if (!validate()) return;
    setIsSubmitting(true);
    setApiError('');

    const payload = {};
    (formDetails.fields || []).forEach((f) => {
      const v = formData[f.name];
      if (f.field_type === 'number' && v !== '') payload[f.name] = parseFloat(v);
      else if (f.field_type === 'boolean') payload[f.name] = v === true || v === 'true';
      else payload[f.name] = v;
    });

    try {
      await createSubmission({ form: formId, data: payload });
      alert('✅ Form submitted successfully!');
      navigate('/forms');
    } catch (err) {
      const raw = err.response?.data || {};
      if (typeof raw === 'object' && raw !== null) {
        const backend = {};
        Object.keys(raw).forEach((k) => {
          if (k === 'detail') return;
          backend[k] = Array.isArray(raw[k]) ? raw[k][0] : raw[k];
        });
        setErrors(backend);
        setApiError('Please correct the errors below.');
      } else {
        setApiError(raw.detail || 'Submission failed.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <Loading />;
  if (apiError && !formDetails)
    return (
      <div className="submissions-container">
        <div className="error-message">
          {apiError}
          <button onClick={() => navigate('/forms')} className="back-button">Back to Forms</button>
        </div>
      </div>
    );
  if (!formDetails) return <div className="error-message">Form not found.</div>;

  return (
    <div className="submissions-container">
      <div className="form-header">
        <h2>{formDetails.name}</h2>
        {formDetails.description && <p className="form-description">{formDetails.description}</p>}
      </div>

      {apiError && <div className="api-error-message">{apiError}</div>}

      <form onSubmit={handleSubmit} className="form-builder">
        <FormBuilder
          formDetails={formDetails}
          formData={formData}
          handleChange={handleChange}
          errors={errors}
          isSubmitting={isSubmitting}
        />
        <div className="form-actions">
          <button type="submit" className="submit-button" disabled={isSubmitting}>
            {isSubmitting ? 'Submitting...' : 'Submit Form'}
          </button>
          <button type="button" className="cancel-button" onClick={() => navigate('/forms')} disabled={isSubmitting}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default Submissions;