"""
patients/models.py — Version complète synchronisée avec l'interface
Tous les champs collectés par les formulaires Page1→Page6 sont présents.
"""
from django.db import models
from django.conf import settings


# ─── Géographie ───────────────────────────────────────────────────────────────

class Wilaya(models.Model):
    name = models.CharField(max_length=100)

    class Meta:
        ordering = ['name']
        verbose_name_plural = 'Wilayas'

    def __str__(self):
        return self.name


class Commune(models.Model):
    name        = models.CharField(max_length=100)
    wilaya      = models.ForeignKey(Wilaya, on_delete=models.CASCADE, related_name='communes')
    postal_code = models.CharField(max_length=10, blank=True)
    latitude    = models.FloatField(null=True, blank=True)
    longitude   = models.FloatField(null=True, blank=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.wilaya.name})"


class Hospital(models.Model):
    TYPE_CHOICES = [
        ('chu',    'CHU'),
        ('ehu',    'EHU'),
        ('epsp',   'EPSP'),
        ('clinic', 'Clinique privée'),
        ('other',  'Autre'),
    ]
    name       = models.CharField(max_length=200)
    wilaya     = models.ForeignKey(Wilaya, on_delete=models.SET_NULL, null=True, related_name='hospitals')
    type       = models.CharField(max_length=20, choices=TYPE_CHOICES, default='chu')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


# ─── Patient ──────────────────────────────────────────────────────────────────

class Patient(models.Model):
    SEXE_CHOICES = [('M', 'Masculin'), ('F', 'Féminin')]
    SOURCE_CHOICES = [
        ('manual', 'Saisie manuelle'),
        ('import', 'Import CSV/Excel'),
        ('oedi',   'OEDI'),
    ]

    numero_dossier       = models.CharField(max_length=30, unique=True, blank=True)
    national_id          = models.CharField(max_length=20, unique=True, null=True, blank=True)
    first_name           = models.CharField(max_length=100)
    last_name            = models.CharField(max_length=100)
    date_naissance       = models.DateField()
    sexe                 = models.CharField(max_length=1, choices=SEXE_CHOICES)
    phone                = models.CharField(max_length=20, blank=True)
    commune              = models.ForeignKey(Commune,  on_delete=models.SET_NULL, null=True, blank=True, related_name='patients')
    hospital             = models.ForeignKey(Hospital, on_delete=models.SET_NULL, null=True, blank=True, related_name='patients')
    created_by           = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='patients_crees')
    is_merged            = models.BooleanField(default=False)
    merged_into_patient  = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='merged_patients')
    data_source          = models.CharField(max_length=20, choices=SOURCE_CHOICES, default='manual')
    created_at           = models.DateTimeField(auto_now_add=True)
    updated_at           = models.DateTimeField(auto_now=True)
    deleted_at           = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.numero_dossier} — {self.first_name} {self.last_name}"

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"

    @property
    def age(self):
        from datetime import date
        today = date.today()
        b = self.date_naissance
        return today.year - b.year - ((today.month, today.day) < (b.month, b.day))

    def save(self, *args, **kwargs):
        if not self.numero_dossier:
            from datetime import date
            year  = date.today().year
            count = Patient.objects.filter(created_at__year=year).count() + 1
            self.numero_dossier = f"DOS-{year}-{count:05d}"
        super().save(*args, **kwargs)


# ─── Cancer Types ─────────────────────────────────────────────────────────────

class CancerType(models.Model):
    name       = models.CharField(max_length=100)
    cim10_code = models.CharField(max_length=10, unique=True, null=True, blank=True)

    def __str__(self):
        return f"{self.name} ({self.cim10_code or '—'})"


# ─── Cancer ───────────────────────────────────────────────────────────────────

