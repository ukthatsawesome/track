import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useBagAPI } from '../api/bags';
import { useFormAPI } from '../api/forms';
import '../styles/BagPage.css';

/**
 * BagPage Component
 * ------------------
 * Handles creation of a new Bag and dynamic form fields linked to forms
 * associated with the "bag" type.
 */
const BagPage = () => {
  // ========== Hooks ==========
  const location = useLocation();
  const navigate = useNavigate();
  const { createBag } = useBagAPI();
  const { getForms } = useFormAPI();

  // ========== States ==========
  const [formData, setFormData] = useState({
    batch: '',
    internal_lot_number: '',
    state: '',
    qr_code: '',
    external_lot_number: '',
    external_update_date: '',
    selectedForm: '',
    dynamicFormData: {},
  });

  const [bagForms, setBagForms] = useState([]);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateAnotherPrompt, setShowCreateAnotherPrompt] = useState(false);

  // ======================================================
  // FETCH AVAILABLE BAG FORMS + QUERY PARAM HANDLING
  // ======================================================
  useEffect(() => {
    let isMounted = true;

    const fetchBagForms = async () => {
      try {
        const allForms = await getForms();
        if (isMounted) {
          const bagTypeForms = allForms.filter(f => f.association_type === 'bag');
          setBagForms(bagTypeForms);
        }
      } catch (error) {
        console.error('Error fetching forms:', error);
      }
    };

    fetchBagForms();

    const queryParams = new URLSearchParams(location.search);
    const batchId = queryParams.get('batchId');
    const fromBatchCreation = queryParams.get('fromBatchCreation') === 'true';

    if (batchId) setFormData(prev => ({ ...prev, batch: batchId }));
    if (fromBatchCreation) setShowCreateAnotherPrompt(true);

    return () => {
      isMounted = false;
    };
  }, [getForms, location.search]);

  // ======================================================
  // HANDLERS
  // ======================================================

  /** Handle dynamic form field changes */
  const handleChangeDynamicField = useCallback((fieldId, value) => {
    setFormData(prev => ({
      ...prev,
      dynamicFormData: {
        ...prev.dynamicFormData,
        [fieldId]: value,
      },
    }));
  }, []);

  /** Handle static input changes */
  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData(prev => ({
      ...prev,
      [name]: value,
      ...(name === 'selectedForm' ? { dynamicFormData: {} } : {}),
    }));

    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
    setApiError('');
  };

  /** Form validation */
  const validateForm = () => {
    const newErrors = {};
    const requiredFields = [
      'batch',
      'internal_lot_number',
      'state',
      'qr_code',
      'external_lot_number',
      'external_update_date',
    ];

    requiredFields.forEach(field => {
      if (!formData[field].trim()) {
        newErrors[field] = `${field.replace(/_/g, ' ')} is required`;
      }
    });

    if (formData.selectedForm) {
      const selectedForm = bagForms.find(f => f.form_id === parseInt(formData.selectedForm));
      if (selectedForm?.fields) {
        selectedForm.fields.forEach(field => {
          if (field.required && !formData.dynamicFormData[field.name]) {
            newErrors[`dynamic_${field.name}`] = `${field.name} is required`;
          }
        });
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /** Reset form for creating another bag */
  const handleCreateAnotherBag = () => {
    setFormData(prev => ({
      ...prev,
      internal_lot_number: '',
      state: '',
      qr_code: '',
      external_lot_number: '',
      external_update_date: '',
      selectedForm: '',
      dynamicFormData: {},
    }));
    setErrors({});
    setApiError('');
  };

  /** Navigate to batch list */
  const handleGoToBatchesList = () => navigate('/batches');

  /** Handle form submit */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    setApiError('');

    try {
      const bagData = {
        batch: formData.batch,
        internal_lot_number: formData.internal_lot_number,
        state: formData.state,
        qr_code: formData.qr_code,
        external_lot_number: formData.external_lot_number,
        external_update_date: formData.external_update_date,
        form: formData.selectedForm || null,
        form_data: formData.dynamicFormData,
      };

      await createBag(bagData);

      if (showCreateAnotherPrompt) {
        const confirmCreateAnother = window.confirm(
          '✅ Bag created successfully! Do you want to create another bag for this batch?'
        );
        confirmCreateAnother ? handleCreateAnotherBag() : handleGoToBatchesList();
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Bag creation failed:', error);
      setApiError(error.response?.data?.detail || 'Failed to create bag. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // ======================================================
  // RENDER HELPERS
  // ======================================================

  const renderTextField = (field) => (
    <div className="form-group" key={field}>
      <label htmlFor={field}>{field.replace(/_/g, ' ')}</label>
      <input
        type="text"
        id={field}
        name={field}
        value={formData[field]}
        onChange={handleChange}
        className={errors[field] ? 'error' : ''}
        disabled={isLoading}
      />
      {errors[field] && <span className="error-text">{errors[field]}</span>}
    </div>
  );

  const renderDynamicFields = () => {
    const selectedForm = bagForms.find(f => f.form_id === parseInt(formData.selectedForm));
    if (!selectedForm) return <p>No form found</p>;
    if (!selectedForm.fields?.length) return <p>This form has no fields</p>;

    return (
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Form Fields</h3>
        {selectedForm.fields.map((field) => {
          const value = formData.dynamicFormData[field.name] ?? '';

          switch (field.field_type) {
            case 'text':
            case 'number':
            case 'email':
            case 'url':
            case 'date':
              return (
                <div key={field.name} className="form-group">
                  <label>
                    {field.name} {field.required && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type={field.field_type}
                    value={value}
                    onChange={(e) => handleChangeDynamicField(field.name, e.target.value)}
                    required={field.required}
                  />
                  {errors?.[`dynamic_${field.name}`] && (
                    <span className="error-text">{errors[`dynamic_${field.name}`]}</span>
                  )}
                </div>
              );

            case 'boolean':
              return (
                <label key={field.name} className="inline-flex items-center">
                  <input
                    type="checkbox"
                    checked={value === true || value === 'true'}
                    onChange={(e) => handleChangeDynamicField(field.name, e.target.checked)}
                    disabled={isLoading}
                  />
                  <span className="ml-2">
                    {field.name} {field.required && <span className="text-red-500">*</span>}
                  </span>
                  {errors?.[`dynamic_${field.name}`] && (
                    <span className="error-text">{errors[`dynamic_${field.name}`]}</span>
                  )}
                </label>
              );

            case 'select':
              return (
                <div key={field.name} className="form-group">
                  <label>
                    {field.name} {field.required && <span className="text-red-500">*</span>}
                  </label>
                  <select
                    value={value}
                    onChange={(e) => handleChangeDynamicField(field.name, e.target.value)}
                    required={field.required}
                    disabled={isLoading}
                  >
                    <option value="">-- Select --</option>
                    {field.validation_rules?.choices?.map((choice) => (
                      <option key={choice} value={choice}>
                        {choice}
                      </option>
                    ))}
                  </select>
                  {errors?.[`dynamic_${field.name}`] && (
                    <span className="error-text">{errors[`dynamic_${field.name}`]}</span>
                  )}
                </div>
              );

            case 'radio':
              return (
                <div key={field.name} className="form-group radio-group">
                  <label>
                    {field.name} {field.required && <span className="text-red-500">*</span>}
                  </label>
                  {field.validation_rules?.choices?.map((choice) => (
                    <label key={choice} className="inline-flex items-center mr-4">
                      <input
                        type="radio"
                        name={field.name}
                        value={choice}
                        checked={value === choice}
                        onChange={() => handleChangeDynamicField(field.name, choice)}
                        disabled={isLoading}
                        required={field.required}
                      />
                      <span className="ml-2">{choice}</span>
                    </label>
                  ))}
                  {errors?.[`dynamic_${field.name}`] && (
                    <span className="error-text">{errors[`dynamic_${field.name}`]}</span>
                  )}
                </div>
              );

            case 'checkbox':
              return (
                <div key={field.name} className="form-group checkbox-group">
                  <label>
                    {field.name} {field.required && <span className="text-red-500">*</span>}
                  </label>
                  {field.validation_rules?.choices?.map((choice) => {
                    const selected = Array.isArray(value)
                      ? value
                      : (value || '').split(',').filter(Boolean);
                    const isChecked = selected.includes(choice);
                    return (
                      <label key={choice} className="inline-flex items-center mr-4">
                        <input
                          type="checkbox"
                          value={choice}
                          checked={isChecked}
                          onChange={(e) => {
                            const next = e.target.checked
                              ? [...selected, choice]
                              : selected.filter((v) => v !== choice);
                            handleChangeDynamicField(field.name, next.join(','));
                          }}
                          disabled={isLoading}
                        />
                        <span className="ml-2">{choice}</span>
                      </label>
                    );
                  })}
                  {errors?.[`dynamic_${field.name}`] && (
                    <span className="error-text">{errors[`dynamic_${field.name}`]}</span>
                  )}
                </div>
              );

            default:
              console.error('Unsupported field_type:', field.field_type);
              return null;
          }
        })}
      </div>
    );
  };

  // ======================================================
  // RENDER
  // ======================================================
  return (
    <div className="bag-page-container">
      <div className="bag-card">
        <h1 className="bag-card-title">Create New Bag</h1>
        {apiError && <div className="error-message">{apiError}</div>}

        <form onSubmit={handleSubmit} className="bag-form">
          {/* Basic Fields */}
          {['batch', 'internal_lot_number', 'state', 'qr_code', 'external_lot_number'].map(renderTextField)}

          {/* Date Input */}
          <div className="form-group">
            <label htmlFor="external_update_date">External Update Date</label>
            <input
              type="date"
              id="external_update_date"
              name="external_update_date"
              value={formData.external_update_date}
              onChange={handleChange}
              className={errors.external_update_date ? 'error' : ''}
              disabled={isLoading}
            />
            {errors.external_update_date && (
              <span className="error-text">{errors.external_update_date}</span>
            )}
          </div>

          {/* Form Selector */}
          <div className="form-group">
            <label htmlFor="selectedForm">Select Associated Form:</label>
            <select
              id="selectedForm"
              name="selectedForm"
              value={formData.selectedForm}
              onChange={handleChange}
              className="form-control"
            >
              <option value="">-- Select a Form --</option>
              {bagForms.map(form => (
                <option key={form.form_id} value={form.form_id}>
                  {form.name}
                </option>
              ))}
            </select>
          </div>

          {/* Dynamic Form Fields */}
          {formData.selectedForm && renderDynamicFields()}

          {apiError && <div className="error-message">{apiError}</div>}

          <button type="submit" className="btn btn-primary" disabled={isLoading}>
            {isLoading ? 'Creating...' : 'Create Bag'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default BagPage;
