from rest_framework import serializers
from .models import Batch, Bag, Form, FormField, Submission
from django.core.exceptions import ValidationError
from django.core.validators import validate_email, URLValidator
import re

# ---------------------------------------------------------------------
# BATCH SERIALIZER
# ---------------------------------------------------------------------
class BatchSerializer(serializers.ModelSerializer):
    # Extra computed field — counts how many bags belong to this batch
    bag_counts = serializers.SerializerMethodField()

    class Meta:
        model = Batch
        fields = '__all__'
        read_only_fields = ('batch_id', 'batch', 'created_at', 'completed_at')

    def get_bag_counts(self, obj):
        """Returns the number of bags linked to this batch."""
        return obj.bag_set.count()

    # -------------------------------------------------------------
    # VALIDATION LOGIC
    # -------------------------------------------------------------
    def validate(self, data):
        """
        Ensures that the provided form_data matches the structure
        and rules defined by the linked Form.
        """
        form = data.get('form')
        form_data = data.get('form_data')

        if form and form_data is not None:
            expected_fields = {field.name for field in form.fields.all()}
            submitted_fields = set(form_data.keys())

            # 1️ Check for unexpected fields
            extra = submitted_fields - expected_fields
            if extra:
                raise serializers.ValidationError(
                    f"Unexpected fields in form_data: {', '.join(extra)}."
                )

            # 2️ Check for missing required fields
            for field in form.fields.all():
                if field.required and field.name not in submitted_fields:
                    raise serializers.ValidationError(
                        f"Required field '{field.name}' is missing from form_data."
                    )

            # 3️ Validate choice-based fields
            for field in form.fields.all():
                val = form_data.get(field.name)
                rules = field.validation_rules or {}
                if val is None:
                    continue

                if field.field_type in ('select', 'radio'):
                    choices = rules.get('choices', [])
                    if choices and val not in choices:
                        raise serializers.ValidationError(
                            f"Field '{field.name}' must be one of: {', '.join(choices)}."
                        )
                elif field.field_type == 'checkbox':
                    choices = rules.get('choices', [])
                    if choices:
                        selected = val if isinstance(val, list) else [v.strip() for v in str(val).split(',')]
                        invalid = [v for v in selected if v not in choices]
                        if invalid:
                            raise serializers.ValidationError(
                                f"Field '{field.name}' has invalid choices: {', '.join(invalid)}."
                            )
        return data

    # -------------------------------------------------------------
    # SAVE HANDLING
    # -------------------------------------------------------------
    def create(self, validated_data):
        """Automatically attaches the current user to the batch."""
        validated_data['user'] = self.context['request'].user
        validated_data.pop('batch', None)  # remove auto-generated field
        return super().create(validated_data)

    # -------------------------------------------------------------
    # READ-ONLY ENFORCEMENT ON COMPLETED BATCHES
    # -------------------------------------------------------------
    def to_representation(self, instance):
        """Make all fields read-only if the batch is completed."""
        rep = super().to_representation(instance)
        if instance.status == 'completed':
            for field in rep.keys():
                if field not in self.Meta.read_only_fields:
                    self.fields[field].read_only = True
        return rep


# ---------------------------------------------------------------------
# BAG SERIALIZER
# ---------------------------------------------------------------------
class BagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Bag
        fields = '__all__'
        read_only_fields = ('bag_id', 'created_at', 'completed_at')

    def validate(self, data):
        """Same validation logic as Batch — ensures form_data correctness."""
        form = data.get('form')
        form_data = data.get('form_data')

        if form and form_data is not None:
            expected_fields = {f.name for f in form.fields.all()}
            submitted_fields = set(form_data.keys())

            extra = submitted_fields - expected_fields
            if extra:
                raise serializers.ValidationError(f"Unexpected fields: {', '.join(extra)}.")

            for f in form.fields.all():
                if f.required and f.name not in submitted_fields:
                    raise serializers.ValidationError(f"Required field '{f.name}' missing.")

                val = form_data.get(f.name)
                if val is not None:
                    rules = f.validation_rules or {}
                    if f.field_type in ('select', 'radio'):
                        choices = rules.get('choices', [])
                        if choices and val not in choices:
                            raise serializers.ValidationError(
                                f"Field '{f.name}' must be one of: {', '.join(choices)}."
                            )
                    elif f.field_type == 'checkbox':
                        choices = rules.get('choices', [])
                        if choices:
                            selected = val if isinstance(val, list) else [v.strip() for v in str(val).split(',')]
                            invalid = [v for v in selected if v not in choices]
                            if invalid:
                                raise serializers.ValidationError(
                                    f"Field '{f.name}' invalid choices: {', '.join(invalid)}."
                                )
        return data

    def to_representation(self, instance):
        """Lock fields if Bag is completed."""
        rep = super().to_representation(instance)
        if instance.status == 'completed':
            for f in rep.keys():
                if f not in self.Meta.read_only_fields:
                    self.fields[f].read_only = True
        return rep


