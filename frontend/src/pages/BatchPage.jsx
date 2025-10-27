import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBatchAPI } from '../api/batches';
import { useAuth } from '../context/AuthContext';
import { UOMs, Countries } from '../constants/options';
import { useFormAPI } from '../api/forms';
import '../styles/BatchPage.css';

const BatchPage = () => {
  const [formData, setFormData] = useState({
    selectedForm: '',
    dynamicFormData: {},
    country: '',
    production_type: '',
    production_date: '',
    form_gate_sourced: false,
    cluster_group: '',
    quantity: '',
    uoms: '',
  });

  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [batchForms, setBatchForms] = useState([]);

  const navigate = useNavigate();
  const { createBatch } = useBatchAPI();
  const { getForms } = useFormAPI();
  const { user } = useAuth();

 
  useEffect(() => {
    const fetchBatchForms = async () => {
      try {
        const allForms = await getForms();
        const filteredForms = allForms.filter(f => f.association_type === 'batch');
        setBatchForms(filteredForms);
      } catch (err) {
        console.error('Error fetching forms:', err);
      }
    };
    fetchBatchForms();
  }, [getForms]);

 
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setFormData(prev => {
      const updated = {
        ...prev,
        [name]: type === 'checkbox' ? checked : value,
      };

     
      if (name === 'selectedForm') {
        updated.dynamicFormData = {};
      }

      return updated;
    });

    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
    setApiError('');
  };

 
  const handleChangeDynamicField = (fieldName, value) => {
    setFormData(prev => ({
      ...prev,
      dynamicFormData: {
        ...prev.dynamicFormData,
        [fieldName]: value,
      },
    }));

    if (errors[`dynamic_${fieldName}`]) {
      setErrors(prev => ({ ...prev, [`dynamic_${fieldName}`]: '' }));
    }
  };

 
  const validateForm = () => {
    const newErrors = {};

    if (!formData.country) newErrors.country = 'Country is required';
    if (!formData.production_type) newErrors.production_type = 'Production Type is required';
    if (!formData.production_date) newErrors.production_date = 'Production Date is required';
    if (!formData.cluster_group) newErrors.cluster_group = 'Cluster Group is required';
    if (!formData.quantity || formData.quantity <= 0) newErrors.quantity = 'Quantity must be positive';
    if (!formData.uoms) newErrors.uoms = 'UOM is required';

   
    if (formData.selectedForm) {
      const selectedFormObject = batchForms.find(
        f => String(f.form_id) === String(formData.selectedForm)
      );

      if (selectedFormObject?.fields) {
        selectedFormObject.fields.forEach(field => {
          if (field.required && !formData.dynamicFormData[field.name]) {
            newErrors[`dynamic_${field.name}`] = `${field.name} is required`;
          }
        });
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

 
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    setApiError('');

    try {
      const { selectedForm, dynamicFormData, ...rest } = formData;

      const payload = {
        ...rest,
        quantity: parseInt(formData.quantity, 10),
        form: selectedForm || null,
        form_data: dynamicFormData,
      };

      const newBatch = await createBatch(payload);
      navigate(`/bags/new?batchId=${newBatch.batch_id}&fromBatchCreation=true`);
    } catch (err) {
      console.error('Batch creation failed:', err);
      setApiError(err.response?.data?.detail || 'Failed to create batch. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="batch-page-container">
      <div className="batch-card">
        <h1 className="batch-card-title">Create New Batch</h1>

        {apiError && <div className="error-message">{apiError}</div>}

        <form onSubmit={handleSubmit} className="batch-form">
          {}
          <div className="form-group">
            <label htmlFor="country">Country</label>
            <select
              id="country"
              name="country"
              value={formData.country}
              onChange={handleChange}
              disabled={isLoading}
              className={errors.country ? 'error' : ''}
            >
              <option value="">Select Country</option>
              {Countries.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
            {errors.country && <span className="error-text">{errors.country}</span>}
          </div>

          {}
          <div className="form-group">
            <label htmlFor="production_type">Production Type</label>
            <input
              id="production_type"
              name="production_type"
              type="text"
              value={formData.production_type}
              onChange={handleChange}
              disabled={isLoading}
              className={errors.production_type ? 'error' : ''}
            />
            {errors.production_type && <span className="error-text">{errors.production_type}</span>}
          </div>

          {}
          <div className="form-group">
            <label htmlFor="production_date">Production Date</label>
            <input
              id="production_date"
              name="production_date"
              type="date"
              value={formData.production_date}
              onChange={handleChange}
              disabled={isLoading}
              className={errors.production_date ? 'error' : ''}
            />
            {errors.production_date && <span className="error-text">{errors.production_date}</span>}
          </div>

          {}
          <div className="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                name="form_gate_sourced"
                checked={formData.form_gate_sourced}
                onChange={handleChange}
                disabled={isLoading}
              />
              Form Gate Sourced
            </label>
          </div>

          {}
          <div className="form-group">
            <label htmlFor="cluster_group">Cluster Group</label>
            <input
              id="cluster_group"
              name="cluster_group"
              type="text"
              value={formData.cluster_group}
              onChange={handleChange}
              disabled={isLoading}
              className={errors.cluster_group ? 'error' : ''}
            />
            {errors.cluster_group && <span className="error-text">{errors.cluster_group}</span>}
          </div>

          {}
          <div className="form-group">
            <label htmlFor="quantity">Quantity</label>
            <input
              id="quantity"
              name="quantity"
              type="number"
              value={formData.quantity}
              onChange={handleChange}
              disabled={isLoading}
              className={errors.quantity ? 'error' : ''}
            />
            {errors.quantity && <span className="error-text">{errors.quantity}</span>}
          </div>

          {}
          <div className="form-group">
            <label htmlFor="uoms">UOMs</label>
            <select
              id="uoms"
              name="uoms"
              value={formData.uoms}
              onChange={handleChange}
              disabled={isLoading}
              className={errors.uoms ? 'error' : ''}
            >
              <option value="">Select UOM</option>
              {UOMs.map(u => (
                <option key={u.value} value={u.value}>{u.label}</option>
              ))}
            </select>
            {errors.uoms && <span className="error-text">{errors.uoms}</span>}
          </div>

          {}
          <div className="form-group">
            <label htmlFor="form_selection">Select Form</label>
            <select
              id="form_selection"
              name="selectedForm"
              value={formData.selectedForm}
              onChange={handleChange}
              disabled={isLoading}
              className={errors.selectedForm ? 'error' : ''}
            >
              <option value="">No Form Selected</option>
              {batchForms.map(f => (
                <option key={f.form_id} value={f.form_id}>{f.name}</option>
              ))}
            </select>
            {errors.selectedForm && <span className="error-text">{errors.selectedForm}</span>}
          </div>

          {}
          {formData.selectedForm && (() => {
            const selectedForm = batchForms.find(
              f => String(f.form_id) === String(formData.selectedForm)
            );

            if (!selectedForm) return null;
            if (!selectedForm.fields?.length)
              return <div>No fields available for this form.</div>;

            return selectedForm.fields.map(field => {
              const value = formData.dynamicFormData[field.name] ?? '';

              return (
                <div className="form-group" key={field.name}>
                  <label htmlFor={field.name}>
                    {field.name} {field.required && '(Required)'}
                  </label>

                  {['text', 'email', 'url', 'date', 'number'].includes(field.field_type) && (
                    <input
                      id={field.name}
                      type={field.field_type}
                      value={value}
                      onChange={(e) => handleChangeDynamicField(field.name, e.target.value)}
                      disabled={isLoading}
                      className={errors[`dynamic_${field.name}`] ? 'error' : ''}
                    />
                  )}

                  {field.field_type === 'boolean' && (
                    <input
                      type="checkbox"
                      checked={!!value}
                      onChange={(e) => handleChangeDynamicField(field.name, e.target.checked)}
                      disabled={isLoading}
                    />
                  )}

                  {field.field_type === 'select' && (
                    <select
                      value={value}
                      onChange={(e) => handleChangeDynamicField(field.name, e.target.value)}
                      disabled={isLoading}
                    >
                      <option value="">-- Select --</option>
                      {field.validation_rules?.choices?.map(choice => (
                        <option key={choice} value={choice}>{choice}</option>
                      ))}
                    </select>
                  )}

                  {field.field_type === 'radio' && (
                    <div className="radio-group">
                      {field.validation_rules?.choices?.map(choice => (
                        <label key={choice} className="inline-flex items-center mr-4">
                          <input
                            type="radio"
                            name={field.name}
                            value={choice}
                            checked={value === choice}
                            onChange={() => handleChangeDynamicField(field.name, choice)}
                            disabled={isLoading}
                          />
                          <span className="ml-2">{choice}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {field.field_type === 'checkbox' && (
                    <div className="checkbox-group">
                      {field.validation_rules?.choices?.map(choice => {
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
                                  : selected.filter(v => v !== choice);
                                handleChangeDynamicField(field.name, next.join(','));
                              }}
                              disabled={isLoading}
                            />
                            <span className="ml-2">{choice}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}

                  {errors[`dynamic_${field.name}`] && (
                    <span className="error-text">{errors[`dynamic_${field.name}`]}</span>
                  )}
                </div>
              );
            });
          })()}

          <button type="submit" className="submit-button" disabled={isLoading}>
            {isLoading ? 'Creating...' : 'Create Batch'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default BatchPage;
