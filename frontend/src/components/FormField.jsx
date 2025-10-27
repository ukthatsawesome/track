import React, { useState } from 'react';
import '../styles/FormField.css';

const FormField = ({ field, onFieldChange, onRemoveField, errors = {}, disabled = false }) => {
    const key = field.id || field.form_field_id || field.temp_id;
    const isChoiceType = ['select', 'radio', 'checkbox'].includes(field.field_type);

   
    const [newChoice, setNewChoice] = useState('');

    const addChoice = () => {
        const trimmed = newChoice.trim();
        if (!trimmed) return;
        const existing = (field.validation_rules?.choices || []);
        if (existing.includes(trimmed)) {
            setNewChoice('');
            return;
        }
        const updated = [...existing, trimmed];
        onFieldChange(key, { target: { name: 'choices', value: updated } });
        setNewChoice('');
    };

    const removeChoice = (toRemove) => {
        const existing = (field.validation_rules?.choices || []);
        const updated = existing.filter(c => c !== toRemove);
        onFieldChange(key, { target: { name: 'choices', value: updated } });
    };

    const handlePasteChoices = (e) => {
        const text = e.clipboardData.getData('text');
        if (!text) return;
       
        if (text.includes(',') || text.includes('\n')) {
            e.preventDefault();
            const tokens = text.split(/[,\n]/).map(s => s.trim()).filter(Boolean);
            const existing = (field.validation_rules?.choices || []);
            const deduped = [...existing];
            tokens.forEach(t => {
                if (!deduped.includes(t)) deduped.push(t);
            });
            onFieldChange(key, { target: { name: 'choices', value: deduped } });
        }
    };

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

            {isChoiceType && (
                <div className="form-group">
                    <label>Choices</label>
                    <div className="chip-input">
                        <div className="chip-list">
                            {(field.validation_rules?.choices || []).map((c, idx) => (
                                <span className="chip" key={`${c}_${idx}`}>
                                    {c}
                                    <button
                                        type="button"
                                        className="chip-remove"
                                        onClick={() => removeChoice(c)}
                                        disabled={disabled}
                                        aria-label={`Remove ${c}`}
                                    >
                                        ×
                                    </button>
                                </span>
                            ))}
                        </div>

                        <div className="chip-editor">
                            <input
                                type="text"
                                value={newChoice}
                                onChange={(e) => setNewChoice(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        addChoice();
                                    }
                                }}
                                onPaste={handlePasteChoices}
                                placeholder="Type a choice and press Enter"
                                disabled={disabled}
                            />
                            <button
                                type="button"
                                onClick={addChoice}
                                disabled={disabled || !newChoice.trim()}
                            >
                                Add
                            </button>
                        </div>

                        <small className="hint">Enter adds a choice. Paste lists to bulk add. Spaces and commas are allowed.</small>

                        {errors[`fieldChoices_${key}`] && (
                            <span className="error-text">{errors[`fieldChoices_${key}`]}</span>
                        )}
                    </div>
                </div>
            )}

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

            <button
                type="button"
                onClick={() => onRemoveField(key)}
                className="remove-field-button"
                disabled={disabled}
            >
                Remove Field
            </button>
        </div>
    );
}

export default FormField;