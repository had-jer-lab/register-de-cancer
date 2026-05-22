# ══════════════════════════════════════════
# patients/urls.py
# ══════════════════════════════════════════
from django.urls import path
from .views import (
    WilayaListView, CommuneListView, HospitalListView,
    CancerTypeListView,
    PatientListCreateView, PatientDetailView,
    DashboardStatsView, WilayaStatsView,
    CancerListCreateView, CancerDetailView,
    ConsultationListCreateView,
    StatsByWilayaView, StatsByCommuneView, StatisticsDataView,
    FormSubmissionsView,GenerateFormTokenView, NotificationsView,
)

urlpatterns = [
    # ── Référentiels ──────────────────────────────────────
    path('wilayas/',      WilayaListView.as_view(),    name='wilayas'),
    path('communes/',     CommuneListView.as_view(),   name='communes'),
    path('hospitals/',    HospitalListView.as_view(),  name='hospitals'),
    path('cancer-types/', CancerTypeListView.as_view(), name='cancer-types'),
    path('notifications/', NotificationsView.as_view(), name='notifications'),

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
    path('<int:patient_pk>/form-submissions/', FormSubmissionsView.as_view(), name='form-submissions'),
    path('<int:patient_pk>/generate-form-token/', GenerateFormTokenView.as_view(), name='generate-form-token'),

    # ── Statistiques pour la carte ────────────────────────
    path('stats/wilaya/', StatsByWilayaView.as_view(), name='stats-by-wilaya'),
    path('stats/commune/', StatsByCommuneView.as_view(), name='stats-by-commune'),
    path('statistics-data/', StatisticsDataView.as_view(), name='statistics-data'),
]