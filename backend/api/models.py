from traceback import format_stack
from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.core.exceptions import ValidationError

STATUS_CHOICES = [
    ('draft', 'Draft'),
    ('working', 'Working'),
    ('completed', 'Completed'),
]


class Batch(models.Model):
    batch_id = models.AutoField(primary_key=True)
    batch = models.CharField(max_length=100, unique=True, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    country = models.CharField(max_length=100)
    production_type = models.CharField(max_length=100)
    production_date = models.DateTimeField()
    form_gate_sourced = models.BooleanField(default=False)
    cluster_group = models.CharField(max_length=100)
    quantity = models.IntegerField()
    uoms = models.CharField(max_length=100)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='draft')
    completed_at = models.DateTimeField(null=True, blank=True)
    form = models.ForeignKey(
        'Form',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        limit_choices_to={'association_type': 'batch'}
    )
    form_data = models.JSONField(default=dict, blank=True, null=True)

    def save(self, *args, **kwargs):
        is_new = not self.pk
        if is_new:
            super().save(*args, **kwargs)
            self.batch = f"BATCH{self.batch_id}"
            if self.status == 'completed':
                self.completed_at = timezone.now()
            Batch.objects.filter(pk=self.pk).update(
                batch=self.batch,
                completed_at=self.completed_at
            )
        else:
            original_batch = Batch.objects.get(pk=self.pk)
            if original_batch.status != 'completed' and self.status == 'completed':
                self.completed_at = timezone.now()
            super().save(*args, **kwargs)

    def __str__(self):
        return f"Batch {self.batch_id} - {self.user.username}"

    class Meta:
        verbose_name = "Batch"
        verbose_name_plural = "Batches"


class Bag(models.Model):
    bag_id = models.AutoField(primary_key=True)
    created_at = models.DateTimeField(auto_now_add=True)
    batch = models.ForeignKey(Batch, on_delete=models.CASCADE)
    internal_lot_number = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    qr_code = models.CharField(max_length=100)
    external_lot_number = models.CharField(max_length=100)
    external_update_date = models.DateTimeField()
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='draft')
    completed_at = models.DateTimeField(null=True, blank=True)
    form = models.ForeignKey(
        'Form',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        limit_choices_to={'association_type': 'bag'}
    )
    form_data = models.JSONField(default=dict, blank=True, null=True)

    def save(self, *args, **kwargs):
        if not self.pk:
            if self.status == 'completed':
                self.completed_at = timezone.now()
        else:
            original_bag = Bag.objects.get(pk=self.pk)
            if original_bag.status != 'completed' and self.status == 'completed':
                self.completed_at = timezone.now()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Bag {self.bag_id} - {self.batch.batch_id}"

    class Meta:
        verbose_name = "Bag"
        verbose_name_plural = "Bags"


class Form(models.Model):
    ASSOCIATION_CHOICES = [
        ('batch', 'Batch'),
        ('bag', 'Bag'),
        ('standalone', 'Standalone'),
    ]

    form_id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    association_type = models.CharField(
        max_length=20,
        choices=ASSOCIATION_CHOICES,
        default='standalone'
    )

    def __str__(self):
        return f"Form {self.form_id} - {self.name}"

    def can_associate_with(self, model_name):
        return self.association_type == model_name.lower()


class FormField(models.Model):
    FIELD_TYPES = [
        ('text', 'Text'),
        ('number', 'Number'),
        ('date', 'Date'),
        ('boolean', 'Boolean'),
        ('select', 'Select'),
        ('radio', 'Radio'),
        ('checkbox', 'Checkbox'),
        ('email', 'Email'),
        ('url', 'URL'),
    ]

    form_field_id = models.AutoField(primary_key=True)
    form = models.ForeignKey(Form, on_delete=models.CASCADE, related_name='fields')
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    field_type = models.CharField(max_length=100, choices=FIELD_TYPES)
    required = models.BooleanField(default=False)
    validation_rules = models.JSONField(blank=True, null=True)

    def __str__(self):
        return f"FormField {self.form_field_id} - {self.name}"

    def clean(self):
        if self.field_type in ('select', 'radio', 'checkbox'):
            rules = self.validation_rules or {}
            choices = rules.get('choices')
            if not isinstance(choices, list) or not choices:
                raise ValidationError('Choices are required for select, radio, and checkbox fields.')
            cleaned = [str(c).strip() for c in choices if str(c).strip()]
            if not cleaned:
                raise ValidationError('Choices cannot be empty.')
            self.validation_rules = {**rules, 'choices': list(dict.fromkeys(cleaned))}


class Submission(models.Model):
    submission_id = models.AutoField(primary_key=True)
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE, null=True, blank=True)
    object_id = models.PositiveIntegerField(null=True, blank=True)
    content_object = GenericForeignKey('content_type', 'object_id')
    form = models.ForeignKey(Form, on_delete=models.CASCADE)
    data = models.JSONField()
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)

    def __str__(self):
        return f"Submission {self.submission_id} - {self.form.name} - {self.content_object}"

    def clean(self):
        if self.form.association_type != 'standalone':
            if not self.content_object:
                raise ValidationError('A non-standalone form must be associated with a Batch or Bag.')
            expected_association_type = self.content_type.model
            if self.form.association_type != expected_association_type:
                raise ValidationError(
                    f'Form association type "{self.form.association_type}" does not match '
                    f'the associated object type "{expected_association_type}".'
                )
        for field in self.form.fields.all():
            if field.required and field.name not in self.data:
                raise ValidationError(f'Required field "{field.name}" is missing from submission data.')

    class Meta:
        verbose_name = "Submission"
        verbose_name_plural = "Submissions"
