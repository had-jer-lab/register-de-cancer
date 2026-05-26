"""
patients/serializers.py — Sérialiseurs complets synchronisés avec les modèles et l'interface
"""
from rest_framework import serializers
from .models import (
    Wilaya, Commune, Hospital,
    Patient, CancerType, Cancer,
    Treatment, BiologicalExam, ImagingExam,
    Histology, Metastasis, FollowUp,
    CancerStatusHistory, Death,
    RiskFactor, PatientRiskFactor,
    Habit, PatientHabit, Consultation,
    DuplicateCase, DemandeExamen,
    CustomField, CancerCustomValue,
    PatientFormSubmission,
)

DOSSIER_MANUAL_SOURCE = 'dossier_manual'


def _get_dossier_manual_submission(patient):
    for sub in patient.form_submissions.order_by('-created_at'):
        if (sub.submitted_data or {}).get('source') == DOSSIER_MANUAL_SOURCE:
            return sub
    return None


def _read_dossier_manual(patient):
    sub = _get_dossier_manual_submission(patient)
    if not sub:
        return {}
    data = dict(sub.submitted_data or {})
    data.pop('source', None)
    return data


class OptionalDateField(serializers.DateField):
    def to_internal_value(self, data):
        if data in ('', None):
            return None
        return super().to_internal_value(data)


class OptionalIntegerField(serializers.IntegerField):
    def to_internal_value(self, data):
        if data in ('', None):
            return None
        return super().to_internal_value(data)


class OptionalDecimalField(serializers.DecimalField):
    def to_internal_value(self, data):
        if data in ('', None):
            return None
        return super().to_internal_value(data)


# ─── Géographie ───────────────────────────────────────────────────────────────

class WilayaSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Wilaya
        fields = ['id', 'name']


class CommuneSerializer(serializers.ModelSerializer):
    wilaya_name = serializers.CharField(source='wilaya.name', read_only=True)

    class Meta:
        model  = Commune
        fields = ['id', 'name', 'wilaya', 'wilaya_name', 'postal_code']


class HospitalSerializer(serializers.ModelSerializer):
    wilaya_name = serializers.CharField(source='wilaya.name', read_only=True)

    class Meta:
        model  = Hospital
        fields = ['id', 'name', 'wilaya', 'wilaya_name', 'type']


# ─── Cancer Type ──────────────────────────────────────────────────────────────

class CancerTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model  = CancerType
        fields = ['id', 'name', 'cim10_code']


# ─── Custom Fields ────────────────────────────────────────────────────────────

class CustomFieldSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomField
        fields = [
            'id', 'name', 'label', 'field_type', 'options',
            'is_required', 'is_active', 'order', 'section',
            'description', 'created_at', 'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at']


class CancerCustomValueSerializer(serializers.ModelSerializer):
    field_id    = serializers.IntegerField(source='field.id',    read_only=True)
    field_name  = serializers.CharField(source='field.name',     read_only=True)
    field_label = serializers.CharField(source='field.label',    read_only=True)

    class Meta:
        model = CancerCustomValue
        fields = ['id', 'field_id', 'field_name', 'field_label', 'value']


# ─── Traitement ───────────────────────────────────────────────────────────────

