# ══════════════════════════════════════════
# patients/serializers.py
# ══════════════════════════════════════════
from rest_framework import serializers
from .models import (
    Wilaya, Commune, Hospital,
    Patient, CancerType, Cancer,
    Treatment, BiologicalExam, ImagingExam,
    Histology, Metastasis, FollowUp,
    CancerStatusHistory, Death,
    RiskFactor, PatientRiskFactor,
    Habit, PatientHabit, Consultation,
    DuplicateCase, PatientFormSubmission, 
)


# ─── Géographie ──────────────────────────────────────────────────────────────

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


# ─── Cancer Type ─────────────────────────────────────────────────────────────

class CancerTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model  = CancerType
        fields = ['id', 'name', 'cim10_code']


# ─── Traitements & Examens (nested) ──────────────────────────────────────────

class TreatmentSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Treatment
        fields = ['id', 'type_traitement', 'protocole', 'date_debut', 'date_fin']


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


# ─── Cancer (avec nested) ────────────────────────────────────────────────────

class CancerSerializer(serializers.ModelSerializer):
    cancer_type_name  = serializers.CharField(source='cancer_type.name', read_only=True)
    treatments        = TreatmentSerializer(many=True, read_only=True)
    biological_exams  = BiologicalExamSerializer(many=True, read_only=True)
    imaging_exams     = ImagingExamSerializer(many=True, read_only=True)
    histology         = HistologySerializer(read_only=True)
    metastases        = MetastasisSerializer(many=True, read_only=True)
    follow_ups        = FollowUpSerializer(many=True, read_only=True)
    status_history    = CancerStatusHistorySerializer(many=True, read_only=True)

    class Meta:
        model  = Cancer
        fields = [
            'id', 'cancer_type', 'cancer_type_name',
            'stade_clinique', 'stade_pathologique', 'tnm', 'grade',
            'date_diagnostic', 'data_source', 'created_at', 'updated_at',
            'treatments', 'biological_exams', 'imaging_exams',
            'histology', 'metastases', 'follow_ups', 'status_history',
        ]
        read_only_fields = ['created_at', 'updated_at']


# ─── Consultation ─────────────────────────────────────────────────────────────

class ConsultationSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()

    class Meta:
        model  = Consultation
        fields = ['id', 'user', 'user_name', 'consultation_date', 'motif', 'compte_rendu', 'next_visit_date']

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
    commune_name  = serializers.CharField(source='commune.name',   read_only=True)
    wilaya_name   = serializers.CharField(source='commune.wilaya.name', read_only=True)
    latitude      = serializers.FloatField(source='commune.latitude', read_only=True)
    longitude     = serializers.FloatField(source='commune.longitude', read_only=True)
    wilaya_name   = serializers.CharField(source='commune.wilaya.name', read_only=True)
    hospital_name = serializers.CharField(source='hospital.name',  read_only=True)
    medecin_nom   = serializers.SerializerMethodField()
    # Résumé cancer (le plus récent)
    dernier_cancer = serializers.SerializerMethodField()
    cancers=CancerSerializer(many=True, read_only=True)

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
            'dernier_cancer', 'cancers'
        ]
        read_only_fields = ['numero_dossier', 'created_by', 'created_at', 'updated_at']

    def get_medecin_nom(self, obj):
        if obj.created_by:
            return f"Dr. {obj.created_by.prenom} {obj.created_by.nom}"
        return '—'

    def get_dernier_cancer(self, obj):
        cancer = obj.cancers.order_by('-created_at').first()
        if not cancer:
            return None
        return {
            'id':             cancer.id,
            'organe':         cancer.cancer_type.name if cancer.cancer_type else '—',
            'stade':          cancer.stade_clinique or cancer.stade_pathologique or '—',
            'date_diagnostic': str(cancer.date_diagnostic) if cancer.date_diagnostic else '—',
        }


# ─── Patient (détail — version complète) ─────────────────────────────────────

class PatientDetailSerializer(serializers.ModelSerializer):
    age           = serializers.ReadOnlyField()
    full_name     = serializers.ReadOnlyField()
    commune_name  = serializers.CharField(source='commune.name',        read_only=True)
    wilaya_name   = serializers.CharField(source='commune.wilaya.name', read_only=True)
    hospital_name = serializers.CharField(source='hospital.name',       read_only=True)
    medecin_nom   = serializers.SerializerMethodField()
    cancers       = CancerSerializer(many=True, read_only=True)
    consultations = ConsultationSerializer(many=True, read_only=True)

    class Meta:
        model  = Patient
        fields = [
            'id', 'numero_dossier', 'national_id',
            'first_name', 'last_name', 'full_name',
            'date_naissance', 'age', 'sexe', 'phone',
            'commune', 'commune_name', 'wilaya_name',
            'hospital', 'hospital_name',
            'created_by', 'medecin_nom',
            'is_merged', 'merged_into_patient',
            'data_source', 'created_at', 'updated_at',
            'cancers', 'consultations',
        ]
        read_only_fields = ['numero_dossier', 'created_by', 'created_at', 'updated_at']

    def get_medecin_nom(self, obj):
        if obj.created_by:
            return f"Dr. {obj.created_by.prenom} {obj.created_by.nom}"
        return '—'

    def create(self, validated_data):
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)


# ─── Cancer (create/update) ────────────────────────────────────────────────

class CancerCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Cancer
        fields = [
            'id', 'patient', 'cancer_type',
            'stade_clinique', 'stade_pathologique', 'tnm', 'grade',
            'date_diagnostic', 'data_source',
        ]

    def validate_patient(self, patient):
        # Seul le médecin référent peut ajouter un cancer
        request = self.context.get('request')
        if request and patient.created_by != request.user and not request.user.is_staff:
            raise serializers.ValidationError("Accès refusé à ce patient.")
        return patient


# ─── Death ────────────────────────────────────────────────────────────────────

class DeathSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Death
        fields = ['id', 'patient', 'date_death', 'cause_principale']

# ─── Form Submissions ─────────────────────────────────────────────────────────

class PatientFormSubmissionSerializer(serializers.ModelSerializer):
    class Meta:
        model  = PatientFormSubmission
        fields = ['id', 'submitted_data', 'ip_address', 'created_at']
        read_only_fields = ['id', 'created_at']        