# ---------------------------------------------------------------------
# FORM FIELD SERIALIZER
# ---------------------------------------------------------------------
class FormFieldSerializer(serializers.ModelSerializer):
    validation_rules = serializers.JSONField(required=False, allow_null=True)

    class Meta:
        model = FormField
        fields = ('form_field_id', 'form', 'name', 'description', 'field_type', 'required', 'validation_rules')
        read_only_fields = ('form_field_id', 'form')

    def validate(self, attrs):
        """
        Ensures proper structure of validation_rules and
        choice-based fields have valid non-empty choices.
        """
        field_type = attrs.get('field_type', getattr(self.instance, 'field_type', None))
        rules = attrs.get('validation_rules', getattr(self.instance, 'validation_rules', None)) or {}

        if field_type in ('select', 'radio', 'checkbox'):
            choices = rules.get('choices', [])
            if not isinstance(choices, list) or not choices:
                raise serializers.ValidationError(
                    {'validation_rules': 'choices are required for select/radio/checkbox fields.'}
                )
            cleaned = [str(c).strip() for c in choices if str(c).strip()]
            if not cleaned:
                raise serializers.ValidationError({'validation_rules': 'choices cannot be empty.'})
            rules['choices'] = list(dict.fromkeys(cleaned))  # remove duplicates
            attrs['validation_rules'] = rules
        return attrs


# ---------------------------------------------------------------------
# FORM SERIALIZER (With Nested Form Fields)
# ---------------------------------------------------------------------
class FormSerializer(serializers.ModelSerializer):
    fields = FormFieldSerializer(many=True)

    class Meta:
        model = Form
        fields = '__all__'
        read_only_fields = ('form_id',)

    def create(self, validated_data):
        """Handles nested field creation for a new form."""
        fields_data = validated_data.pop('fields')
        form = Form.objects.create(**validated_data)
        for f_data in fields_data:
            serializer = FormFieldSerializer(data=f_data)
            serializer.is_valid(raise_exception=True)
            FormField.objects.create(form=form, **serializer.validated_data)
        return form

    def update(self, instance, validated_data):
        """Updates form and replaces/updates its fields."""
        fields_data = validated_data.pop('fields', [])
        instance.name = validated_data.get('name', instance.name)
        instance.description = validated_data.get('description', instance.description)
        instance.association_type = validated_data.get('association_type', instance.association_type)
        instance.save()

        # Replace field set
        kept_ids = {f.get('id') for f in fields_data if f.get('id')}
        instance.fields.exclude(form_field_id__in=kept_ids).delete()

        for f_data in fields_data:
            field_id = f_data.pop('id', None)
            if field_id:
                field_obj = instance.fields.get(form_field_id=field_id)
                serializer = FormFieldSerializer(instance=field_obj, data=f_data)
                serializer.is_valid(raise_exception=True)
                for k, v in serializer.validated_data.items():
                    setattr(field_obj, k, v)
                field_obj.full_clean()
                field_obj.save()
            else:
                serializer = FormFieldSerializer(data=f_data)
                serializer.is_valid(raise_exception=True)
                FormField.objects.create(form=instance, **serializer.validated_data)
        return instance


