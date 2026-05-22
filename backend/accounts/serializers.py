from rest_framework import serializers
from django.contrib.auth import authenticate
from .models import User, LoginLog


class UserSerializer(serializers.ModelSerializer):
    permissions = serializers.SerializerMethodField()
    full_name = serializers.SerializerMethodField()
    password = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = User
        fields = [
            'id', 'email', 'nom', 'prenom', 'full_name', 'telephone',
            'role', 'specialite', 'etablissement', 'wilaya',
            'statut', 'permissions', 'created_at',
            'perm_read', 'perm_write', 'perm_rcp',
            'perm_lab', 'perm_stats', 'perm_import',
            'is_active', 'is_staff', 'password',
        ]
        read_only_fields = ['id', 'created_at', 'full_name']
        extra_kwargs = {
            'perm_read':   {'write_only': False},
            'perm_write':  {'write_only': False},
            'perm_rcp':    {'write_only': False},
            'perm_lab':    {'write_only': False},
            'perm_stats':  {'write_only': False},
            'perm_import': {'write_only': False},
        }
    def get_full_name(self, obj):
        return f"{obj.prenom or ''} {obj.nom or ''}".strip() or obj.email
    def get_permissions(self, obj):
        return obj.permissions_list

    def create(self, validated_data):
        request = self.context.get('request')
        password = validated_data.pop('password', None)
        created_by = request.user if request and request.user.is_authenticated else None
        user = User(**validated_data)
        if created_by:
            user.created_by = created_by
        if password:
            user.set_password(password)
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        email = data.get('email')
        password = data.get('password')

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            raise serializers.ValidationError("Email ou mot de passe invalide")

        if not user.check_password(password):
            raise serializers.ValidationError("Email ou mot de passe invalide")

        if not user.is_active:
            raise serializers.ValidationError("Ce compte est désactivé")

        if hasattr(user, 'statut') and user.statut not in ('', None, 'actif'):
            raise serializers.ValidationError("Ce compte est désactivé")

        data['user'] = user
        return data


class LoginLogSerializer(serializers.ModelSerializer):
    """Sérialiseur pour les logs de connexion"""
    user_name = serializers.SerializerMethodField()
    user_email = serializers.CharField(source='user.email', read_only=True)

    def get_user_name(self, obj):
        u = obj.user
        return f"{u.prenom or ''} {u.nom or ''}".strip() or u.email

    class Meta:
        model = LoginLog
        fields = ['id', 'user', 'user_name', 'user_email', 'action', 'ip_address', 'detail', 'timestamp']
        read_only_fields = ['id', 'timestamp']

