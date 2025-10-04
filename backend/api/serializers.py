from rest_framework import serializers
from .models import Batch, Bag, Form, FormField, Submission
import re
from django.core.validators import validate_email, URLValidator
from django.core.exceptions import ValidationError

class BatchSerializer(serializers.ModelSerializer):
    bag_counts = serializers.SerializerMethodField()

    class Meta:
        model = Batch
        fields = '__all__'
        read_only_fields = ('batch_id', 'batch', 'created_at', 'completed_at')

    def get_bag_counts(self, obj):
        return obj.bag_set.count()

    def validate(self, data):
        form = data.get('form')
        form_data = data.get('form_data')

        if form and form_data is not None:
            expected_field_names = {field.name for field in form.fields.all()}
            submitted_data_keys = set(form_data.keys())

            # Check for extra fields in submitted data
            extra_fields = submitted_data_keys - expected_field_names
            if extra_fields:
                raise serializers.ValidationError(f"Unexpected fields in form_data: {', '.join(extra_fields)}.")

            # Check for missing required fields
            for field in form.fields.all():
                if field.required and field.name not in submitted_data_keys:
                    raise serializers.ValidationError(f"Required field '{field.name}' is missing from form_data.")

        return data

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        validated_data.pop('batch', None)
        return super().create(validated_data)

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        if instance.status == 'completed':
            for field_name in representation.keys():
                if field_name not in self.Meta.read_only_fields:
                    self.fields[field_name].read_only = True
        return representation

class BagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Bag
        fields = '__all__'
        read_only_fields = ('bag_id', 'created_at', 'completed_at')

    def validate(self, data):
        form = data.get('form')
        form_data = data.get('form_data')

        if form and form_data is not None:
            expected_field_names = {field.name for field in form.fields.all()}
            submitted_data_keys = set(form_data.keys())

            # Check for extra fields in submitted data
            extra_fields = submitted_data_keys - expected_field_names
            if extra_fields:
                raise serializers.ValidationError(f"Unexpected fields in form_data: {', '.join(extra_fields)}.")

            # Check for missing required fields
            for field in form.fields.all():
                if field.required and field.name not in submitted_data_keys:
                    raise serializers.ValidationError(f"Required field '{field.name}' is missing from form_data.")

        return data

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        if instance.status == 'completed':
            for field_name in representation.keys():
                if field_name not in self.Meta.read_only_fields:
                    self.fields[field_name].read_only = True
        return representation

class FormFieldSerializer(serializers.ModelSerializer):
    validation_rules = serializers.JSONField(required=False, allow_null=True)

    class Meta:
        model = FormField
        fields = ('form_field_id', 'form', 'name', 'description', 'field_type', 'required', 'validation_rules')
        read_only_fields = ('form_field_id', 'form', 'created_at')

    def is_valid(self, raise_exception=False):
        if not super().is_valid(raise_exception=raise_exception):
            print(f"FormFieldSerializer errors: {self.errors}")
            return False
        return True

class FormSerializer(serializers.ModelSerializer):
    fields = FormFieldSerializer(many=True)

    class Meta:
        model = Form
        fields = '__all__'
        read_only_fields = ('form_id', 'created_at')

    def create(self, validated_data):
        fields_data = validated_data.pop('fields')
        form = Form.objects.create(**validated_data)
        for field_data in fields_data:
            field_serializer = FormFieldSerializer(data=field_data)
            field_serializer.is_valid(raise_exception=True)
            FormField.objects.create(form=form, **field_serializer.validated_data)
        return form

    def update(self, instance, validated_data):
        # Pop fields data to handle it separately
        fields_data = validated_data.pop('fields', [])
        
        # Update the parent Form instance
        instance.name = validated_data.get('name', instance.name)
        instance.description = validated_data.get('description', instance.description)
        instance.association_type = validated_data.get('association_type', instance.association_type)
        instance.save()

        # Replace the set of fields
        kept_ids = {f.get('id') for f in fields_data if f.get('id')}
        instance.fields.exclude(form_field_id__in=kept_ids).delete()

        for field_data in fields_data:
            field_id = field_data.pop('id', None)
            if field_id:  # Update existing field
                instance.fields.filter(form_field_id=field_id).update(**field_data)
            else:  # Create new field
                FormField.objects.create(form=instance, **field_data)
        
        return instance

