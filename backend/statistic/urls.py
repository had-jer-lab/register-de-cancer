from django.urls import path
from . import views

urlpatterns = [
    path('stats/', views.statistics_view, name='statistics'),
    path('zone-stats/', views.zone_stats_view, name='zone-stats'),
]