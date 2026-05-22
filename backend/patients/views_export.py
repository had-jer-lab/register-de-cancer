"""
API Views for exporting cancer registry statistics in CSV format
"""
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.db.models import Count, Q, Avg, F
from django.db.models.functions import ExtractYear, TruncDate
from django.utils.timezone import now
from datetime import date, datetime, timedelta
from collections import defaultdict
import json

from .models import Cancer, Patient, Commune, Wilaya, CancerType
from django.shortcuts import get_object_or_404
from rest_framework.views import APIView
from rest_framework.response import Response

@require_http_methods(["GET"])
def export_daira_statistics(request):
    """
    Export detailed statistics by daira (district/commune)
    Returns JSON with structured data for CSV generation
    
    Columns:
    - Wilaya: Province name
    - Daira: District/Commune name
    - Nombre_Cas: Total cancer cases
    - Homme: Male patients count
    - Femme: Female patients count
    - Age_Moyen: Average patient age
    - Cancer_Dominant: Most common cancer type
    - Annee: Year of diagnosis
    
    Optional query params:
    - year: Filter by specific year (default: all years)
    - wilaya: Filter by specific wilaya
    """
    
    try:
        # Get query parameters
        year_filter = request.GET.get('year')
        wilaya_filter = request.GET.get('wilaya')
        
        # Get all active patients with related data
        cancers = Cancer.objects.select_related(
            'patient',
            'patient__commune',
            'patient__commune__wilaya',
            'cancer_type'
        ).filter(
            patient__deleted_at__isnull=True
        )
        
        # Apply filters
        if year_filter:
            try:
                year_val = int(year_filter)
                cancers = cancers.filter(
                    date_diagnostic__year=year_val
                )
            except ValueError:
                pass
        
        if wilaya_filter:
            cancers = cancers.filter(
                patient__commune__wilaya__name=wilaya_filter
            )
        
        # Process data by daira
        daira_stats = defaultdict(lambda: {
            'cases': [],
            'patients': {},
            'years': set(),
            'ages': [],
            'genders': defaultdict(int),
            'cancer_types': defaultdict(int)
        })
        
        for cancer in cancers:
            if not cancer.patient.commune or not cancer.patient.commune.wilaya:
                continue
            
            wilaya_name = cancer.patient.commune.wilaya.name
            daira_name = cancer.patient.commune.name
            key = (wilaya_name, daira_name)
            
            # Extract year
            year = None
            if cancer.date_diagnostic:
                year = cancer.date_diagnostic.year
                daira_stats[key]['years'].add(year)
            
            # Track patient info
            patient_id = cancer.patient.id
            if patient_id not in daira_stats[key]['patients']:
                daira_stats[key]['patients'][patient_id] = {
                    'sexe': cancer.patient.sexe,
                    'age': cancer.patient.age,
                    'birthdate': cancer.patient.date_naissance
                }
            
            # Track gender
            daira_stats[key]['genders'][cancer.patient.sexe] += 1
            
            # Track age
            daira_stats[key]['ages'].append(cancer.patient.age)
            
            # Track cancer type
            if cancer.cancer_type:
                daira_stats[key]['cancer_types'][cancer.cancer_type.name] += 1
            
            daira_stats[key]['cases'].append({
                'year': year,
                'cancer_type': cancer.cancer_type.name if cancer.cancer_type else 'Unknown',
                'patient_sexe': cancer.patient.sexe,
                'patient_age': cancer.patient.age
            })
        
        # Build result data
        result_data = []
        
        for (wilaya_name, daira_name), stats in sorted(daira_stats.items()):
            # Count cases
            nombre_cas = len(stats['cases'])
            
            # Count by gender (M=Homme, F=Femme)
            homme_count = stats['genders'].get('M', 0)
            femme_count = stats['genders'].get('F', 0)
            
            # Calculate average age
            age_moyen = None
            if stats['ages']:
                age_moyen = round(sum(stats['ages']) / len(stats['ages']), 1)
            
            # Find dominant cancer type
            cancer_dominant = None
            if stats['cancer_types']:
                cancer_dominant = max(stats['cancer_types'], key=stats['cancer_types'].get)
            
            # Process each year separately
            for year in sorted(stats['years']) or [None]:
                # Filter cases for this year if specified
                if year:
                    year_cases = [c for c in stats['cases'] if c['year'] == year]
                    year_ages = [c['patient_age'] for c in year_cases]
                    year_genders = defaultdict(int)
                    year_cancer_types = defaultdict(int)
                    
                    for case in year_cases:
                        year_genders[case['patient_sexe']] += 1
                        year_cancer_types[case['cancer_type']] += 1
                    
                    nombre_cas_year = len(year_cases)
                    homme_count_year = year_genders.get('M', 0)
                    femme_count_year = year_genders.get('F', 0)
                    age_moyen_year = round(sum(year_ages) / len(year_ages), 1) if year_ages else None
                    cancer_dominant_year = max(year_cancer_types, key=year_cancer_types.get) if year_cancer_types else cancer_dominant
                else:
                    nombre_cas_year = nombre_cas
                    homme_count_year = homme_count
                    femme_count_year = femme_count
                    age_moyen_year = age_moyen
                    cancer_dominant_year = cancer_dominant
                    year = now().year
                
                # Skip if no cases for this year
                if nombre_cas_year == 0:
                    continue
                
                result_data.append({
                    'Wilaya': wilaya_name,
                    'Daira': daira_name,
                    'Nombre_Cas': nombre_cas_year,
                    'Homme': homme_count_year,
                    'Femme': femme_count_year,
                    'Age_Moyen': age_moyen_year or 0,
                    'Cancer_Dominant': cancer_dominant_year or 'N/A',
                    'Annee': year
                })
        
        return JsonResponse({
            'success': True,
            'data': result_data,
            'count': len(result_data)
        })
    
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)


