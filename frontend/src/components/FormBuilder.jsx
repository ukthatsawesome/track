import React, { memo } from 'react';

const FormBuilder = memo(({ formDetails, formData, handleChange, errors, isSubmitting }) => {
  const renderField = (field) => {
    const value = formData[field.name] ?? '';

    switch (field.field_type) {
      case 'text':
      case 'number':
      case 'email':
      case 'url':
      case 'date':
        return (
          <div key={field.name} className="form-group">
            <label htmlFor={field.name}>
              {field.name} {field.required && <span className="text-red-500">*</span>}
            </label>
            <input
              type={field.field_type}
              id={field.name}
              value={value}
              onChange={(e) => handleChange(field.name, e.target.value)}
              required={field.required}
              className={errors[field.name] ? 'error' : ''}
              disabled={isSubmitting}
              placeholder="Your answer here..."
            />
            {errors[field.name] && <span className="error-text">{errors[field.name]}</span>}
          </div>
        );

      case 'boolean':
        return (
          <div key={field.name} className="form-group checkbox-group">
            <label className="inline-flex items-center">
              <input
                type="checkbox"
                checked={value === true || value === 'true'}
                onChange={(e) => handleChange(field.name, e.target.checked)}
                disabled={isSubmitting}
              />
              <span className="ml-2">{field.name}</span>
            </label>
          </div>
        );

      case 'select':
        return (
          <div key={field.name} className="form-group">
            <label htmlFor={field.name}>
              {field.name} {field.required && <span className="text-red-500">*</span>}
            </label>
            <select
              id={field.name}
              value={value}
              onChange={(e) => handleChange(field.name, e.target.value)}
              required={field.required}
              className={errors[field.name] ? 'error' : ''}
              disabled={isSubmitting}
            >
              <option value="">-- Select --</option>
              {field.validation_rules?.choices?.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            {errors[field.name] && <span className="error-text">{errors[field.name]}</span>}
          </div>
        );

      case 'radio':
        return (
          <div key={field.name} className="form-group radio-group">
            <label>
              {field.name} {field.required && <span className="text-red-500">*</span>}
            </label>
            {field.validation_rules?.choices?.map((c) => (
              <label key={c} className="inline-flex items-center mr-4">
                <input
                  type="radio"
                  name={field.name}
                  value={c}
                  checked={value === c}
                  onChange={() => handleChange(field.name, c)}
                  disabled={isSubmitting}
                  required={field.required}
                />
                <span className="ml-2">{c}</span>
              </label>
            ))}
          </div>
        );

      case 'checkbox':
        return (
          <div key={field.name} className="form-group checkbox-group">
            <label>
              {field.name} {field.required && <span className="text-red-500">*</span>}
            </label>
            {field.validation_rules?.choices?.map((choice) => {
              const selected = value ? value.split(',').filter(Boolean) : [];
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
                      handleChange(field.name, next.join(','));
                    }}
                    disabled={isSubmitting}
                  />
                  <span className="ml-2">{choice}</span>
                </label>
              );
            })}
            {errors[field.name] && <span className="error-text">{errors[field.name]}</span>}
          </div>
        );

      default:
        console.error('Unsupported field_type:', field.field_type);
        return null;
    }
  };

  return <>{(formDetails.fields || []).map(renderField)}</>;
});

FormBuilder.displayName = 'FormBuilder';
export default FormBuilder;