class Cancer(models.Model):
    SOURCE_CHOICES = [('manual', 'Manuel'), ('import', 'Import'), ('oedi', 'OEDI')]
    TYPE_TUMEUR_CHOICES = [
        ('solide',         'Solide'),
        ('liquide',        'Liquide'),
        ('hematologique',  'Hématologique'),
    ]
    RECEPTEUR_CHOICES = [
        ('positif', 'Positif'),
        ('negatif', 'Négatif'),
        ('inconnu', 'Inconnu'),
    ]
    HER2_CHOICES = [
        ('positif',   'Positif'),
        ('equivoque', 'Équivoque'),
        ('negatif',   'Négatif'),
        ('inconnu',   'Inconnu'),
    ]

    # ── Référence patient ─────────────────────────────────────────────────────
    patient    = models.ForeignKey(Patient,    on_delete=models.CASCADE, related_name='cancers')
    cancer_type = models.ForeignKey(CancerType, on_delete=models.SET_NULL, null=True, blank=True)

    # ── Localisation ──────────────────────────────────────────────────────────
    type_tumeur        = models.CharField(max_length=30, choices=TYPE_TUMEUR_CHOICES, blank=True)
    sous_type          = models.CharField(max_length=100, blank=True)
    lateralite         = models.CharField(max_length=20, blank=True)   # Droit/Gauche/Bilatéral/N/A
    cim10_code         = models.CharField(max_length=15, blank=True)

    # ── Diagnostic ────────────────────────────────────────────────────────────
    date_symptomes     = models.DateField(null=True, blank=True)
    date_diagnostic    = models.DateField(null=True, blank=True)
    base_diagnostic    = models.JSONField(default=list, blank=True)    # list of strings
    etablissement_diag = models.CharField(max_length=200, blank=True)
    service_diag       = models.CharField(max_length=100, blank=True)
    medecin_diag       = models.CharField(max_length=150, blank=True)

    # ── Histologie ────────────────────────────────────────────────────────────
    type_histologique  = models.CharField(max_length=100, blank=True)
    grade_histologique = models.CharField(max_length=50, blank=True)
    bloc_anapath       = models.CharField(max_length=50, blank=True)

    # ── Classification TNM & Stade ────────────────────────────────────────────
    stade_clinique     = models.CharField(max_length=10, blank=True)
    stade_pathologique = models.CharField(max_length=10, blank=True)
    tnm                = models.CharField(max_length=30, blank=True)   # ex: T2N1M0
    grade              = models.CharField(max_length=20, blank=True)

    # ── Données tumorales ─────────────────────────────────────────────────────
    taille_tumorale    = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    ganglions_envahis  = models.PositiveSmallIntegerField(null=True, blank=True)

    # ── Statut ────────────────────────────────────────────────────────────────
    localise           = models.BooleanField(default=True)
    metastatique       = models.BooleanField(default=False)
    recidive           = models.BooleanField(default=False)
    sites_metastatiques = models.JSONField(default=list, blank=True)   # list of strings

    # ── Récepteurs hormonaux ──────────────────────────────────────────────────
    recepteur_er       = models.CharField(max_length=20, choices=RECEPTEUR_CHOICES, blank=True)
    recepteur_pr       = models.CharField(max_length=20, choices=RECEPTEUR_CHOICES, blank=True)
    her2               = models.CharField(max_length=20, choices=HER2_CHOICES, blank=True)

    # ── Méta ──────────────────────────────────────────────────────────────────
    data_source        = models.CharField(max_length=20, choices=SOURCE_CHOICES, default='manual')
    created_at         = models.DateTimeField(auto_now_add=True)
    updated_at         = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Cancer {self.cancer_type} — {self.patient}"

    @property
    def triple_negatif(self):
        return (
            self.recepteur_er == 'negatif' and
            self.recepteur_pr == 'negatif' and
            self.her2 == 'negatif'
        )


# ─── Traitement ───────────────────────────────────────────────────────────────

