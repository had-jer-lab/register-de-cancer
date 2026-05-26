# ══════════════════════════════════════════
# patients/views.py
# ══════════════════════════════════════════
import logging
import uuid
import json

from base64 import b64decode

from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.utils.decorators import method_decorator
from django.views import View
from django.views.decorators.csrf import csrf_exempt

from rest_framework import generics, permissions, filters, status
from rest_framework.decorators import api_view, permission_classes as drf_permission_classes
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from rest_framework.views import APIView

from django.db.models import Count
from django_filters.rest_framework import DjangoFilterBackend

from .models import (
    Wilaya, Commune, Hospital,
    Patient, CancerType, Cancer, Treatment,
    BiologicalExam, ImagingExam,
    Histology, Metastasis, FollowUp,
    Consultation, Death,
    CustomField, Habit, PatientHabit,
    DemandeExamen,
    PatientFormToken, PatientFormSubmission, Notification,
)
from .serializers import (
    WilayaSerializer, CommuneSerializer, HospitalSerializer,
    CancerTypeSerializer, CustomFieldSerializer,
    PatientListSerializer, PatientDetailSerializer,
    CancerSerializer, CancerCreateSerializer,
    TreatmentSerializer, TreatmentCreateSerializer,
    BiologicalExamSerializer, ImagingExamSerializer,
    HistologySerializer, MetastasisSerializer, FollowUpSerializer,
    ConsultationSerializer, DeathSerializer,
    PatientFormSubmissionSerializer,
    DemandeExamenSerializer,
)

logger = logging.getLogger(__name__)


# ─── Permissions ──────────────────────────────────────────────────────────────

class IsOwnerOrAdmin(permissions.BasePermission):
    """Le patient appartient au médecin connecté ou l'utilisateur est admin."""
    def has_object_permission(self, request, view, obj):
        if request.user.is_staff or getattr(request.user, 'role', '') == 'admin':
            return True
        if isinstance(obj, Patient):
            return obj.created_by == request.user
        if hasattr(obj, 'patient'):
            return obj.patient.created_by == request.user
        if hasattr(obj, 'cancer'):
            return obj.cancer.patient.created_by == request.user
        return False


class IsAdminOrStaff(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user and request.user.is_authenticated and
            (request.user.is_staff or getattr(request.user, 'role', '') == 'admin')
        )


def _patient_qs(user):
    """Retourne le queryset de base des patients selon le rôle."""
    if user.is_staff or getattr(user, 'role', '') == 'admin':
        return Patient.objects.filter(deleted_at__isnull=True)
    return Patient.objects.filter(created_by=user, deleted_at__isnull=True)


# ─── Référentiels ─────────────────────────────────────────────────────────────

class WilayaListView(generics.ListAPIView):
    queryset           = Wilaya.objects.all()
    serializer_class   = WilayaSerializer
    permission_classes = [permissions.IsAuthenticated]


class CommuneListView(generics.ListAPIView):
    serializer_class   = CommuneSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Commune.objects.select_related('wilaya').all()
        wilaya_id = self.request.query_params.get('wilaya_id')
        if wilaya_id:
            qs = qs.filter(wilaya_id=wilaya_id)
        return qs


class HospitalListView(generics.ListAPIView):
    serializer_class   = HospitalSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Hospital.objects.select_related('wilaya').all()
        wilaya_id = self.request.query_params.get('wilaya_id')
        if wilaya_id:
            qs = qs.filter(wilaya_id=wilaya_id)
        return qs


class CancerTypeListView(generics.ListAPIView):
    queryset           = CancerType.objects.all()
    serializer_class   = CancerTypeSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends    = [filters.SearchFilter]
    search_fields      = ['name', 'cim10_code']


# ─── Champs personnalisés ─────────────────────────────────────────────────────

