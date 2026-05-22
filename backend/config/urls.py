# ══════════════════════════════════════════
# config/urls.py
# ══════════════════════════════════════════
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin-panel/', admin.site.urls),
    path('api/auth/',    include('accounts.urls')),
    path('api/patients/',include('patients.urls')),
    path('api/rcp/',     include('rcp.urls')),  # ← LIGNE AJOUTÉE
    path('api/', include('patients.urls')),
]