# ══════════════════════════════════════════
# patients/urls.py
# ══════════════════════════════════════════
from django.urls import path
from .views import (
    WilayaListView, CommuneListView, HospitalListView,
    CancerTypeListView,
    CustomFieldListCreateView, CustomFieldDetailView,
    PatientListCreateView, PatientDetailView,
    DashboardStatsView, WilayaStatsView,
    CancerListCreateView, CancerDetailView,
    ConsultationListCreateView,
    StatsByWilayaView, StatsByCommuneView, StatisticsDataView,
    DemandeExamenListCreateView,
    DemandeExamenDetailView,
    AllDemandesView,
    # ── Nouveaux endpoints ──
    BiologicalExamListCreateView,
    ImagingExamListCreateView,
    MetastasisListCreateView,
    FollowUpListCreateView,
    PatientHabitListCreateView,
    PublicPatientView,
    TreatmentListCreateView,
    TreatmentDetailView,
)

urlpatterns = [
    # ── Référentiels ──────────────────────────────────────
    path('wilayas/',      WilayaListView.as_view(),    name='wilayas'),
    path('communes/',     CommuneListView.as_view(),   name='communes'),
    path('hospitals/',    HospitalListView.as_view(),  name='hospitals'),
    path('cancer-types/', CancerTypeListView.as_view(), name='cancer-types'),

    # ── Champs personnalisés ───────────────────────────────
    path('custom-fields/', CustomFieldListCreateView.as_view(), name='custom-fields'),
    path('custom-fields/<int:pk>/', CustomFieldDetailView.as_view(), name='custom-field-detail'),

    # ── Dashboard stats ───────────────────────────────────
    path('stats/',        DashboardStatsView.as_view(), name='dashboard-stats'),
    path('wilaya-stats/', WilayaStatsView.as_view(),   name='wilaya-stats'),

    # ── Patients ──────────────────────────────────────────
    path('',              PatientListCreateView.as_view(), name='patients'),
    path('<int:pk>/',     PatientDetailView.as_view(),     name='patient-detail'),

    # ── Nested : Cancers ──────────────────────────────────
    path('<int:patient_pk>/cancers/',        CancerListCreateView.as_view(), name='patient-cancers'),
    path('<int:patient_pk>/cancers/<int:pk>/', CancerDetailView.as_view(),  name='patient-cancer-detail'),

    # ── Nested : Consultations ────────────────────────────
    path('<int:patient_pk>/consultations/',  ConsultationListCreateView.as_view(), name='patient-consultations'),

    # ── Statistiques pour la carte ────────────────────────
    path('stats/wilaya/', StatsByWilayaView.as_view(), name='stats-by-wilaya'),
    path('stats/commune/', StatsByCommuneView.as_view(), name='stats-by-commune'),
    path('statistics-data/', StatisticsDataView.as_view(), name='statistics-data'),
    # ── Dashboard ─────────────────────────────────────────────────────────────
    path('stats/',         DashboardStatsView.as_view(), name='dashboard-stats'),

    # ── Patients ──────────────────────────────────────────────────────────────
    path('',               PatientListCreateView.as_view(), name='patients'),
    path('<int:pk>/',      PatientDetailView.as_view(),     name='patient-detail'),
    path('public/<int:pk>/', PublicPatientView.as_view(),   name='patient-public'),

    # ── Cancers (nested sous patient) ─────────────────────────────────────────
    path('<int:patient_pk>/cancers/',
         CancerListCreateView.as_view(),  name='patient-cancers'),
    path('<int:patient_pk>/cancers/<int:pk>/',
         CancerDetailView.as_view(),      name='patient-cancer-detail'),

    # ── Traitements ───────────────────────────────────────────────────────────
    path('<int:patient_pk>/cancers/<int:cancer_pk>/treatments/',
         TreatmentListCreateView.as_view(), name='patient-cancer-treatments'),
    path('<int:patient_pk>/cancers/<int:cancer_pk>/treatments/<int:pk>/',
         TreatmentDetailView.as_view(), name='patient-cancer-treatment-detail'),

    # ── Examens biologiques ────────────────────────────────────────────────────
    path('<int:patient_pk>/cancers/<int:cancer_pk>/biological-exams/',
         BiologicalExamListCreateView.as_view(), name='patient-cancer-bio-exams'),

    # ── Imagerie ──────────────────────────────────────────────────────────────
    path('<int:patient_pk>/cancers/<int:cancer_pk>/imaging-exams/',
         ImagingExamListCreateView.as_view(), name='patient-cancer-imaging-exams'),

    # ── Métastases ─────────────────────────────────────────────────────────────
    path('<int:patient_pk>/cancers/<int:cancer_pk>/metastases/',
         MetastasisListCreateView.as_view(), name='patient-cancer-metastases'),

    # ── Suivi ──────────────────────────────────────────────────────────────────
    path('<int:patient_pk>/cancers/<int:cancer_pk>/follow-ups/',
         FollowUpListCreateView.as_view(), name='patient-cancer-followups'),

    # ── Consultations ─────────────────────────────────────────────────────────
    path('<int:patient_pk>/consultations/',
         ConsultationListCreateView.as_view(), name='patient-consultations'),

    # ── Habitudes de vie ───────────────────────────────────────────────────────
    path('<int:patient_pk>/habits/',
         PatientHabitListCreateView.as_view(), name='patient-habits'),

    # ── Demandes par patient ──────────────────────────────────────────────────
    path('<int:patient_pk>/demandes/',
         DemandeExamenListCreateView.as_view(), name='patient-demandes'),
    path('<int:patient_pk>/demandes/<int:pk>/',
         DemandeExamenDetailView.as_view(),     name='patient-demande-detail'),

    # ── Toutes les demandes ───────────────────────────────────────────────────
    path('demandes/all/', AllDemandesView.as_view(), name='all-demandes'),
]

# ─── QR Code Formulaire Patient & Notifications ───────────────────────────────

from django.urls import path as _path
from .views import (
    PatientFormPublicView,
    generate_patient_token,
    get_patient_form_submissions,
    get_notifications,
    mark_notification_read,
)

urlpatterns += [
    _path('patient-form/<str:token>/',
          PatientFormPublicView.as_view(), name='patient-form-public'),

    _path('<int:patient_id>/generate-form-token/',
          generate_patient_token,           name='generate-form-token'),
    _path('<int:patient_id>/form-submissions/',
          get_patient_form_submissions,     name='form-submissions'),

    _path('notifications/',
          get_notifications,                name='notifications'),
    _path('notifications/<int:notif_id>/read/',
          mark_notification_read,           name='notif-read'),
]