class Treatment(models.Model):
    TYPE_CHOICES = [
        ('chimio',    'Chimiothérapie'),
        ('radio',     'Radiothérapie'),
        ('chirurgie', 'Chirurgie'),
        ('hormono',   'Hormonothérapie'),
        ('immuno',    'Immunothérapie'),
        ('targeted',  'Thérapie ciblée'),
    ]
    INTENTION_CHOICES = [
        ('curatif',        'Curatif'),
        ('adjuvant',       'Adjuvant'),
        ('neo_adjuvant',   'Néo-adjuvant'),
        ('palliatif',      'Palliatif'),
        ('prophylactique', 'Prophylactique'),
    ]
    STATUT_CHOICES = [
        ('planifie',  'Planifié'),
        ('en_cours',  'En cours'),
        ('termine',   'Terminé'),
        ('pause',     'Pause'),
        ('suspendu',  'Suspendu'),
        ('abandonne', 'Abandonné'),
    ]
    REPONSE_CHOICES = [
        ('RC', 'Rémission complète'),
        ('RP', 'Rémission partielle'),
        ('SD', 'Stabilisation'),
        ('PD', 'Progression'),
        ('NE', 'Non évaluable'),
    ]

    cancer               = models.ForeignKey(Cancer, on_delete=models.CASCADE, related_name='treatments')

    # Identification
    type_traitement      = models.CharField(max_length=20, choices=TYPE_CHOICES)
    intention            = models.CharField(max_length=30, choices=INTENTION_CHOICES, blank=True)
    statut               = models.CharField(max_length=20, choices=STATUT_CHOICES, default='planifie')
    ligne                = models.CharField(max_length=30, blank=True)

    # Protocole
    protocole            = models.CharField(max_length=200, blank=True)
    medicaments          = models.TextField(blank=True)
    voie_administration  = models.CharField(max_length=50, blank=True)
    jours_administration = models.JSONField(default=list, blank=True)

    # Cycles
    cycles_prevus        = models.PositiveSmallIntegerField(null=True, blank=True)
    cycles_realises      = models.PositiveSmallIntegerField(null=True, blank=True)

    # Dates
    date_debut           = models.DateField(null=True, blank=True)
    date_fin             = models.DateField(null=True, blank=True)

    # Évaluation
    reponse_tumorale     = models.CharField(max_length=10, choices=REPONSE_CHOICES, blank=True)
    date_evaluation      = models.DateField(null=True, blank=True)

    # Toxicité
    grade_toxicite       = models.CharField(max_length=15, blank=True)
    description_toxicite = models.TextField(blank=True)

    created_at           = models.DateTimeField(auto_now_add=True)
    updated_at           = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['date_debut']

    def __str__(self):
        return f"{self.get_type_traitement_display()} — {self.cancer.patient}"


# ─── Examens biologiques ──────────────────────────────────────────────────────

class BiologicalExam(models.Model):
    cancer       = models.ForeignKey(Cancer, on_delete=models.CASCADE, related_name='biological_exams')
    type_analyse = models.CharField(max_length=100)
    resultat     = models.TextField(blank=True)
    unite        = models.CharField(max_length=20, blank=True)
    valeur       = models.DecimalField(max_digits=10, decimal_places=3, null=True, blank=True)
    date_analyse = models.DateField(null=True, blank=True)

    def __str__(self):
        return f"{self.type_analyse}: {self.valeur} {self.unite}"


class ImagingExam(models.Model):
    cancer      = models.ForeignKey(Cancer, on_delete=models.CASCADE, related_name='imaging_exams')
    type_examen = models.CharField(max_length=100)
    conclusion  = models.TextField(blank=True)
    date_examen = models.DateField(null=True, blank=True)


class Histology(models.Model):
    cancer                    = models.OneToOneField(Cancer, on_delete=models.CASCADE, related_name='histology')
    type_histologique         = models.CharField(max_length=100, blank=True)
    grade_histologique        = models.CharField(max_length=20, blank=True)
    marge_chirurgicale        = models.CharField(max_length=50, blank=True)
    envahissement_vasculaire  = models.BooleanField(null=True, blank=True)
    envahissement_lymphatique = models.BooleanField(null=True, blank=True)
    date_resultat             = models.DateField(null=True, blank=True)
    data_source               = models.CharField(max_length=20, default='manual')


class Metastasis(models.Model):
    cancer         = models.ForeignKey(Cancer, on_delete=models.CASCADE, related_name='metastases')
    organe         = models.CharField(max_length=100)
    date_detection = models.DateField(null=True, blank=True)


