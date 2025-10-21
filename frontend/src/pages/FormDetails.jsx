import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useFormAPI } from '../api/forms';
import Loading from '../components/Loading';
import '../styles/FormDetails.css';
import FormField from '../components/FormField';

/* ------------------------------------------------------------------ */
/*  Stateless UI components                                           */
/* ------------------------------------------------------------------ */
const FormView = ({ form, onEdit }) => (
  <div className="form-view-mode">
    <div className="detail-item"><strong>Form ID:</strong> {form.form_id}</div>
    <div className="detail-item"><strong>Name:</strong> {form.name}</div>
    <div className="detail-item"><strong>Description:</strong> {form.description}</div>
    <div className="detail-item"><strong>Association Type:</strong> {form.association_type}</div>

    <div className="form-fields-list">
      <h3>Fields</h3>
      {form.fields?.length ? (
        form.fields.map((f, i) => (
          <div key={f.form_field_id || i} className="field-item">
            <h4>{f.name}</h4>
            <p><strong>Description:</strong> {f.description || 'N/A'}</p>
            <p><strong>Type:</strong> {f.field_type}</p>
            <p><strong>Required:</strong> {f.required ? 'Yes' : 'No'}</p>
            {f.validation_rules && Object.keys(f.validation_rules).length !== 0 && (
              <p><strong>Validation Rules:</strong> {JSON.stringify(f.validation_rules)}</p>
            )}
          </div>
        ))
      ) : (
        <p>No fields defined for this form.</p>
      )}
    </div>

    <div className="form-actions">
      <button onClick={onEdit} className="edit-button">Edit Form</button>
    </div>
  </div>
);

const FormEdit = ({
  form,
  errors,
  isSaving,
  onSave,
  onCancel,
  onAddField,
  onHeaderChange,
  onRemoveField,
  onFieldChange,
}) => (
  <div className="form-edit-mode">
    <div className="detail-item"><strong>Form ID:</strong> {form.form_id}</div>

    <div className="form-group">
      <label htmlFor="name">Form Name</label>
      <input
        id="name"
        name="name"
        type="text"
        value={form.name}
        onChange={onHeaderChange}
        className={errors.name ? 'error' : ''}
        disabled={isSaving}
      />
      {errors.name && <span className="error-text">{errors.name}</span>}
    </div>

    <div className="form-group">
      <label htmlFor="description">Description</label>
      <textarea
        id="description"
        name="description"
        rows={4}
        value={form.description}
        onChange={onHeaderChange}
        className={errors.description ? 'error' : ''}
        disabled={isSaving}
      />
      {errors.description && <span className="error-text">{errors.description}</span>}
    </div>

    <div className="detail-item"><strong>Association Type:</strong> {form.association_type}</div>

    <div className="form-fields-section">
      <h3>Fields</h3>
      {form.fields?.map(f => (
        <FormField
          key={f.form_field_id || f.temp_id}
          field={f}
          onFieldChange={onFieldChange}
          onRemoveField={onRemoveField}
          errors={errors}
          disabled={isSaving}
        />
      ))}

      <button type="button" onClick={onAddField} className="add-field-button" disabled={isSaving}>
        Add Field
      </button>
    </div>

    <div className="form-actions">
      <button onClick={onSave} className="submit-button" disabled={isSaving}>
        {isSaving ? 'Saving…' : 'Save Changes'}
      </button>
      <button onClick={onCancel} className="cancel-button" disabled={isSaving}>
        Cancel
      </button>
    </div>
  </div>
);