class SubmissionSerializer(serializers.ModelSerializer):
    created_by = serializers.StringRelatedField(read_only=True)
    content_object_url = serializers.HyperlinkedRelatedField(
        view_name='api:submission-detail',  # This will need to be adjusted based on your actual URL patterns
        read_only=True
    )

    class Meta:
        model = Submission
        fields = ('submission_id', 'form', 'content_type', 'object_id', 'data', 'created_at', 'created_by', 'content_object_url')
        read_only_fields = ('submission_id', 'created_at', 'created_by', 'content_object_url')

    def validate(self, data):
        form = data.get('form')
        content_type = data.get('content_type')
        object_id = data.get('object_id')

        if form.association_type != 'standalone':
            if not content_type or not object_id:
                raise serializers.ValidationError("Content type and object ID are required for non-standalone forms.")
            
            model_class = content_type.model_class()
            if not model_class:
                raise serializers.ValidationError("Invalid content type.")
            
            try:
                obj = model_class.objects.get(pk=object_id)
            except model_class.DoesNotExist:
                raise serializers.ValidationError(f"No {model_class.__name__} found with ID {object_id}.")

            if not form.can_associate_with(model_class.__name__):
                raise serializers.ValidationError(
                    f'Form association type "{form.association_type}" does not match ' 
                    f'the associated object type "{model_class.__name__.lower()}".'
                )
        else:
            if content_type or object_id:
                raise serializers.ValidationError("Standalone forms cannot be associated with a content object.")

        # Validate submitted data against form fields
        form_field_names = {field.name for field in form.fields.all()}
        submitted_data_keys = set(data['data'].keys())

        # Check for extra fields in submitted data
        extra_fields = submitted_data_keys - form_field_names
        if extra_fields:
            raise serializers.ValidationError(f"Unexpected fields in submission data: {', '.join(extra_fields)}.")

        for field in form.fields.all():
            field_name = field.name
            field_value = data['data'].get(field_name)

            if field.required and field_value is None:
                raise serializers.ValidationError(f"Field '{field_name}' is required.")

            if field_value is not None:
                # Basic type validation
                if field.field_type == 'number':
                    try:
                        float(field_value)
                    except ValueError:
                        raise serializers.ValidationError(f"Field '{field_name}' must be a number.")
                elif field.field_type == 'date':
                    try:
                        from datetime import datetime
                        datetime.strptime(field_value, '%Y-%m-%d')
                    except ValueError:
                        raise serializers.ValidationError(f"Field '{field_name}' must be a valid date (YYYY-MM-DD).")
                elif field.field_type == 'boolean':
                    if not isinstance(field_value, bool):
                        raise serializers.ValidationError(f"Field '{field_name}' must be a boolean.")
                elif field.field_type == 'email':
                    from django.core.validators import validate_email
                    try:
                        validate_email(field_value)
                    except ValidationError:
                        raise serializers.ValidationError(f"Field '{field.name}' must be a valid email address.")
                elif field.field_type == 'url':
                    from django.core.validators import URLValidator
                    validate = URLValidator()
                    try:
                        validate(field_value)
                    except ValidationError:
                        raise serializers.ValidationError(f"Field '{field.name}' must be a valid URL.")

                # Validation rules from FormField
                if field.validation_rules:
                    rules = field.validation_rules
                    if field.field_type == 'text':
                        if 'min_length' in rules and len(field_value) < rules['min_length']:
                            raise serializers.ValidationError(f"Field '{field_name}' must be at least {rules['min_length']} characters long.")
                        if 'max_length' in rules and len(field_value) > rules['max_length']:
                            raise serializers.ValidationError(f"Field '{field_name}' exceeds maximum length of {rules['max_length']}.")
                        if 'regex' in rules and not re.match(rules['regex'], field_value):
                            raise serializers.ValidationError(f"Field '{field_name}' does not match the required pattern.")
                    elif field.field_type == 'number':
                        if 'min_value' in rules and field_value < rules['min_value']:
                            raise serializers.ValidationError(f"Field '{field_name}' must be at least {rules['min_value']}.")
                        if 'max_value' in rules and field_value > rules['max_value']:
                            raise serializers.ValidationError(f"Field '{field_name}' cannot exceed {rules['max_value']}.")
                    # Add more field type specific validations as needed
        return data

    def create(self, validated_data):
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)