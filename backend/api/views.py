from django.shortcuts import render
from rest_framework import viewsets
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, BasePermission
from rest_framework.views import APIView
from .models import Batch, Bag, Form, FormField, Submission
from .serializers import BatchSerializer, BagSerializer, FormSerializer, FormFieldSerializer, SubmissionSerializer


class IsAdminOrNotCompleted(BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.method in ['GET', 'HEAD', 'OPTIONS']:
            return True
        if request.user and request.user.is_staff:
            return True
        return obj.status != 'completed'


class BatchViewSet(viewsets.ModelViewSet):
    queryset = Batch.objects.all()
    serializer_class = BatchSerializer
    permission_classes = [IsAuthenticated, IsAdminOrNotCompleted]

    def perform_create(self, serializer):
        instance = serializer.save(user=self.request.user)
        instance.batch = f"BTCH-{instance.batch_id:04d}"
        instance.save(update_fields=['batch'])


class BagViewSet(viewsets.ModelViewSet):
    queryset = Bag.objects.all()
    serializer_class = BagSerializer
    permission_classes = [IsAuthenticated, IsAdminOrNotCompleted]


class FormViewSet(viewsets.ModelViewSet):
    queryset = Form.objects.all()
    serializer_class = FormSerializer
    permission_classes = [IsAuthenticated]


class FormFieldViewSet(viewsets.ModelViewSet):
    queryset = FormField.objects.all()
    serializer_class = FormFieldSerializer
    permission_classes = [IsAuthenticated]


class SubmissionViewSet(viewsets.ModelViewSet):
    queryset = Submission.objects.all()
    serializer_class = SubmissionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        form_id = self.request.query_params.get('form')
        association = self.request.query_params.get('association_type')
        if form_id:
            try:
                qs = qs.filter(form__form_id=int(form_id))
            except (TypeError, ValueError):
                qs = qs.none()
        if association:
            qs = qs.filter(form__association_type=association)
        return qs


class UserInfoView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        return Response({
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'is_staff': user.is_staff,
            'date_joined': user.date_joined,
            'last_login': user.last_login
        })
