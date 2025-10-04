import React from 'react';
import '../styles/FormField.css';

const FormField = ({ field, onFieldChange, onRemoveField, errors = {}, disabled = false }) => {
    const key = field.form_field_id || field.temp_id || field.id;
    return (
        <div className="form-field-item">
            <div className="form-group">
                <label htmlFor={`fieldName_${key}`}>Field Name</label>
                <input
                    type="text"
                    id={`fieldName_${key}`}
                    name="name"
                    value={field.name}
                    onChange={(e) => onFieldChange(key, e)}
                    className={errors[`fieldName_${key}`] ? 'error' : ''}
                    disabled={disabled}
                />
                {errors[`fieldName_${key}`] && <span className="error-text">{errors[`fieldName_${key}`]}</span>}
            </div>

            <div className="form-group">
                <label htmlFor={`fieldDescription_${key}`}>Description</label>
                <input
                    type="text"
                    id={`fieldDescription_${key}`}
                    name="description"
                    value={field.description || ''}
                    onChange={(e) => onFieldChange(key, e)}
                    disabled={disabled}
                />
            </div>

            <div className="form-group">
                <label htmlFor={`fieldType_${key}`}>Field Type</label>
                <select
                    id={`fieldType_${key}`}
                    name="field_type"
                    value={field.field_type}
                    onChange={(e) => onFieldChange(key, e)}
                    className={errors[`fieldType_${key}`] ? 'error' : ''}
                    disabled={disabled}
                >
                    <option value="text">Text</option>
                    <option value="number">Number</option>
                    <option value="date">Date</option>
                    <option value="boolean">Boolean</option>
                    <option value="select">Select</option>
                    <option value="radio">Radio</option>
                    <option value="checkbox">Checkbox</option>
                    <option value="email">Email</option>
                    <option value="url">URL</option>
                </select>
                {errors[`fieldType_${key}`] && <span className="error-text">{errors[`fieldType_${key}`]}</span>}
            </div>

            <div className="form-group checkbox-group">
                <label className="checkbox-label">
                    <input
                        type="checkbox"
                        name="required"
                        checked={field.required}
                        onChange={(e) => onFieldChange(key, e)}
                        disabled={disabled}
                    />
                    <span>Required</span>
                </label>
            </div>

            <button type="button" onClick={() => onRemoveField(key)} className="remove-field-button" disabled={disabled}>
                Remove Field
            </button>
        </div>
    );
};

export default FormField;