/* ------------------------------------------------------------------ */
/*  Main container                                                    */
/* ------------------------------------------------------------------ */
// FormDetails component
function FormDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getForm, updateForm } = useFormAPI();

  /* ---------------  local state  ---------------- */
  const [form, setForm] = useState(null); // canonical copy from server
  const [editable, setEditable] = useState(null); // working copy while editing
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [apiError, setApiError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editErrors, setEditErrors] = useState({});

  const tempIdCounter = useRef(0);

  /* ---------------  data fetching  -------------- */
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await getForm(id);
        if (mounted) {
          setForm(data);
          setEditable(JSON.parse(JSON.stringify(data)));
        }
      } catch {
        if (mounted) setError('Failed to fetch form details.');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => (mounted = false);
  }, [id]);

  /* ---------------  helpers  -------------------- */
  const copy = (o) => JSON.parse(JSON.stringify(o));

  const headerChange = useCallback(e => {
    const { name, value } = e.target;
    setEditable(prev => ({ ...prev, [name]: value }));
  }, []);

  const fieldChange = useCallback((key, e) => {
    const { name, value, type, checked } = e.target;

    if (name === 'choices') {
      const arr = Array.isArray(value)
        ? value.map(c => c.trim()).filter(Boolean)
        : String(value).split(',').map(c => c.trim()).filter(Boolean);

      const deduped = [];
      const seen = new Set();
      for (const c of arr) {
        if (!seen.has(c)) {
          seen.add(c);
          deduped.push(c);
        }
      }

      setEditable(prev => ({
        ...prev,
        fields: prev.fields.map(f =>
          (f.form_field_id || f.temp_id) === key
            ? {
                ...f,
                validation_rules: { ...(f.validation_rules || {}), choices: deduped }
              }
            : f
        ),
      }));
      return;
    }

    setEditable(prev => ({
      ...prev,
      fields: prev.fields.map(f =>
        (f.form_field_id || f.temp_id) === key
          ? { ...f, [name]: type === 'checkbox' ? checked : value }
          : f
      ),
    }));
  }, []);

  const addField = useCallback(() => {
    tempIdCounter.current += 1;
    setEditable(prev => ({
      ...prev,
      fields: [
        ...(prev.fields || []),
        {
          temp_id: `new_${tempIdCounter.current}`,
          name: '',
          description: '',
          field_type: 'text',
          required: false,
          validation_rules: {},
        },
      ],
    }));
  }, []);

  const removeField = useCallback(keyToRemove => {
    setEditable(prev => ({
      ...prev,
      fields: prev.fields.filter(f => (f.form_field_id || f.temp_id) !== keyToRemove),
    }));
  }, []);

  /* ---------------  validation  ----------------- */
  const validate = () => {
    const errs = {};
    if (!editable.name?.trim()) errs.name = 'Form Name is required';
    if (!editable.description?.trim()) errs.description = 'Description is required';

    editable.fields?.forEach(f => {
      const k = f.form_field_id || f.temp_id;
      if (!f.name?.trim()) errs[`fieldName_${k}`] = 'Field Name is required';
      if (!f.field_type?.trim()) errs[`fieldType_${k}`] = 'Field Type is required';
      if (['select', 'radio', 'checkbox'].includes(f.field_type)) {
        const choices = f.validation_rules?.choices || [];
        if (!choices.length) errs[`fieldChoices_${k}`] = 'Please provide at least one choice.';
      }
    });

    setEditErrors(errs);
    return Object.keys(errs).length === 0;
  };

  /* ---------------  save  ----------------------- */
  const handleSave = async () => {
    if (!validate()) return;

    setIsSaving(true);
    setApiError('');

    try {
      const payload = {
        ...editable,
        fields: editable.fields?.map(f => ({
          // send `id` only for existing fields so the server updates them
          ...(f.form_field_id && { id: f.form_field_id }),
          name: f.name,
          description: f.description || '',
          field_type: f.field_type,
          required: f.required,
          validation_rules: f.validation_rules || {},
        })),
      };

      // The backend's update operation now returns the final, canonical state of the form.
      // We use this response directly to update our state, avoiding a second API call.
      const updated = await updateForm(id, payload);
      setForm(updated);
      setEditable(copy(updated));
      setIsEditing(false);
    } catch (e) {
      setApiError(e.response?.data?.detail || 'Failed to update form.');
    } finally {
      setIsSaving(false);
    }
  };

  /* ---------------  edit / cancel  -------------- */
  const startEdit = () => {
    setEditable(copy(form));
    tempIdCounter.current = 0;
    setEditErrors({});
    setApiError('');
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setEditable(copy(form));
    setEditErrors({});
    setApiError('');
    setIsEditing(false);
  };

  /* ---------------  render  --------------------- */
  if (loading) return <Loading />;
  if (error) return <div className="error-message">{error}</div>;
  if (!form) return <div className="no-data-message">No form data found.</div>;

  if (isEditing && !editable) return <Loading />;

  return (
    <div className="form-details-container">
      <h2>{isEditing ? 'Edit Form' : 'Form Details'}</h2>

      {apiError && <div className="error-message">{apiError}</div>}

      {!isEditing ? (
        <FormView form={form} onEdit={startEdit} />
      ) : (
        <FormEdit
          form={editable}
          errors={editErrors}
          isSaving={isSaving}
          onSave={handleSave}
          onCancel={cancelEdit}
          onAddField={addField}
          onHeaderChange={headerChange}
          onRemoveField={removeField}
          onFieldChange={fieldChange}
        />
      )}
    </div>
  );
};

export default FormDetails;