@require_http_methods(["GET"])
def export_wilaya_statistics(request):
    """
    Export statistics aggregated by wilaya (province)
    Similar structure to daira export but aggregated at wilaya level
    """
    try:
        year_filter = request.GET.get('year')
        
        cancers = Cancer.objects.select_related(
            'patient',
            'patient__commune',
            'patient__commune__wilaya',
            'cancer_type'
        ).filter(
            patient__deleted_at__isnull=True
        )
        
        if year_filter:
            try:
                year_val = int(year_filter)
                cancers = cancers.filter(date_diagnostic__year=year_val)
            except ValueError:
                pass
        
        # Aggregate by wilaya
        wilaya_stats = defaultdict(lambda: {
            'cases': [],
            'genders': defaultdict(int),
            'cancer_types': defaultdict(int),
            'ages': [],
            'years': set()
        })
        
        for cancer in cancers:
            if not cancer.patient.commune or not cancer.patient.commune.wilaya:
                continue
            
            wilaya_name = cancer.patient.commune.wilaya.name
            
            if cancer.date_diagnostic:
                wilaya_stats[wilaya_name]['years'].add(cancer.date_diagnostic.year)
            
            wilaya_stats[wilaya_name]['genders'][cancer.patient.sexe] += 1
            wilaya_stats[wilaya_name]['ages'].append(cancer.patient.age)
            
            if cancer.cancer_type:
                wilaya_stats[wilaya_name]['cancer_types'][cancer.cancer_type.name] += 1
            
            wilaya_stats[wilaya_name]['cases'].append(cancer)
        
        # Build result
        result_data = []
        
        for wilaya_name in sorted(wilaya_stats.keys()):
            stats = wilaya_stats[wilaya_name]
            
            nombre_cas = len(stats['cases'])
            homme_count = stats['genders'].get('M', 0)
            femme_count = stats['genders'].get('F', 0)
            age_moyen = round(sum(stats['ages']) / len(stats['ages']), 1) if stats['ages'] else 0
            cancer_dominant = max(stats['cancer_types'], key=stats['cancer_types'].get) if stats['cancer_types'] else 'N/A'
            
            # Use latest year or all years combined
            years = sorted(stats['years']) if stats['years'] else [now().year]
            
            for year in years:
                result_data.append({
                    'Wilaya': wilaya_name,
                    'Daira': '',  # Empty for wilaya-level
                    'Nombre_Cas': nombre_cas,
                    'Homme': homme_count,
                    'Femme': femme_count,
                    'Age_Moyen': age_moyen,
                    'Cancer_Dominant': cancer_dominant,
                    'Annee': year
                })
        
        return JsonResponse({
            'success': True,
            'data': result_data,
            'count': len(result_data)
        })
    
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)


@require_http_methods(["GET"])
def get_export_metadata(request):
    """
    Get metadata for export (list of years, wilayas, etc.)
    Useful for filtering options in frontend
    """
    try:
        # Get available years
        years = Cancer.objects.filter(
            patient__deleted_at__isnull=True,
            date_diagnostic__isnull=False
        ).values_list(
            'date_diagnostic__year', flat=True
        ).distinct().order_by('date_diagnostic__year')
        
        # Get available wilayas
        wilayas = Wilaya.objects.filter(
            communes__patients__cancers__isnull=False
        ).distinct().values_list('name', flat=True).order_by('name')
        
        return JsonResponse({
            'success': True,
            'years': list(years),
            'wilayas': list(wilayas),
            'total_cases': Cancer.objects.filter(
                patient__deleted_at__isnull=True
            ).count()
        })
    
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)