# ---------------------------------------------------------------------
# SUBMISSION SERIALIZER
# ---------------------------------------------------------------------
class SubmissionSerializer(serializers.ModelSerializer):
    created_by = serializers.StringRelatedField(read_only=True)
    content_object_url = serializers.HyperlinkedRelatedField(
        view_name='api:submission-detail', read_only=True
    )

    class Meta:
        model = Submission
        fields = (
            'submission_id', 'form', 'content_type', 'object_id',
            'data', 'created_at', 'created_by', 'content_object_url'
        )
        read_only_fields = ('submission_id', 'created_at', 'created_by', 'content_object_url')

    # -------------------------------------------------------------
    # VALIDATION LOGIC
    # -------------------------------------------------------------
    def validate(self, data):
        """Validates object associations and field-level correctness."""
        form = data.get('form')
        content_type = data.get('content_type')
        object_id = data.get('object_id')

        # Check association correctness
        if form.association_type != 'standalone':
            if not content_type or not object_id:
                raise serializers.ValidationError("Content type and object ID are required.")
            model_class = content_type.model_class()
            if not model_class:
                raise serializers.ValidationError("Invalid content type.")
            try:
                obj = model_class.objects.get(pk=object_id)
            except model_class.DoesNotExist:
                raise serializers.ValidationError(f"No {model_class.__name__} found with ID {object_id}.")
            if not form.can_associate_with(model_class.__name__):
                raise serializers.ValidationError(
                    f"Form association type '{form.association_type}' doesn't match '{model_class.__name__.lower()}'."
                )
        else:
            if content_type or object_id:
                raise serializers.ValidationError("Standalone forms cannot have content objects.")

        # Validate submitted data
        form_fields = {f.name: f for f in form.fields.all()}
        submitted_keys = set(data['data'].keys())

        # Extra field detection
        extra = submitted_keys - set(form_fields.keys())
        if extra:
            raise serializers.ValidationError(f"Unexpected fields: {', '.join(extra)}.")

        # Per-field validation
        for field in form_fields.values():
            name, value = field.name, data['data'].get(field.name)
            rules = field.validation_rules or {}

            # Required
            if field.required and value is None:
                raise serializers.ValidationError(f"Field '{name}' is required.")

            # Type checks
            if value is not None:
                if field.field_type == 'number':
                    try:
                        float(value)
                    except ValueError:
                        raise serializers.ValidationError(f"Field '{name}' must be a number.")
                elif field.field_type == 'date':
                    from datetime import datetime
                    try:
                        datetime.strptime(value, '%Y-%m-%d')
                    except ValueError:
                        raise serializers.ValidationError(f"Field '{name}' must be a valid date (YYYY-MM-DD).")
                elif field.field_type == 'boolean' and not isinstance(value, bool):
                    raise serializers.ValidationError(f"Field '{name}' must be a boolean.")
                elif field.field_type == 'email':
                    try:
                        validate_email(value)
                    except ValidationError:
                        raise serializers.ValidationError(f"Field '{name}' must be a valid email.")
                elif field.field_type == 'url':
                    try:
                        URLValidator()(value)
                    except ValidationError:
                        raise serializers.ValidationError(f"Field '{name}' must be a valid URL.")

                # Validation rules
                if field.field_type == 'text':
                    if 'min_length' in rules and len(value) < rules['min_length']:
                        raise serializers.ValidationError(f"'{name}' must be ≥ {rules['min_length']} chars.")
                    if 'max_length' in rules and len(value) > rules['max_length']:
                        raise serializers.ValidationError(f"'{name}' exceeds {rules['max_length']} chars.")
                    if 'regex' in rules and not re.match(rules['regex'], value):
                        raise serializers.ValidationError(f"'{name}' does not match pattern.")
                elif field.field_type == 'number':
                    if 'min_value' in rules and float(value) < rules['min_value']:
                        raise serializers.ValidationError(f"'{name}' must be ≥ {rules['min_value']}.")
                    if 'max_value' in rules and float(value) > rules['max_value']:
                        raise serializers.ValidationError(f"'{name}' ≤ {rules['max_value']}.")

            # Choice validations
            if field.field_type in ('select', 'radio'):
                choices = rules.get('choices', [])
                if choices and value not in choices:
                    raise serializers.ValidationError(f"'{name}' must be one of: {', '.join(choices)}.")
            elif field.field_type == 'checkbox':
                choices = rules.get('choices', [])
                if choices:
                    selected = value if isinstance(value, list) else [v.strip() for v in str(value).split(',')]
                    invalid = [v for v in selected if v not in choices]
                    if invalid:
                        raise serializers.ValidationError(f"'{name}' invalid choices: {', '.join(invalid)}.")

        return data

    def create(self, validated_data):
        """Automatically attach the submitting user."""
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)