class CustomFieldListCreateView(generics.ListCreateAPIView):
    serializer_class = CustomFieldSerializer
    filter_backends  = [filters.SearchFilter, filters.OrderingFilter]
    search_fields    = ['label', 'name', 'section']
    ordering_fields  = ['order', 'created_at']
    ordering         = ['section', 'order']

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAdminOrStaff()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        qs = CustomField.objects.order_by('section', 'order', 'created_at')
        section = self.request.query_params.get('section')
        if section:
            qs = qs.filter(section=section)
        if not (self.request.user.is_staff or getattr(self.request.user, 'role', '') == 'admin'):
            qs = qs.filter(is_active=True)
        return qs


class CustomFieldDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset           = CustomField.objects.all()
    serializer_class   = CustomFieldSerializer
    permission_classes = [IsAdminOrStaff]


# ─── Patients ─────────────────────────────────────────────────────────────────

class PatientListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    filter_backends    = [filters.SearchFilter, filters.OrderingFilter]
    search_fields      = [
        'first_name', 'last_name', 'numero_dossier', 'national_id',
        'commune__name', 'commune__wilaya__name', 'hospital__name',
    ]
    ordering_fields    = ['created_at', 'last_name', 'date_naissance']

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return PatientDetailSerializer
        return PatientListSerializer

    def get_queryset(self):
        user = self.request.user
        if user.is_staff or getattr(user, 'role', '') == 'admin':
            qs = Patient.objects.select_related(
                'commune__wilaya', 'hospital', 'created_by'
            ).prefetch_related('cancers__cancer_type').filter(deleted_at__isnull=True)
        else:
            qs = Patient.objects.select_related(
                'commune__wilaya', 'hospital', 'created_by'
            ).prefetch_related('cancers__cancer_type').filter(
                created_by=user, deleted_at__isnull=True,
            )

        sexe     = self.request.query_params.get('sexe')
        wilaya   = self.request.query_params.get('wilaya_id')
        hospital = self.request.query_params.get('hospital_id')
        stade    = self.request.query_params.get('stade')

        if sexe:     qs = qs.filter(sexe=sexe)
        if wilaya:   qs = qs.filter(commune__wilaya_id=wilaya)
        if hospital: qs = qs.filter(hospital_id=hospital)
        if stade:    qs = qs.filter(cancers__stade_clinique=stade)

        return qs.order_by('-created_at')

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class PatientDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrAdmin]

    def get_serializer_class(self):
        return PatientDetailSerializer

    def get_queryset(self):
        user = self.request.user
        base_qs = Patient.objects.select_related(
            'commune__wilaya', 'hospital', 'created_by', 'death'
        ).prefetch_related(
            'cancers__cancer_type',
            'cancers__treatments',
            'cancers__biological_exams',
            'cancers__imaging_exams',
            'cancers__histology',
            'cancers__metastases',
            'cancers__follow_ups',
            'cancers__status_history',
            'cancers__custom_values__field',
            'consultations__user',
        )
        if user.is_staff or getattr(user, 'role', '') == 'admin':
            return base_qs.all()
        return base_qs.filter(created_by=user)

    def perform_destroy(self, instance):
        from django.utils import timezone
        instance.deleted_at = timezone.now()
        instance.save()


# ─── Public Patient View ──────────────────────────────────────────────────────

