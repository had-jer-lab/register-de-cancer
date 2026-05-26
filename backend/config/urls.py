# config/urls.py
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.shortcuts import redirect


def patient_form_redirect(request, id):
    return redirect(f'https://register-de-cancer-frontend.vercel.app/patient-form/{id}')


urlpatterns = [
    path('admin-panel/', admin.site.urls),

    path('api/auth/',      include('accounts.urls')),
    path('api/patients/',  include('patients.urls')),
    path('api/rcp/',       include('rcp.urls')),
    path('api/statistic/', include('statistic.urls')),

    path('patient-form/<uuid:id>/', patient_form_redirect, name='patient-form-redirect'),

] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
