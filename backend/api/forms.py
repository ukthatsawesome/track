from django import forms
from django.contrib.contenttypes.models import ContentType
from django.core.exceptions import ValidationError
import re
from datetime import datetime
from .models import Submission, Form, FormField, Batch, Bag


def _clean_form_data(form_instance, submitted_data):
    if not submitted_data:
        return submitted_data

    if not form_instance:
        return submitted_data

    form_field_names = {field.name for field in form_instance.fields.all()}
    submitted_data_keys = set(submitted_data.keys())
    extra_fields = submitted_data_keys - form_field_names

    if extra_fields:
        raise ValidationError(f"Unexpected fields in form data: {', '.join(extra_fields)}.")

    for field in form_instance.fields.all():
        field_name = field.name
        field_value = submitted_data.get(field_name)

        if field.required and field_value is None:
            raise ValidationError(f"Field '{field_name}' is required.")

        if field_value is not None:
            if field.field_type == 'number':
                try:
                    float(field_value)
                except ValueError:
                    raise ValidationError(f"Field '{field_name}' must be a number.")
            elif field.field_type == 'date':
                try:
                    datetime.strptime(field_value, '%Y-%m-%d')
                except ValueError:
                    raise ValidationError(f"Field '{field_name}' must be a valid date (YYYY-MM-DD).")
            elif field.field_type == 'boolean':
                if not isinstance(field_value, bool):
                    raise ValidationError(f"Field '{field_name}' must be a boolean.")
            elif field.field_type == 'email':
                from django.core.validators import validate_email
                try:
                    validate_email(field_value)
                except ValidationError:
                    raise ValidationError(f"Field '{field.name}' must be a valid email address.")
            elif field.field_type == 'url':
                from django.core.validators import URLValidator
                validate = URLValidator()
                try:
                    validate(field_value)
                except ValidationError:
                    raise ValidationError(f"Field '{field.name}' must be a valid URL.")

            if field.validation_rules:
                rules = field.validation_rules
                if field.field_type == 'text':
                    if 'min_length' in rules and len(field_value) < rules['min_length']:
                        raise ValidationError(f"Field '{field_name}' must be at least {rules['min_length']} characters long.")
                    if 'max_length' in rules and len(field_value) > rules['max_length']:
                        raise ValidationError(f"Field '{field_name}' exceeds maximum length of {rules['max_length']}.")
                    if 'regex' in rules and not re.match(rules['regex'], field_value):
                        raise ValidationError(f"Field '{field_name}' does not match the required pattern.")
                elif field.field_type == 'number':
                    if 'min_value' in rules and field_value < rules['min_value']:
                        raise ValidationError(f"Field '{field_name}' must be at least {rules['min_value']}.")
                    if 'max_value' in rules and field_value > rules['max_value']:
                        raise ValidationError(f"Field '{field_name}' cannot exceed {rules['max_value']}.")

            if field.field_type in ('select', 'radio'):
                choices = (field.validation_rules or {}).get('choices', [])
                if choices and field_value not in choices:
                    raise ValidationError(f"Field '{field_name}' must be one of: {', '.join(choices)}.")
            elif field.field_type == 'checkbox':
                choices = (field.validation_rules or {}).get('choices', [])
                if choices:
                    selected = field_value if isinstance(field_value, list) else str(field_value).split(',')
                    selected = [str(v).strip() for v in selected if str(v).strip()]
                    invalid = [v for v in selected if v not in choices]
                    if invalid:
                        raise ValidationError(f"Field '{field_name}' has invalid choices: {', '.join(invalid)}.")
    return submitted_data


class SubmissionAdminForm(forms.ModelForm):
    content_type = forms.ModelChoiceField(queryset=ContentType.objects.all(), required=False)
    object_id = forms.IntegerField(required=False)
    data = forms.JSONField(widget=forms.Textarea, required=False)

    class Meta:
        model = Submission
        fields = '__all__'

    def clean(self):
        cleaned_data = super().clean()
        form_instance = cleaned_data.get('form')
        submitted_data = cleaned_data.get('data')
        content_type = cleaned_data.get('content_type')
        object_id = cleaned_data.get('object_id')

        if not form_instance:
            raise ValidationError("Form is required.")

        if form_instance.association_type != 'standalone':
            if not content_type or not object_id:
                raise ValidationError("Content type and object ID are required for non-standalone forms.")
            model_class = content_type.model_class()
            if not model_class:
                raise ValidationError("Invalid content type.")
            try:
                obj = model_class.objects.get(pk=object_id)
            except model_class.DoesNotExist:
                raise ValidationError(f"No {model_class.__name__} found with ID {object_id}.")
            if not form_instance.can_associate_with(model_class.__name__):
                raise ValidationError(
                    f'Form association type "{form_instance.association_type}" does not match '
                    f'the associated object type "{model_class.__name__.lower()}".'
                )
        else:
            if content_type or object_id:
                raise ValidationError("Standalone forms cannot be associated with a content object.")

        if not submitted_data:
            return cleaned_data

        cleaned_data['data'] = _clean_form_data(form_instance, submitted_data)
        return cleaned_data


class BatchAdminForm(forms.ModelForm):
    form_data = forms.JSONField(widget=forms.Textarea, required=False)

    class Meta:
        model = Batch
        fields = '__all__'

    def clean(self):
        cleaned_data = super().clean()
        form_instance = cleaned_data.get('form')
        submitted_data = cleaned_data.get('form_data')
        cleaned_data['form_data'] = _clean_form_data(form_instance, submitted_data)
        return cleaned_data


class BagAdminForm(forms.ModelForm):
    form_data = forms.JSONField(widget=forms.Textarea, required=False)

    class Meta:
        model = Bag
        fields = '__all__'

    def clean(self):
        cleaned_data = super().clean()
        form_instance = cleaned_data.get('form')
        submitted_data = cleaned_data.get('form_data')
        cleaned_data['form_data'] = _clean_form_data(form_instance, submitted_data)
        return cleaned_data


class FormFieldAdminForm(forms.ModelForm):
    choices_text = forms.CharField(required=False)

    class Meta:
        model = FormField
        fields = ('name', 'description', 'field_type', 'required', 'choices_text')

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        rules = self.instance.validation_rules or {}
        choices = rules.get('choices', [])
        if isinstance(choices, list) and choices:
            self.fields['choices_text'].initial = ', '.join(str(c) for c in choices)

    def clean(self):
        cleaned = super().clean()
        field_type = cleaned.get('field_type')
        choices_text = cleaned.get('choices_text') or ''
        rules = dict(self.instance.validation_rules or {})

        if field_type in ('select', 'radio', 'checkbox'):
            choices = [c.strip() for c in choices_text.split(',') if c.strip()]
            if not choices:
                raise ValidationError('Please provide at least one choice.')
            rules['choices'] = list(dict.fromkeys(choices))
        else:
            rules.pop('choices', None)

        self.instance.validation_rules = rules
        return cleaned