class FollowUp(models.Model):
    cancer          = models.ForeignKey(Cancer, on_delete=models.CASCADE, related_name='follow_ups')
    date_visite     = models.DateField()
    statut_clinique = models.CharField(max_length=100, blank=True)
    observation     = models.TextField(blank=True)

    class Meta:
        ordering = ['-date_visite']


class DemandeExamen(models.Model):
    TYPE_CHOICES = [
        ('biologie', 'Bilan biologique'),
        ('imagerie', 'Imagerie radiologique'),
    ]
    STATUT_CHOICES = [
        ('en_attente', 'En attente'),
        ('en_cours', 'En cours'),
        ('resultat_disponible', 'Résultat disponible'),
        ('annule', 'Annulé'),
    ]
    URGENCE_CHOICES = [
        ('normal', 'Normal'),
        ('urgent', 'Urgent'),
        ('tres_urgent', 'Très urgent'),
    ]

    patient          = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='demandes_examens')
    cancer           = models.ForeignKey(Cancer, on_delete=models.SET_NULL, null=True, blank=True, related_name='demandes_examens')
    medecin          = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='demandes_envoyees')
    type_demande     = models.CharField(max_length=20, choices=TYPE_CHOICES)
    statut           = models.CharField(max_length=20, choices=STATUT_CHOICES, default='en_attente')
    urgence          = models.CharField(max_length=11, choices=URGENCE_CHOICES, default='normal')
    examens_demandes = models.JSONField(default=list)
    motif_clinique   = models.TextField(blank=True)
    observations     = models.TextField(blank=True)
    date_demande     = models.DateTimeField(auto_now_add=True)
    date_souhaitee   = models.DateField(null=True, blank=True)
    resultat_texte   = models.TextField(blank=True)
    date_resultat    = models.DateField(null=True, blank=True)

    class Meta:
        ordering = ['-date_demande']

    def __str__(self):
        return f"Demande d'examen #{self.id} — {self.patient}"


class CancerStatusHistory(models.Model):
    cancer      = models.ForeignKey(Cancer, on_delete=models.CASCADE, related_name='status_history')
    status      = models.CharField(max_length=50)
    status_date = models.DateField()


# ─── Décès ────────────────────────────────────────────────────────────────────

class Death(models.Model):
    patient          = models.OneToOneField(Patient, on_delete=models.CASCADE, related_name='death')
    date_death       = models.DateField()
    cause_principale = models.CharField(max_length=200, blank=True)


# ─── Facteurs de risque & Habitudes ──────────────────────────────────────────

class RiskFactor(models.Model):
    name = models.CharField(max_length=100, unique=True)

    def __str__(self):
        return self.name


class PatientRiskFactor(models.Model):
    patient     = models.ForeignKey(Patient,    on_delete=models.CASCADE, related_name='risk_factors')
    risk_factor = models.ForeignKey(RiskFactor, on_delete=models.CASCADE)

    class Meta:
        unique_together = ('patient', 'risk_factor')


class Habit(models.Model):
    name = models.CharField(max_length=100, unique=True)

    def __str__(self):
        return self.name


class PatientHabit(models.Model):
    patient        = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='habits')
    habit          = models.ForeignKey(Habit,   on_delete=models.CASCADE)
    frequency      = models.CharField(max_length=50, blank=True)
    duration_years = models.PositiveIntegerField(null=True, blank=True)

    class Meta:
        unique_together = ('patient', 'habit')


# ─── Consultations ────────────────────────────────────────────────────────────

class Consultation(models.Model):
    patient           = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='consultations')
    user              = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='consultations')
    consultation_date = models.DateField()
    motif             = models.CharField(max_length=200, blank=True)
    compte_rendu      = models.TextField(blank=True)
    next_visit_date   = models.DateField(null=True, blank=True)

    class Meta:
        ordering = ['-consultation_date']


# ─── Doublons ─────────────────────────────────────────────────────────────────

class DuplicateCase(models.Model):
    STATUS_CHOICES = [
        ('pending', 'En attente'),
        ('merged',  'Fusionné'),
        ('ignored', 'Ignoré'),
    ]
    patient_1  = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='duplicates_as_1')
    patient_2  = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='duplicates_as_2')
    status     = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Doublon entre {self.patient_1} et {self.patient_2}"


