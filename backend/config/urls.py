# ══════════════════════════════════════════
# config/urls.py
# ══════════════════════════════════════════
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from patients.views import PatientFormView
urlpatterns = [
    path('admin-panel/', admin.site.urls),
    path('api/auth/',    include('accounts.urls')),
    path('api/patients/',include('patients.urls')),
    path('api/statistic/', include('statistic.urls')),
    path('api/', include('patients.urls')),  # ← هاد خاص يكون موجود
    path('api/patient-form/<uuid:token>/', PatientFormView.as_view(), name='patient-form'),  # ✅ زيد هاد

    path('api/rcp/',     include('rcp.urls')),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)