# backend/statistic/views.py
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Count, Q
from datetime import date
from patients.models import Cancer, Patient, Wilaya, Commune

def get_age_group(age):
    if age is None: return "Inconnu"
    if age <= 14:   return "0-14"
    if age <= 29:   return "15-29"
    if age <= 44:   return "30-44"
    if age <= 59:   return "45-59"
    return "60+"

def calc_age(date_naissance):
    if not date_naissance: return None
    today = date.today()
    return today.year - date_naissance.year - (
        (today.month, today.day) < (date_naissance.month, date_naissance.day)
    )

@api_view(['GET'])
@permission_classes([])  # Temporairement retiré pour permettre le chargement des données
def statistics_view(request):
    """
    GET /api/statistics/
    Params: sexe (M/F/all), age (all/0-14/15-29/30-44/45-59/60+),
            year_start, year_end, cancer_type, stade, wilaya_id
            wilaya (multiple), daira (multiple)
    """
    sexe        = request.GET.get('sexe', 'all')
    age_group   = request.GET.get('age', 'all')
    year_start  = request.GET.get('year_start') or request.GET.get('yearStart')
    year_end    = request.GET.get('year_end') or request.GET.get('yearEnd')
    cancer_filter = request.GET.get('cancer_type')
    stade_filter  = request.GET.get('stade')
    wilaya_filter = request.GET.get('wilaya_id')
    
    # Multiple wilaya/daira support
    wilayas_list = request.GET.getlist('wilaya')
    dairas_list = request.GET.getlist('daira')

    # Base queryset
    qs = Cancer.objects.select_related(
        'patient', 'patient__commune', 'patient__commune__wilaya',
        'cancer_type', 'patient__hospital', 'patient__hospital__wilaya'
    ).filter(patient__deleted_at__isnull=True)

    # Filtres
    if sexe in ['M', 'F']:
        qs = qs.filter(patient__sexe=sexe)
    if year_start:
        qs = qs.filter(date_diagnostic__year__gte=int(year_start))
    if year_end:
        qs = qs.filter(date_diagnostic__year__lte=int(year_end))
    if cancer_filter:
        qs = qs.filter(cancer_type__name__icontains=cancer_filter)
    if stade_filter:
        qs = qs.filter(stade_clinique__icontains=stade_filter)
    if wilaya_filter:
        qs = qs.filter(
            Q(patient__commune__wilaya_id=wilaya_filter) |
            Q(patient__hospital__wilaya_id=wilaya_filter)
        )
    
    # Multiple wilaya filter
    if wilayas_list:
        qs = qs.filter(
            Q(patient__commune__wilaya__name__in=wilayas_list) |
            Q(patient__hospital__wilaya__name__in=wilayas_list)
        )
    
    # Multiple daira filter
    if dairas_list:
        qs = qs.filter(patient__commune__name__in=dairas_list)

    today = date.today()
    raw_data = []

    for cancer in qs:
        p = cancer.patient
        age = calc_age(p.date_naissance)
        ag  = get_age_group(age)

        # Wilaya du patient
        wilaya_name = None
        if p.commune and p.commune.wilaya:
            wilaya_name = p.commune.wilaya.name
        elif p.hospital and p.hospital.wilaya:
            wilaya_name = p.hospital.wilaya.name

        # Daira/Commune
        daira_name = p.commune.name if p.commune else None

        # Année diagnostic
        year = cancer.date_diagnostic.year if cancer.date_diagnostic else None

        # Mois
        month_names = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']
        month = month_names[cancer.date_diagnostic.month - 1] if cancer.date_diagnostic else 'Jan'

        # Stade
        stade = cancer.stade_clinique or 'Stade I'

        # Traitement (premier)
        traitement = 'Manuel'
        if cancer.treatments.exists():
            traitement = cancer.treatments.first().type_traitement

        raw_data.append({
            'wilaya':     wilaya_name,
            'daira':      daira_name,
            'sex':        p.sexe,
            'age':        ag,
            'cancer':     cancer.cancer_type.name if cancer.cancer_type else 'Inconnu',
            'cancer_id':  str(cancer.cancer_type_id) if cancer.cancer_type else None,
            'year':       year,
            'stade':      stade,
            'cases':      1,
            'month':      month,
            'traitement': traitement,
            'mode':       'Manuel',
        })

    # Agrégations pour les KPIs
    total_patients = Patient.objects.filter(deleted_at__isnull=True).count()
    total_cancers  = qs.count()

    # Top wilayas
    wilaya_counts = {}
    cancer_counts = {}
    year_counts   = {}
    sex_counts    = {'M': 0, 'F': 0}

    for d in raw_data:
        if d['wilaya']:
            wilaya_counts[d['wilaya']] = wilaya_counts.get(d['wilaya'], 0) + 1
        if d['cancer']:
            cancer_counts[d['cancer']] = cancer_counts.get(d['cancer'], 0) + 1
        if d['year']:
            year_counts[str(d['year'])] = year_counts.get(str(d['year']), 0) + 1
        if d['sex']:
            sex_counts[d['sex']] = sex_counts.get(d['sex'], 0) + 1

    dominant_wilaya = max(wilaya_counts, key=wilaya_counts.get) if wilaya_counts else None
    dominant_cancer = max(cancer_counts, key=cancer_counts.get) if cancer_counts else None

    # Liste des types de cancer disponibles
    cancer_types = list(
        Cancer.objects.select_related('cancer_type')
        .filter(patient__deleted_at__isnull=True)
        .values('cancer_type__id', 'cancer_type__name')
        .distinct()
        .order_by('cancer_type__name')
    )

    # Liste des wilayas disponibles
    wilayas = list(Wilaya.objects.values('id', 'name').order_by('name'))

    # Années disponibles
    years_qs = Cancer.objects.filter(
        patient__deleted_at__isnull=True,
        date_diagnostic__isnull=False
    ).values_list('date_diagnostic__year', flat=True).distinct().order_by('date_diagnostic__year')
    available_years = [y for y in years_qs if y]

    return Response({
        'raw_data':        raw_data,
        'total_patients':  total_patients,
        'total_cancers':   total_cancers,
        'dominant_wilaya': dominant_wilaya,
        'dominant_cancer': dominant_cancer,
        'wilaya_counts':   wilaya_counts,
        'cancer_counts':   cancer_counts,
        'year_counts':     year_counts,
        'sex_counts':      sex_counts,
        'cancer_types':    cancer_types,
        'wilayas':         wilayas,
        'available_years': available_years,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def wilaya_detail_view(request, wilaya_name):
    """
    GET /api/statistics/wilaya/<wilaya_name>/
    Retourne les détails d'une wilaya: dairas, cancers, évolution
    """
    qs = Cancer.objects.select_related(
        'patient', 'patient__commune', 'patient__commune__wilaya', 'cancer_type'
    ).filter(
        patient__deleted_at__isnull=True,
        patient__commune__wilaya__name=wilaya_name
    )

    daira_counts   = {}
    cancer_counts  = {}
    year_counts    = {}
    sex_counts     = {'M': 0, 'F': 0}
    stade_counts   = {}
    age_counts     = {}

    for cancer in qs:
        p = cancer.patient
        age = calc_age(p.date_naissance)
        ag  = get_age_group(age)

        daira = p.commune.name if p.commune else 'Inconnue'
        daira_counts[daira]  = daira_counts.get(daira, 0) + 1

        ct = cancer.cancer_type.name if cancer.cancer_type else 'Inconnu'
        cancer_counts[ct]    = cancer_counts.get(ct, 0) + 1

        yr = str(cancer.date_diagnostic.year) if cancer.date_diagnostic else 'Inconnu'
        year_counts[yr]      = year_counts.get(yr, 0) + 1

        sex_counts[p.sexe]   = sex_counts.get(p.sexe, 0) + 1

        st = cancer.stade_clinique or 'Non précisé'
        stade_counts[st]     = stade_counts.get(st, 0) + 1

        age_counts[ag]       = age_counts.get(ag, 0) + 1

    total = qs.count()

    return Response({
        'wilaya':         wilaya_name,
        'total':          total,
        'daira_counts':   daira_counts,
        'cancer_counts':  cancer_counts,
        'year_counts':    year_counts,
        'sex_counts':     sex_counts,
        'stade_counts':   stade_counts,
        'age_counts':     age_counts,
        'dominant_cancer': max(cancer_counts, key=cancer_counts.get) if cancer_counts else None,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def zone_stats_view(request):
    """
    GET /api/statistic/zone-stats/
    Params: wilaya (multiple), daira (multiple), year_start, year_end
    """
    wilayas = request.GET.getlist('wilaya')
    dairas = request.GET.getlist('daira')
    year_start = request.GET.get('year_start')
    year_end = request.GET.get('year_end')

    qs = Cancer.objects.select_related(
        'patient', 'patient__commune', 'patient__commune__wilaya', 'cancer_type'
    ).filter(patient__deleted_at__isnull=True)

    if wilayas:
        qs = qs.filter(patient__commune__wilaya__name__in=wilayas)
    if dairas:
        qs = qs.filter(patient__commune__name__in=dairas)
    if year_start:
        try:
            qs = qs.filter(date_diagnostic__year__gte=int(year_start))
        except ValueError:
            pass
    if year_end:
        try:
            qs = qs.filter(date_diagnostic__year__lte=int(year_end))
        except ValueError:
            pass

    month_names = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']
    raw_data = []

    for cancer in qs:
        p = cancer.patient
        wilaya_name = p.commune.wilaya.name if p.commune and p.commune.wilaya else None
        daira_name = p.commune.name if p.commune else None
        year = cancer.date_diagnostic.year if cancer.date_diagnostic else None
        month = month_names[cancer.date_diagnostic.month - 1] if cancer.date_diagnostic and cancer.date_diagnostic.month else None
        raw_data.append({
            'wilaya': wilaya_name,
            'daira': daira_name,
            'sex': p.sexe,
            'age': get_age_group(calc_age(p.date_naissance)),
            'cancer': cancer.cancer_type.name if cancer.cancer_type else 'Inconnu',
            'cancer_id': str(cancer.cancer_type_id) if cancer.cancer_type else None,
            'year': year,
            'stade': cancer.stade_clinique or 'Stade I',
            'cases': 1,
            'month': month,
            'traitement': cancer.treatments.first().type_traitement if cancer.treatments.exists() else 'Manuel',
            'mode': 'Manuel',
        })

    return Response({'raw_data': raw_data})