# FIX: كانت معرّفة مرتين — بقى نسخة واحدة (الأكثر اكتمالاً)
class PublicPatientView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, pk):
        token = request.query_params.get('token')
        if not token:
            return Response({'detail': 'Lien invalide.'}, status=status.HTTP_404_NOT_FOUND)

        try:
            patient = Patient.objects.select_related(
                'commune__wilaya', 'hospital', 'created_by'
            ).prefetch_related(
                'cancers__cancer_type',
                'cancers__treatments',
                'cancers__biological_exams',
                'cancers__imaging_exams',
                'cancers__histology',
                'cancers__metastases',
                'cancers__follow_ups',
                'consultations__user',
            ).get(pk=pk, deleted_at__isnull=True)
        except Patient.DoesNotExist:
            return Response({'detail': 'Dossier introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        try:
            decoded = b64decode(token).decode('utf-8')
        except Exception:
            return Response({'detail': 'Lien invalide.'}, status=status.HTTP_404_NOT_FOUND)

        if decoded != patient.numero_dossier and decoded != str(patient.id):
            return Response({'detail': 'Lien invalide ou expiré.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = PatientDetailSerializer(patient, context={'request': request})
        return Response(serializer.data)


# ─── Voice / Whisper (stubs) ──────────────────────────────────────────────────

class VoiceParseView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        transcript = request.data.get('transcript', '')
        if not isinstance(transcript, str):
            return Response({'error': 'transcript is required'}, status=status.HTTP_400_BAD_REQUEST)
        return Response({})


class WhisperParseView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        audio_file = request.FILES.get('audio')
        if not audio_file:
            return Response({'error': 'audio file is required'}, status=status.HTTP_400_BAD_REQUEST)
        return Response({'fields': {}, 'transcript': ''})


# ─── Dashboard Stats ──────────────────────────────────────────────────────────

class DashboardStatsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from datetime import date, timedelta

        patients_qs = _patient_qs(request.user)
        total      = patients_qs.count()
        this_month = patients_qs.filter(
            created_at__month=date.today().month,
            created_at__year=date.today().year,
        ).count()
        last_month = patients_qs.filter(
            created_at__month=(date.today().replace(day=1) - timedelta(days=1)).month,
        ).count()

        stades = (
            patients_qs
            .filter(cancers__stade_clinique__isnull=False)
            .exclude(cancers__stade_clinique='')
            .values('cancers__stade_clinique')
            .annotate(count=Count('id'))
            .order_by('cancers__stade_clinique')
        )
        sexe_m = patients_qs.filter(sexe='M').count()
        sexe_f = patients_qs.filter(sexe='F').count()
        top_organes = (
            patients_qs
            .filter(cancers__cancer_type__isnull=False)
            .values('cancers__cancer_type__name')
            .annotate(count=Count('id'))
            .order_by('-count')[:5]
        )

        return Response({
            'total_patients': total,
            'this_month':     this_month,
            'last_month':     last_month,
            'evolution_pct':  round(((this_month - last_month) / last_month * 100) if last_month else 0, 1),
            'sexe':           {'M': sexe_m, 'F': sexe_f},
            'stades':         list(stades),
            'top_organes':    list(top_organes),
        })


class WilayaStatsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        patients_qs  = _patient_qs(request.user)
        wilaya_stats = (
            patients_qs
            .filter(commune__wilaya__isnull=False)
            .values('commune__wilaya__name')
            .annotate(cases=Count('id'))
            .order_by('-cases')
        )
        data = [
            {'id': s['commune__wilaya__name'], 'label': s['commune__wilaya__name'], 'value': s['cases']}
            for s in wilaya_stats
        ]
        return Response(data)


# ─── Cancers ──────────────────────────────────────────────────────────────────

class CancerListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        return CancerSerializer if self.request.method == 'GET' else CancerCreateSerializer

    def get_queryset(self):
        patient_id = self.kwargs.get('patient_pk')
        user = self.request.user
        qs = Cancer.objects.filter(patient_id=patient_id).select_related(
            'cancer_type'
        ).prefetch_related(
            'treatments', 'biological_exams', 'imaging_exams',
            'histology', 'metastases', 'follow_ups', 'custom_values__field',
        )
        if not (user.is_staff or getattr(user, 'role', '') == 'admin'):
            qs = qs.filter(patient__created_by=user)
        return qs

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            logger.warning(
                'CancerCreate validation failed patient_pk=%s errors=%s payload=%s',
                self.kwargs.get('patient_pk'), serializer.errors, request.data,
            )
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(
            CancerSerializer(serializer.instance, context=self.get_serializer_context()).data,
            status=status.HTTP_201_CREATED,
            headers=headers,
        )

    def perform_create(self, serializer):
        serializer.save(patient_id=self.kwargs.get('patient_pk'))


class CancerDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrAdmin]

    def get_serializer_class(self):
        return CancerSerializer if self.request.method == 'GET' else CancerCreateSerializer

    def get_queryset(self):
        return Cancer.objects.filter(patient_id=self.kwargs.get('patient_pk'))


# ─── Traitements ──────────────────────────────────────────────────────────────

class TreatmentListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        return TreatmentSerializer if self.request.method == 'GET' else TreatmentCreateSerializer

    def get_queryset(self):
        user = self.request.user
        qs = Treatment.objects.filter(
            cancer_id=self.kwargs.get('cancer_pk'),
            cancer__patient_id=self.kwargs.get('patient_pk'),
        )
        if not (user.is_staff or getattr(user, 'role', '') == 'admin'):
            qs = qs.filter(cancer__patient__created_by=user)
        return qs.order_by('date_debut')

    def perform_create(self, serializer):
        serializer.save(cancer_id=self.kwargs.get('cancer_pk'))


class TreatmentDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrAdmin]

    def get_serializer_class(self):
        return TreatmentSerializer if self.request.method == 'GET' else TreatmentCreateSerializer

    def get_queryset(self):
        return Treatment.objects.filter(
            cancer_id=self.kwargs.get('cancer_pk'),
            cancer__patient_id=self.kwargs.get('patient_pk'),
        )


# ─── Examens biologiques ──────────────────────────────────────────────────────

class BiologicalExamListCreateView(generics.ListCreateAPIView):
    serializer_class   = BiologicalExamSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return BiologicalExam.objects.filter(
            cancer_id=self.kwargs.get('cancer_pk'),
            cancer__patient_id=self.kwargs.get('patient_pk'),
        )

    def perform_create(self, serializer):
        serializer.save(cancer_id=self.kwargs.get('cancer_pk'))


# ─── Imagerie ─────────────────────────────────────────────────────────────────

class ImagingExamListCreateView(generics.ListCreateAPIView):
    serializer_class   = ImagingExamSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return ImagingExam.objects.filter(
            cancer_id=self.kwargs.get('cancer_pk'),
            cancer__patient_id=self.kwargs.get('patient_pk'),
        )

    def perform_create(self, serializer):
        serializer.save(cancer_id=self.kwargs.get('cancer_pk'))


# ─── Métastases ───────────────────────────────────────────────────────────────

class MetastasisListCreateView(generics.ListCreateAPIView):
    serializer_class   = MetastasisSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Metastasis.objects.filter(
            cancer_id=self.kwargs.get('cancer_pk'),
            cancer__patient_id=self.kwargs.get('patient_pk'),
        )

    def perform_create(self, serializer):
        serializer.save(cancer_id=self.kwargs.get('cancer_pk'))


# ─── Suivi (Follow-ups) ───────────────────────────────────────────────────────

class FollowUpListCreateView(generics.ListCreateAPIView):
    serializer_class   = FollowUpSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return FollowUp.objects.filter(
            cancer_id=self.kwargs.get('cancer_pk'),
            cancer__patient_id=self.kwargs.get('patient_pk'),
        )

    def perform_create(self, serializer):
        serializer.save(cancer_id=self.kwargs.get('cancer_pk'))


# ─── Habitudes de vie ─────────────────────────────────────────────────────────

class PatientHabitListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return PatientHabit.objects.filter(
            patient_id=self.kwargs.get('patient_pk')
        ).select_related('habit')

    def get_serializer_class(self):
        from .serializers import PatientHabitSerializer
        return PatientHabitSerializer

    def create(self, request, *args, **kwargs):
        patient_id = self.kwargs.get('patient_pk')
        habit_name = request.data.get('habit_name', '').strip()
        frequency  = request.data.get('frequency', '')
        valeur     = request.data.get('valeur', '')

        if not habit_name:
            return Response({'detail': 'habit_name requis.'}, status=400)

        habit, _ = Habit.objects.get_or_create(name=habit_name)
        ph, created = PatientHabit.objects.get_or_create(
            patient_id=patient_id,
            habit=habit,
            defaults={'frequency': str(frequency or valeur or '')[:50]},
        )
        if not created:
            ph.frequency = str(frequency or valeur or '')[:50]
            ph.save()

        from .serializers import PatientHabitSerializer
        return Response(
            PatientHabitSerializer(ph).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


# ─── Consultations ────────────────────────────────────────────────────────────

class ConsultationListCreateView(generics.ListCreateAPIView):
    serializer_class   = ConsultationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = Consultation.objects.filter(
            patient_id=self.kwargs.get('patient_pk')
        ).select_related('user')
        if not (user.is_staff or getattr(user, 'role', '') == 'admin'):
            qs = qs.filter(patient__created_by=user)
        return qs

    def perform_create(self, serializer):
        serializer.save(
            patient_id=self.kwargs.get('patient_pk'),
            user=self.request.user,
        )


# ─── Statistiques ─────────────────────────────────────────────────────────────

class StatsByWilayaView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        data   = Patient.objects.values('commune__wilaya__name').annotate(count=Count('id'))
        result = {item['commune__wilaya__name']: item['count'] for item in data}
        return Response(result)


class StatsByCommuneView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        data   = Patient.objects.values('commune__name').annotate(count=Count('id'))
        result = {item['commune__name']: item['count'] for item in data}
        return Response(result)


class StatisticsDataView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        patients = Patient.objects.select_related(
            'commune__wilaya', 'commune',
        ).prefetch_related('cancers__cancer_type').filter(deleted_at__isnull=True)

        user = request.user
        if not (user.is_staff or getattr(user, 'role', '') == 'admin'):
            patients = patients.filter(created_by=user)

        data = []
        months_fr = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun',
                     'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']

        for patient in patients:
            for cancer in patient.cancers.all():
                if not cancer.cancer_type:
                    continue
                year  = cancer.date_diagnostic.year  if cancer.date_diagnostic else cancer.created_at.year
                month = months_fr[(cancer.date_diagnostic.month - 1) if cancer.date_diagnostic else (cancer.created_at.month - 1)]
                data.append({
                    'cancer':       self.map_cancer_type_to_id(cancer.cancer_type.name),
                    'age':          self.calculate_age_group(patient.age),
                    'sex':          patient.sexe,
                    'year':         year,
                    'month':        month,
                    'wilaya':       patient.commune.wilaya.name if patient.commune else 'Inconnue',
                    'daira':        patient.commune.name        if patient.commune else None,
                    'stade':        cancer.stade_clinique or cancer.stade_pathologique or 'Stade I',
                    'mode':         'Dépistage',
                    'traitement':   'Chirurgie',
                    'cases':        1,
                    'latitude':     float(patient.commune.latitude)  if (patient.commune and patient.commune.latitude  is not None) else None,
                    'longitude':    float(patient.commune.longitude) if (patient.commune and patient.commune.longitude is not None) else None,
                    'commune_name': patient.commune.name if patient.commune else None,
                })
        return Response(data)

    def map_cancer_type_to_id(self, cancer_name):
        mapping = {
            'Sein': 'sein', 'Poumon': 'poumon', 'Colorectal': 'colorectal',
            'Prostate': 'prostate', "Col de l'utérus": 'col_uterus',
            'Estomac': 'estomac', 'Thyroïde': 'thyroide',
            'Leucémie': 'leucemie', 'Foie': 'foie',
        }
        return mapping.get(cancer_name, 'sein')

    def calculate_age_group(self, age):
        if age is None:    return 'Inconnu'
        if age < 15:       return '0–14'
        elif age < 30:     return '15–29'
        elif age < 45:     return '30–44'
        elif age < 60:     return '45–59'
        else:              return '60+'


# ─── Demandes d'examens ───────────────────────────────────────────────────────

class DemandeExamenListCreateView(generics.ListCreateAPIView):
    serializer_class   = DemandeExamenSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = DemandeExamen.objects.filter(
            patient_id=self.kwargs['patient_pk']
        ).select_related('medecin', 'patient', 'cancer__cancer_type')
        if not (user.is_staff or getattr(user, 'role', '') == 'admin'):
            qs = qs.filter(patient__created_by=user)
        return qs

    def perform_create(self, serializer):
        serializer.save(
            patient_id=self.kwargs['patient_pk'],
            medecin=self.request.user,
        )


class DemandeExamenDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class   = DemandeExamenSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return DemandeExamen.objects.filter(patient_id=self.kwargs['patient_pk'])


class AllDemandesView(generics.ListAPIView):
    serializer_class   = DemandeExamenSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends    = [filters.OrderingFilter]
    ordering_fields    = ['date_demande', 'statut', 'urgence']

    def get_queryset(self):
        user = self.request.user
        qs = DemandeExamen.objects.select_related('medecin', 'patient', 'cancer__cancer_type')
        if user.is_staff or getattr(user, 'role', '') == 'admin':
            return qs
        if getattr(user, 'role', '') == 'biologiste':
            return qs.filter(type_demande='biologie')
        return qs.filter(medecin=user)


# ─── Form Submissions View (class-based — pour urls.py) ──────────────────────

class FormSubmissionsView(generics.ListAPIView):
    serializer_class   = PatientFormSubmissionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return PatientFormSubmission.objects.filter(
            patient_id=self.kwargs['patient_pk']
        ).order_by('-created_at')


# ─── QR Code — Formulaire public ─────────────────────────────────────────────

DEFAULT_FORM_FIELDS = [
    {'key': 'telephone',    'label': 'Téléphone',                    'type': 'tel',      'required': False},
    {'key': 'adresse',      'label': 'Adresse complète',             'type': 'text',     'required': False},
    {'key': 'profession',   'label': 'Profession',                   'type': 'text',     'required': False},
    {'key': 'poids',        'label': 'Poids (kg)',                   'type': 'number',   'required': False},
    {'key': 'taille',       'label': 'Taille (cm)',                  'type': 'number',   'required': False},
    {'key': 'allergies',    'label': 'Allergies connues',            'type': 'textarea', 'required': False},
    {'key': 'tabac',        'label': 'Tabagisme',                    'type': 'select',   'required': False,
     'options': ['Non fumeur', 'Fumeur actif', 'Ancien fumeur']},
    {'key': 'alcool',       'label': 'Consommation alcool',          'type': 'select',   'required': False,
     'options': ['Aucune', 'Occasionnelle', 'Régulière']},
    {'key': 'antecedents',  'label': 'Antécédents familiaux cancer', 'type': 'textarea', 'required': False},
    {'key': 'observations', 'label': 'Autres informations',         'type': 'textarea', 'required': False},
]


@method_decorator(csrf_exempt, name='dispatch')
class PatientFormPublicView(View):
    def get(self, request, token):
        try:
            form_token = get_object_or_404(PatientFormToken, token=token, is_active=True)
            patient    = form_token.patient
            fields     = form_token.fields_config or DEFAULT_FORM_FIELDS
            medecin    = ''
            if patient.created_by:
                medecin = f"Dr. {patient.created_by.prenom} {patient.created_by.nom}".strip()
            return JsonResponse({
                'patient_name': patient.first_name,
                'dossier':      patient.numero_dossier,
                'fields':       fields,
                'medecin':      medecin,
                'token':        str(token),
            })
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=404)

    def post(self, request, token):
        try:
            form_token = get_object_or_404(PatientFormToken, token=token, is_active=True)
            patient    = form_token.patient
            data       = json.loads(request.body)

            PatientFormSubmission.objects.create(
                patient=patient, form_token=form_token,
                submitted_data=data,
                ip_address=request.META.get('REMOTE_ADDR'),
            )

            FIELD_MAP = {
                'telephone': 'phone', 'phone': 'phone',
                'adresse': 'adresse', 'profession': 'profession',
                'poids': 'poids', 'taille': 'taille',
                'allergies': 'allergies', 'observations': 'observations',
            }
            changed = False
            for k, field in FIELD_MAP.items():
                if data.get(k):
                    setattr(patient, field, data[k])
                    changed = True
            if changed:
                patient.save()

            if patient.created_by:
                Notification.objects.create(
                    user=patient.created_by,
                    type='form_submission',
                    title=f'Formulaire soumis — {patient.first_name} {patient.last_name}',
                    message=f'Le patient {patient.first_name} {patient.last_name} (DOS: {patient.numero_dossier}) a soumis son formulaire.',
                    patient=patient,
                    data=data,
                )

            return JsonResponse({
                'success': True,
                'message': 'Vos informations ont été enregistrées avec succès.',
                'dossier': patient.numero_dossier,
            })
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)


