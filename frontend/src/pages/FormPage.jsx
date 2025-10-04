import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFormAPI } from '../api/forms';
import '../styles/FormPage.css';
import FormField from '../components/FormField';

const FormPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    association_type: 'standalone', // Default to standalone
    fields: [], // Array to hold form fields
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const navigate = useNavigate();
  const { createForm } = useFormAPI();
  const fieldIdCounter = useRef(0); // Use ref to maintain counter across renders

  const handleAddField = () => {
    fieldIdCounter.current += 1;
    setFormData(prev => ({
      ...prev,
      fields: [...prev.fields, { 
        id: `field_${fieldIdCounter.current}`, // Use stable ID instead of timestamp
        name: '', 
        description: '', 
        field_type: 'text', 
        required: false, 
        validation_rules: {} 
      }]
    }));
  };

  const handleRemoveField = (idToRemove) => {
    setFormData(prev => ({
      ...prev,
      fields: prev.fields.filter(field => field.id !== idToRemove)
    }));
  };

  const handleFieldChange = (fieldId, e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      fields: prev.fields.map(field => 
        field.id === fieldId
          ? { ...field, [name]: type === 'checkbox' ? checked : value } 
          : field
      )
    }));
  };


  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
    setApiError('');
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Form Name is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    if (!formData.association_type.trim()) newErrors.association_type = 'Association Type is required';

    formData.fields.forEach((field, index) => {
      if (!field.name.trim()) {
        newErrors[`fieldName_${field.id}`] = 'Field name is required.';
      }
      if (!field.field_type.trim()) {
        newErrors[`fieldType_${field.id}`] = 'Field type is required.';
      }
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setApiError('');

    try {
      const formPayload = {
        ...formData,
        fields: formData.fields.map(field => ({
          name: field.name,
          description: field.description || '', // Ensure description is sent, even if empty
          field_type: field.field_type,
          required: field.required,
          validation_rules: field.validation_rules || {}, // Ensure validation_rules is sent, even if empty
        })),
      };
      await createForm(formPayload);
      navigate('/dashboard'); // Redirect to dashboard on success
    } catch (error) {
      console.error('Form creation failed:', error);
      if (error.response) {
        console.error('Error response data:', error.response.data);
        console.error('Error response status:', error.response.status);
        console.error('Error response headers:', error.response.headers);
      }
      setApiError(error.response?.data?.detail || 'Failed to create form. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="form-page-container">
      <div className="form-card">
        <h1 className="form-card-title">Create New Form</h1>
        {apiError && <div className="error-message">{apiError}</div>}
        <form onSubmit={handleSubmit} className="form-form">
          <div className="form-group">
            <label htmlFor="name">Form Name</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className={errors.name ? 'error' : ''}
              disabled={isLoading}
            />
            {errors.name && <span className="error-text">{errors.name}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              className={errors.description ? 'error' : ''}
              disabled={isLoading}
              rows="4"
            ></textarea>
            {errors.description && <span className="error-text">{errors.description}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="association_type">Association Type</label>
            <select
              id="association_type"
              name="association_type"
              value={formData.association_type}
              onChange={handleChange}
              className={errors.association_type ? 'error' : ''}
              disabled={isLoading}
            >
              <option value="" disabled>Select Association Type</option>
              <option value="batch">Batch</option>
              <option value="bag">Bag</option>
              <option value="standalone">Standalone</option>
            </select>
            {errors.association_type && <span className="error-text">{errors.association_type}</span>}
          </div>

          <div className="form-fields-section">
            <h2>Form Fields</h2>
            {formData.fields.map((field) => (
              <FormField
                key={field.id} // Use stable ID as key
                field={field}
                onFieldChange={handleFieldChange}
                onRemoveField={handleRemoveField}
                errors={errors}
                disabled={isLoading}
              />
            ))}
            <button type="button" onClick={handleAddField} className="add-field-button" disabled={isLoading}>
              Add Field
            </button>
          </div>

          <button type="submit" className="submit-button" disabled={isLoading}>
            {isLoading ? 'Creating...' : 'Create Form'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default FormPage;