class TreatmentSerializer(serializers.ModelSerializer):
    type_traitement_display = serializers.CharField(
        source='get_type_traitement_display', read_only=True)
    intention_display = serializers.CharField(
        source='get_intention_display', read_only=True)
    statut_display = serializers.CharField(
        source='get_statut_display', read_only=True)
    reponse_display = serializers.CharField(
        source='get_reponse_tumorale_display', read_only=True)

    class Meta:
        model  = Treatment
        fields = [
            'id',
            'type_traitement', 'type_traitement_display',
            'intention', 'intention_display',
            'statut', 'statut_display',
            'ligne',
            'protocole', 'medicaments',
            'voie_administration', 'jours_administration',
            'cycles_prevus', 'cycles_realises',
            'date_debut', 'date_fin',
            'reponse_tumorale', 'reponse_display',
            'date_evaluation',
            'grade_toxicite', 'description_toxicite',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at']


class TreatmentCreateSerializer(serializers.ModelSerializer):
    cancer            = serializers.PrimaryKeyRelatedField(read_only=True)
    intention         = serializers.ChoiceField(
        choices=Treatment.INTENTION_CHOICES, required=False, allow_blank=True)
    statut            = serializers.ChoiceField(
        choices=Treatment.STATUT_CHOICES, required=False)
    ligne             = serializers.CharField(required=False, allow_blank=True)
    date_debut        = OptionalDateField(required=False, allow_null=True)
    date_fin          = OptionalDateField(required=False, allow_null=True)
    date_evaluation   = OptionalDateField(required=False, allow_null=True)
    cycles_prevus     = OptionalIntegerField(required=False, allow_null=True)
    cycles_realises   = OptionalIntegerField(required=False, allow_null=True)
    jours_administration = serializers.ListField(
        child=serializers.CharField(), required=False, allow_empty=True)

    class Meta:
        model  = Treatment
        fields = [
            'id', 'cancer',
            'type_traitement', 'intention', 'statut', 'ligne',
            'protocole', 'medicaments',
            'voie_administration', 'jours_administration',
            'cycles_prevus', 'cycles_realises',
            'date_debut', 'date_fin',
            'reponse_tumorale', 'date_evaluation',
            'grade_toxicite', 'description_toxicite',
        ]


# ─── Examens ──────────────────────────────────────────────────────────────────

class BiologicalExamSerializer(serializers.ModelSerializer):
    class Meta:
        model  = BiologicalExam
        fields = ['id', 'type_analyse', 'resultat', 'date_analyse']


class ImagingExamSerializer(serializers.ModelSerializer):
    class Meta:
        model  = ImagingExam
        fields = ['id', 'type_examen', 'conclusion', 'date_examen']


class HistologySerializer(serializers.ModelSerializer):
    class Meta:
        model  = Histology
        fields = [
            'id', 'type_histologique', 'grade_histologique',
            'marge_chirurgicale', 'envahissement_vasculaire',
            'envahissement_lymphatique', 'date_resultat', 'data_source',
        ]


class MetastasisSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Metastasis
        fields = ['id', 'organe', 'date_detection']


class FollowUpSerializer(serializers.ModelSerializer):
    class Meta:
        model  = FollowUp
        fields = ['id', 'date_visite', 'statut_clinique', 'observation']


class CancerStatusHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model  = CancerStatusHistory
        fields = ['id', 'status', 'status_date']


# ─── Cancer (lecture complète avec nested) ────────────────────────────────────

class CancerSerializer(serializers.ModelSerializer):
    cancer_type_name = serializers.CharField(source='cancer_type.name', read_only=True)
    treatments       = TreatmentSerializer(many=True, read_only=True)
    biological_exams = BiologicalExamSerializer(many=True, read_only=True)
    imaging_exams    = ImagingExamSerializer(many=True, read_only=True)
    histology        = serializers.SerializerMethodField()
    metastases       = MetastasisSerializer(many=True, read_only=True)
    follow_ups       = FollowUpSerializer(many=True, read_only=True)
    status_history   = CancerStatusHistorySerializer(many=True, read_only=True)
    triple_negatif   = serializers.BooleanField(read_only=True)

    def get_histology(self, obj):
        try:
            return HistologySerializer(obj.histology).data
        except Histology.DoesNotExist:
            return None

    class Meta:
        model  = Cancer
        fields = [
            'id', 'cancer_type', 'cancer_type_name',
            'stade_clinique', 'stade_pathologique', 'tnm', 'grade',
            'taille_tumorale', 'ganglions_envahis',
            'localise', 'metastatique', 'recidive',
            'sites_metastatiques',
            'recepteur_er', 'recepteur_pr', 'her2', 'triple_negatif',
            'data_source', 'created_at', 'updated_at',
            'treatments', 'biological_exams', 'imaging_exams',
            'histology', 'metastases', 'follow_ups', 'status_history',
        ]
        read_only_fields = ['created_at', 'updated_at']


# ─── Cancer (écriture — create/update) ───────────────────────────────────────

class CancerCreateSerializer(serializers.ModelSerializer):
    patient           = serializers.PrimaryKeyRelatedField(read_only=True)
    organe            = serializers.CharField(write_only=True, required=False, allow_blank=True)
    date_diagnostic   = OptionalDateField(required=False, allow_null=True)
    date_symptomes    = OptionalDateField(required=False, allow_null=True)
    taille_tumorale   = OptionalDecimalField(
        max_digits=5, decimal_places=2, required=False, allow_null=True)
    ganglions_envahis = OptionalIntegerField(required=False, allow_null=True)
    type_tumeur       = serializers.ChoiceField(
        choices=Cancer.TYPE_TUMEUR_CHOICES, required=False, allow_blank=True)
    recepteur_er      = serializers.ChoiceField(
        choices=Cancer.RECEPTEUR_CHOICES, required=False, allow_blank=True)
    recepteur_pr      = serializers.ChoiceField(
        choices=Cancer.RECEPTEUR_CHOICES, required=False, allow_blank=True)
    her2              = serializers.ChoiceField(
        choices=Cancer.HER2_CHOICES, required=False, allow_blank=True)
    custom_fields     = serializers.JSONField(required=False)

    class Meta:
        model  = Cancer
        fields = [
            'id', 'patient',
            'cancer_type',
            'organe',
            'type_tumeur', 'sous_type', 'lateralite', 'cim10_code',
            'date_symptomes', 'date_diagnostic',
            'base_diagnostic',
            'etablissement_diag', 'service_diag', 'medecin_diag',
            'type_histologique', 'grade_histologique', 'bloc_anapath',
            'stade_clinique', 'stade_pathologique', 'tnm', 'grade',
            'taille_tumorale', 'ganglions_envahis',
            'localise', 'metastatique', 'recidive',
            'sites_metastatiques',
            'recepteur_er', 'recepteur_pr', 'her2',
            'data_source',
            'custom_fields',
        ]

    def create(self, validated_data):
        custom_fields = validated_data.pop('custom_fields', {}) or {}
        organe = validated_data.pop('organe', None)
        if organe and not validated_data.get('cancer_type'):
            cancer_type = CancerType.objects.filter(name__iexact=organe).first()
            if not cancer_type:
                cancer_type = CancerType.objects.create(name=organe)
            validated_data['cancer_type'] = cancer_type
        cancer = super().create(validated_data)
        for key, value in custom_fields.items():
            field = None
            if isinstance(key, int) or (isinstance(key, str) and key.isdigit()):
                field = CustomField.objects.filter(pk=int(key)).first()
            else:
                field = CustomField.objects.filter(name=key).first()
            if not field:
                continue
            CancerCustomValue.objects.update_or_create(
                cancer=cancer,
                field=field,
                defaults={'value': '' if value is None else str(value)},
            )
        return cancer

    def update(self, instance, validated_data):
        organe = validated_data.pop('organe', None)
        if organe and not validated_data.get('cancer_type'):
            cancer_type = CancerType.objects.filter(name__iexact=organe).first()
            if not cancer_type:
                cancer_type = CancerType.objects.create(name=organe)
            validated_data['cancer_type'] = cancer_type
        return super().update(instance, validated_data)

    def validate_patient(self, patient):
        request = self.context.get('request')
        if request and patient.created_by != request.user and not request.user.is_staff:
            raise serializers.ValidationError("Accès refusé à ce patient.")
        return patient


# ─── Death ────────────────────────────────────────────────────────────────────

# FIX: كان معرّف مرتين — بقى مرة وحدة هنا
class DeathSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Death
        fields = ['id', 'patient', 'date_death', 'cause_principale']


class PatientHabitSerializer(serializers.ModelSerializer):
    class Meta:
        model = PatientHabit
        fields = "__all__"


# ─── Consultation ─────────────────────────────────────────────────────────────

class ConsultationSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()

    class Meta:
        model  = Consultation
        fields = [
            'id', 'user', 'user_name',
            'consultation_date', 'motif', 'compte_rendu', 'next_visit_date',
        ]

    def get_user_name(self, obj):
        if obj.user:
            return f"Dr. {obj.user.prenom} {obj.user.nom}"
        return '—'

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


# ─── Patient (liste — version légère) ────────────────────────────────────────

class PatientListSerializer(serializers.ModelSerializer):
    age           = serializers.ReadOnlyField()
    full_name     = serializers.ReadOnlyField()
    commune_name  = serializers.CharField(source='commune.name', read_only=True)
    wilaya_name   = serializers.SerializerMethodField()
    latitude      = serializers.FloatField(source='commune.latitude',  read_only=True, allow_null=True)
    longitude     = serializers.FloatField(source='commune.longitude', read_only=True, allow_null=True)
    # FIX: hospital_name كان CharField بدون SerializerMethodField — صلحناه
    hospital_name = serializers.SerializerMethodField()
    medecin_nom   = serializers.SerializerMethodField()
    dernier_cancer = serializers.SerializerMethodField()
    cancers        = CancerSerializer(many=True, read_only=True)

    class Meta:
        model  = Patient
        fields = [
            'id', 'numero_dossier', 'national_id',
            'first_name', 'last_name', 'full_name',
            'date_naissance', 'age', 'sexe', 'phone',
            'commune', 'commune_name', 'wilaya_name', 'latitude', 'longitude',
            'hospital', 'hospital_name',
            'created_by', 'medecin_nom',
            'data_source', 'created_at', 'updated_at',
            'dernier_cancer', 'cancers',
        ]
        read_only_fields = ['numero_dossier', 'created_by', 'created_at', 'updated_at', 'deleted_at']

    def get_wilaya_name(self, obj):
        if obj.commune and obj.commune.wilaya:
            return obj.commune.wilaya.name
        return _read_dossier_manual(obj).get('wilaya') or None

    def get_hospital_name(self, obj):
        if obj.hospital:
            return obj.hospital.name
        return None

    def get_medecin_nom(self, obj):
        if obj.created_by:
            return f"Dr. {obj.created_by.prenom} {obj.created_by.nom}"
        return '—'

    def get_dernier_cancer(self, obj):
        cancer = obj.cancers.order_by('-created_at').first()
        if not cancer:
            return None
        return {
            'id':              cancer.id,
            'organe':          cancer.cancer_type.name if cancer.cancer_type else '—',
            'stade':           cancer.stade_clinique or cancer.stade_pathologique or '—',
            'date_diagnostic': str(cancer.date_diagnostic) if cancer.date_diagnostic else '—',
        }


# ─── Patient détail (complet) ─────────────────────────────────────────────────

class PatientDetailSerializer(serializers.ModelSerializer):
    age           = serializers.ReadOnlyField()
    full_name     = serializers.ReadOnlyField()
    commune_name  = serializers.CharField(source='commune.name',        read_only=True)
    wilaya_name   = serializers.CharField(source='commune.wilaya.name', read_only=True)
    hospital_name = serializers.CharField(source='hospital.name',       read_only=True)
    commune_text  = serializers.CharField(write_only=True, required=False, allow_blank=True)
    wilaya_text   = serializers.CharField(write_only=True, required=False, allow_blank=True)
    dossier_manual = serializers.JSONField(required=False, write_only=True)
    medecin_nom   = serializers.SerializerMethodField()
    habits        = serializers.SerializerMethodField()
    risk_factors  = serializers.SerializerMethodField()
    death         = DeathSerializer(read_only=True)
    cancers       = CancerSerializer(many=True, read_only=True)
    consultations = ConsultationSerializer(many=True, read_only=True)

    class Meta:
        model  = Patient
        fields = [
            'id', 'numero_dossier', 'national_id',
            'first_name', 'last_name', 'full_name',
            'date_naissance', 'age', 'sexe', 'phone',
            'commune', 'commune_name', 'commune_text', 'wilaya_name', 'wilaya_text',
            'dossier_manual',
            'hospital', 'hospital_name',
            'created_by', 'medecin_nom',
            'is_merged', 'merged_into_patient',
            'data_source', 'created_at', 'updated_at', 'deleted_at',
            'death',
            'cancers', 'consultations',
            'habits', 'risk_factors',
        ]
        read_only_fields = ['numero_dossier', 'created_by', 'created_at', 'updated_at', 'deleted_at']

    def to_representation(self, instance):
        rep = super().to_representation(instance)
        rep['dossier_manual'] = _read_dossier_manual(instance)
        return rep

    def get_medecin_nom(self, obj):
        if obj.created_by:
            return f"Dr. {obj.created_by.prenom} {obj.created_by.nom}"
        return '—'

    def get_habits(self, obj):
        return [h.habit.name for h in obj.habits.all()]

    def get_risk_factors(self, obj):
        return [r.risk_factor.name for r in obj.risk_factors.all()]

    # FIX: كانت معرّفة مرتين — بقى نسخة واحدة تجمع المنطقين
    def _resolve_commune(self, validated_data):
        # إذا جات commune FK مباشرة نحتفظوا بها
        if validated_data.get('commune'):
            validated_data.pop('commune_text', None)
            validated_data.pop('wilaya_text', None)
            return validated_data

        commune_text = validated_data.pop('commune_text', None)
        wilaya_text  = validated_data.pop('wilaya_text', None)

        if commune_text:
            wilaya_obj = None
            if wilaya_text:
                wilaya_obj = Wilaya.objects.filter(name__iexact=wilaya_text).first()
                if not wilaya_obj:
                    wilaya_obj = Wilaya.objects.create(name=wilaya_text)

            if wilaya_obj:
                commune = Commune.objects.filter(
                    name__iexact=commune_text, wilaya=wilaya_obj
                ).first()
                if not commune:
                    commune = Commune.objects.create(name=commune_text, wilaya=wilaya_obj)
            else:
                commune = Commune.objects.filter(name__iexact=commune_text).first()

            if commune:
                validated_data['commune'] = commune

        return validated_data

    def create(self, validated_data):
        dossier_manual = validated_data.pop('dossier_manual', None)
        validated_data = self._resolve_commune(validated_data)
        validated_data['created_by'] = self.context['request'].user
        patient = super().create(validated_data)
        if dossier_manual:
            PatientFormSubmission.objects.create(
                patient=patient,
                form_token=None,
                submitted_data={**dossier_manual, 'source': DOSSIER_MANUAL_SOURCE},
            )
        return patient

    def update(self, instance, validated_data):
        dossier_manual = validated_data.pop('dossier_manual', None)
        validated_data = self._resolve_commune(validated_data)
        patient = super().update(instance, validated_data)
        if dossier_manual is not None:
            sub = _get_dossier_manual_submission(patient)
            payload = {**dossier_manual, 'source': DOSSIER_MANUAL_SOURCE}
            if sub:
                sub.submitted_data = payload
                sub.save(update_fields=['submitted_data'])
            elif dossier_manual:
                PatientFormSubmission.objects.create(
                    patient=patient,
                    form_token=None,
                    submitted_data=payload,
                )
        return patient


# ─── DemandeExamen ────────────────────────────────────────────────────────────

class DemandeExamenSerializer(serializers.ModelSerializer):
    medecin_nom   = serializers.SerializerMethodField()
    patient_nom   = serializers.SerializerMethodField()
    cancer_type   = serializers.CharField(
        source='cancer.cancer_type.name', read_only=True, default='—')
    statut_label  = serializers.CharField(source='get_statut_display',       read_only=True)
    urgence_label = serializers.CharField(source='get_urgence_display',      read_only=True)
    type_label    = serializers.CharField(source='get_type_demande_display', read_only=True)

    class Meta:
        model  = DemandeExamen
        fields = [
            'id', 'patient', 'patient_nom',
            'cancer', 'cancer_type',
            'medecin', 'medecin_nom',
            'type_demande', 'type_label',
            'statut', 'statut_label',
            'urgence', 'urgence_label',
            'examens_demandes',
            'motif_clinique', 'observations',
            'date_demande', 'date_souhaitee',
            'resultat_texte', 'date_resultat',
        ]
        read_only_fields = ['date_demande', 'medecin']

    def get_medecin_nom(self, obj):
        if obj.medecin:
            return f"Dr. {obj.medecin.prenom} {obj.medecin.nom}"
        return '—'

    def get_patient_nom(self, obj):
        return f"{obj.patient.first_name} {obj.patient.last_name}"

    def create(self, validated_data):
        validated_data['medecin'] = self.context['request'].user
        return super().create(validated_data)


# ─── Form Submissions ─────────────────────────────────────────────────────────

class PatientFormSubmissionSerializer(serializers.ModelSerializer):
    class Meta:
        model  = PatientFormSubmission
        fields = ['id', 'submitted_data', 'ip_address', 'created_at']
        read_only_fields = ['id', 'created_at']