# ─── Token & Submissions & Notifications (function-based) ────────────────────

@api_view(['POST'])
@drf_permission_classes([permissions.IsAuthenticated])
def generate_patient_token(request, patient_id):
    patient = get_object_or_404(Patient, id=patient_id)
    if not (request.user.is_staff or getattr(request.user, 'role', '') == 'admin'):
        if patient.created_by != request.user:
            return Response({'detail': 'Non autorisé.'}, status=403)

    fields_config = request.data.get('fields', DEFAULT_FORM_FIELDS)
    frontend_url  = request.data.get('frontend_url', 'http://localhost:3000')

    token_obj, created = PatientFormToken.objects.get_or_create(
        patient=patient,
        defaults={'token': uuid.uuid4(), 'fields_config': fields_config, 'is_active': True},
    )
    if not created and 'fields' in request.data:
        token_obj.fields_config = fields_config
        token_obj.save()

    form_url = f"{frontend_url}/patient-form/{token_obj.token}"
    return Response({'token': str(token_obj.token), 'form_url': form_url, 'qr_data': form_url})


@api_view(['GET'])
@drf_permission_classes([permissions.IsAuthenticated])
def get_patient_form_submissions(request, patient_id):
    patient = get_object_or_404(Patient, id=patient_id)
    subs    = PatientFormSubmission.objects.filter(patient=patient).order_by('-created_at')
    return Response([{
        'id':             s.id,
        'submitted_data': s.submitted_data,
        'created_at':     s.created_at.isoformat(),
        'ip_address':     s.ip_address,
    } for s in subs])


@api_view(['GET'])
@drf_permission_classes([permissions.IsAuthenticated])
def get_notifications(request):
    notifs = Notification.objects.filter(user=request.user).order_by('-created_at')[:50]
    return Response([{
        'id':          n.id,
        'type':        n.type,
        'title':       n.title,
        'message':     n.message,
        'patient_id':  n.patient_id,
        'patient_nom': f"{n.patient.first_name} {n.patient.last_name}" if n.patient else '',
        'dossier':     n.patient.numero_dossier if n.patient else '',
        'data':        n.data,
        'is_read':     n.is_read,
        'created_at':  n.created_at.isoformat(),
    } for n in notifs])


@api_view(['POST'])
@drf_permission_classes([permissions.IsAuthenticated])
def mark_notification_read(request, notif_id):
    notif = get_object_or_404(Notification, id=notif_id, user=request.user)
    notif.is_read = True
    notif.save()
    return Response({'ok': True})