class Notification(models.Model):
    TYPE_CHOICES = [
        ('form_submission', 'Formulaire soumis'),
        ('doublon', 'Doublon détecté'),
        ('rcp', 'Réunion RCP'),
        ('system', 'Système'),
    ]

    user       = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='patient_notifications')
    patient    = models.ForeignKey(Patient, on_delete=models.SET_NULL, null=True, blank=True)
    type       = models.CharField(max_length=30, choices=TYPE_CHOICES)
    title      = models.CharField(max_length=200)
    message    = models.TextField()
    data       = models.JSONField(default=dict, blank=True)
    is_read    = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.type} — {self.user} — {self.title}"

class PatientFormToken(models.Model):
    patient       = models.OneToOneField(Patient, on_delete=models.CASCADE, related_name='form_token')
    token         = models.UUIDField(unique=True)
    fields_config = models.JSONField(default=list)
    is_active     = models.BooleanField(default=True)
    created_at    = models.DateTimeField(auto_now_add=True)
    updated_at    = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"FormToken — {self.patient} ({self.token})"


class PatientFormSubmission(models.Model):
    patient        = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='form_submissions')
    form_token     = models.ForeignKey(PatientFormToken, on_delete=models.SET_NULL, null=True)
    submitted_data = models.JSONField(default=dict)
    ip_address     = models.GenericIPAddressField(null=True, blank=True)
    created_at     = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Submission — {self.patient} — {self.created_at:%d/%m/%Y %H:%M}"
        return f"Soumission formulaire #{self.id} pour {self.patient}"


# ─── Champs personnalisés ─────────────────────────────────────────────────────

class CustomField(models.Model):
    FIELD_TYPE_CHOICES = [
        ('text',     'Texte libre'),
        ('number',   'Nombre'),
        ('date',     'Date'),
        ('select',   'Liste déroulante'),
        ('boolean',  'Oui / Non'),
        ('textarea', 'Texte long'),
    ]
    SECTION_CHOICES = [
        ('diagnostic', 'Diagnostic & Cancer'),
        ('biologie',   'Données biologiques'),
        ('traitement', 'Traitement'),
        ('autres',     'Autres'),
    ]

    name          = models.CharField(max_length=100, verbose_name='Nom technique')
    label         = models.CharField(max_length=200, verbose_name='Libellé affiché')
    field_type    = models.CharField(
        max_length=20,
        choices=FIELD_TYPE_CHOICES,
        default='text',
        verbose_name='Type de champ'
    )
    options       = models.JSONField(default=list, blank=True, help_text='Pour les listes déroulantes: ["option1", "option2"]')
    is_required   = models.BooleanField(default=False, verbose_name='Obligatoire')
    is_active     = models.BooleanField(default=True, verbose_name='Actif')
    order         = models.PositiveIntegerField(default=0, verbose_name='Ordre d\'affichage')
    section       = models.CharField(
        max_length=50,
        choices=SECTION_CHOICES,
        default='diagnostic',
        verbose_name='Section'
    )
    description   = models.TextField(blank=True, verbose_name='Description')
    created_at    = models.DateTimeField(auto_now_add=True)
    updated_at    = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['section', 'order', 'created_at']
        verbose_name = 'Champ personnalisé'
        verbose_name_plural = 'Champs personnalisés'

    def __str__(self):
        return f"{self.label} ({self.get_field_type_display()})"


class CancerCustomValue(models.Model):
    """Stores custom field values for each cancer"""
    cancer    = models.ForeignKey(Cancer, on_delete=models.CASCADE, related_name='custom_values')
    field     = models.ForeignKey(CustomField, on_delete=models.CASCADE, related_name='values')
    value     = models.TextField(blank=True, verbose_name='Valeur')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('cancer', 'field')
        verbose_name = 'Valeur de champ personnalisé'
        verbose_name_plural = 'Valeurs de champs personnalisés'

    def __str__(self):
        return f"{self.field.label}: {self.value[:50]}"
