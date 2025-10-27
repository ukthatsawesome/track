from django.contrib.auth.models import User
from django.urls import reverse
from django.utils import timezone
from django.contrib.contenttypes.models import ContentType
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Batch, Bag, Form, FormField, Submission


class BaseSetup(APITestCase):
    def setUp(self):
        # Users
        self.user = User.objects.create_user(username='tester', password='pass123')
        self.admin = User.objects.create_superuser(
            username='admin', password='admin123', email='admin@example.com'
        )
        self.client.login(username='tester', password='pass123')

        # A form for batch association with one required text field
        self.batch_form = Form.objects.create(
            name='Batch Form', description='For batches', association_type='batch'
        )
        self.batch_field = FormField.objects.create(
            form=self.batch_form,
            name='name_field',
            description='A required text field',
            field_type='text',
            required=True,
            validation_rules={'min_length': 2, 'max_length': 20}
        )

        # Create one batch via ORM to be available for tests needing existing pk
        self.batch = Batch.objects.create(
            user=self.user,
            country='Nepal',
            production_type='Organic',
            production_date=timezone.now(),
            form_gate_sourced=False,
            cluster_group='Cluster A',
            quantity=100,
            uoms='kg',
            status='draft',
            form=self.batch_form,
            form_data={'name_field': 'valid'}
        )

    def batch_payload(self):
        return {
            'country': 'Nepal',
            'production_type': 'Organic',
            'production_date': timezone.now().isoformat(),
            'form_gate_sourced': False,
            'cluster_group': 'Cluster X',
            'quantity': 42,
            'uoms': 'kg',
            # optional: you can set form and form_data to exercise serializer validation
            # 'form': self.batch_form.form_id,
            # 'form_data': {'name_field': 'valid'},
        }

    def bag_payload(self, batch_id):
        return {
            'batch': batch_id,
            'internal_lot_number': 'ILN-001',
            'state': 'new',
            'qr_code': 'QR-123',
            'external_lot_number': 'ELN-123',
            'external_update_date': timezone.now().isoformat(),
            # status defaults to 'draft'
        }


