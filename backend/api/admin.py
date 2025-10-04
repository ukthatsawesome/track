from django.contrib import admin
from .models import Batch, Bag, Form, FormField, Submission
from .forms import SubmissionAdminForm, BatchAdminForm, BagAdminForm

@admin.register(Batch)
class BatchAdmin(admin.ModelAdmin):
    form = BatchAdminForm
    list_display = ('batch_id', 'batch', 'user', 'country', 'production_type', 'production_date', 'form_gate_sourced', 'cluster_group', 'quantity', 'uoms', 'created_at')
    list_filter = ('user', 'batch', 'country', 'production_type', 'form_gate_sourced', 'cluster_group', 'uoms')
    search_fields = ('batch', 'user__username', 'country', 'production_type', 'cluster_group')
    ordering = ('-created_at', 'batch',)
    readonly_fields = ('batch',)

    def save_model(self, request, obj, form, change):
        if not obj.pk: # Only set user on creation
            obj.user = request.user
        super().save_model(request, obj, form, change)

@admin.register(Bag)
class BagAdmin(admin.ModelAdmin):
    form = BagAdminForm
    list_display = ('bag_id', 'batch', 'internal_lot_number', 'state', 'qr_code', 'external_lot_number', 'external_update_date', 'created_at')
    list_filter = ('batch', 'state')
    search_fields = ('bag_id', 'batch__batch_id', 'internal_lot_number', 'state', 'qr_code', 'external_lot_number')
    ordering = ('-created_at', 'bag_id',)

class FormFieldInline(admin.TabularInline):
    model = FormField
    extra = 1 # Number of empty forms to display

@admin.register(Form)
class FormAdmin(admin.ModelAdmin):
    list_display = ('form_id', 'name', 'description', 'association_type')
    list_filter = ('name', 'association_type')
    search_fields = ('name', 'description')
    ordering = ('form_id',)
    inlines = [FormFieldInline]

@admin.register(Submission)
class SubmissionAdmin(admin.ModelAdmin):
    form = SubmissionAdminForm
    list_display = ('submission_id', 'form', 'content_object', 'created_at', 'created_by')
    search_fields = ('form__name', 'created_by__username')
    list_filter = ('form', 'content_type')
    ordering = ('-created_at', 'form__name',)

    def save_model(self, request, obj, form, change):
        if not obj.pk:  # Only set created_by on creation
            obj.created_by = request.user
        super().save_model(request, obj, form, change)