class BatchTests(BaseSetup):
    def test_create_batch_sets_user_and_number(self):
        url = reverse('batch-list')
        payload = self.batch_payload()
        resp = self.client.post(url, payload, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED, resp.data)

        # Confirm user attached and batch number auto-generated
        created_id = resp.data['batch_id']
        created = Batch.objects.get(pk=created_id)
        self.assertEqual(created.user, self.user)
        self.assertTrue(created.batch.startswith('BTCH-'))

        # bag_counts should be 0 initially
        detail_url = reverse('batch-detail', args=[created_id])
        detail = self.client.get(detail_url)
        self.assertEqual(detail.status_code, status.HTTP_200_OK)
        self.assertEqual(detail.data.get('bag_counts'), 0)

    def test_batch_patch_denied_when_completed_for_non_admin(self):
        # Mark existing batch completed directly
        self.batch.status = 'completed'
        self.batch.save(update_fields=['status'])

        url = reverse('batch-detail', args=[self.batch.pk])
        resp = self.client.patch(url, {'country': 'India'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_batch_patch_allowed_for_admin_on_completed(self):
        # Ensure completed status first
        self.batch.status = 'completed'
        self.batch.save(update_fields=['status'])

        # Switch to admin user
        self.client.logout()
        self.client.login(username='admin', password='admin123')

        url = reverse('batch-detail', args=[self.batch.pk])
        resp = self.client.patch(url, {'country': 'India'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.batch.refresh_from_db()
        self.assertEqual(self.batch.country, 'India')


class BagTests(BaseSetup):
    def test_create_bag_with_required_fields(self):
        url = reverse('bag-list')
        payload = self.bag_payload(self.batch.pk)
        resp = self.client.post(url, payload, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED, resp.data)

    def test_get_bags(self):
        # Create one bag
        Bag.objects.create(
            batch=self.batch,
            internal_lot_number='ILN-100',
            state='filled',
            qr_code='QR-999',
            external_lot_number='ELN-999',
            external_update_date=timezone.now(),
        )
        url = reverse('bag-list')
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertTrue(len(resp.data) >= 1)


class FormTests(BaseSetup):
    def test_create_form_with_nested_fields(self):
        url = reverse('form-list')
        payload = {
            'name': 'New Form',
            'description': 'Form desc',
            'association_type': 'bag',
            'fields': [
                {
                    'name': 'bag_name',
                    'description': 'desc',
                    'field_type': 'text',
                    'required': True,
                    'validation_rules': {'min_length': 2, 'max_length': 10}
                }
            ]
        }
        resp = self.client.post(url, payload, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED, resp.data)
        form_id = resp.data['form_id']
        created = Form.objects.get(pk=form_id)
        self.assertEqual(created.fields.count(), 1)

    def test_get_forms(self):
        url = reverse('form-list')
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)


class SubmissionTests(BaseSetup):
    def test_create_submission_valid_for_batch_form(self):
        ct = ContentType.objects.get_for_model(Batch)
        url = reverse('submission-list')
        payload = {
            'form': self.batch_form.form_id,
            'content_type': ct.pk,
            'object_id': self.batch.pk,
            'data': {'name_field': 'valid'}
        }
        resp = self.client.post(url, payload, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED, resp.data)

        created_id = resp.data['submission_id']
        created = Submission.objects.get(pk=created_id)
        self.assertEqual(created.created_by, self.user)

    def test_submission_invalid_field_rejected(self):
        ct = ContentType.objects.get_for_model(Batch)
        url = reverse('submission-list')
        payload = {
            'form': self.batch_form.form_id,
            'content_type': ct.pk,
            'object_id': self.batch.pk,
            'data': {'wrong_field': 'invalid'}
        }
        resp = self.client.post(url, payload, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_submission_queryset_filtering(self):
        # Another form for bags
        bag_form = Form.objects.create(name='Bag Form', association_type='bag')
        FormField.objects.create(
            form=bag_form, name='bag_field', field_type='text', required=True
        )
        # Create a bag
        bag = Bag.objects.create(
            batch=self.batch,
            internal_lot_number='ILN-300',
            state='new',
            qr_code='QR-300',
            external_lot_number='ELN-300',
            external_update_date=timezone.now(),
        )

        # Create one submission for batch_form
        ct_batch = ContentType.objects.get_for_model(Batch)
        Submission.objects.create(
            form=self.batch_form,
            content_type=ct_batch,
            object_id=self.batch.pk,
            data={'name_field': 'ok'},
            created_by=self.user
        )

        # Create one submission for bag_form
        ct_bag = ContentType.objects.get_for_model(Bag)
        Submission.objects.create(
            form=bag_form,
            content_type=ct_bag,
            object_id=bag.pk,
            data={'bag_field': 'ok'},
            created_by=self.user
        )

        # Filter by batch_form and association_type=batch
        url = reverse('submission-list')
        resp = self.client.get(f"{url}?form={self.batch_form.form_id}&association_type=batch")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        # Should only return the batch-associated submission
        self.assertTrue(all(item['form'] == self.batch_form.form_id for item in resp.data))

        # Filter by bag association
        resp2 = self.client.get(f"{url}?association_type=bag")
        self.assertEqual(resp2.status_code, status.HTTP_200_OK)
        self.assertTrue(len(resp2.data) >= 1)
        self.assertTrue(all(item['form'] == bag_form.form_id for item in resp2.data))


class UserInfoTests(BaseSetup):
    def test_get_user_info(self):
        url = reverse('user_info')
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['username'], 'tester')
        self.assertFalse(resp.data['is_staff'])

    def test_get_user_info_admin(self):
        self.client.logout()
        self.client.login(username='admin', password='admin123')
        url = reverse('user_info')
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['username'], 'admin')
        self.assertTrue(resp.data['is_staff'])
