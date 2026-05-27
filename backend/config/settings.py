import os
from pathlib import Path
from decouple import config
from datetime import timedelta


BASE_DIR = Path(__file__).resolve().parent.parent

# ─── ENV ────────────────────────────────────────────────────────────────────
DEV_LOCAL_IP = config('DEV_LOCAL_IP', default='')
SECRET_KEY   = config('SECRET_KEY', default='django-insecure-temporary-key-for-dev')
DEBUG        = config('DEBUG', cast=bool, default=True)

# ─── HOSTS ──────────────────────────────────────────────────────────────────
ALLOWED_HOSTS = ['*']

# ─── APPS ───────────────────────────────────────────────────────────────────
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    # Libraries
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    'django_filters',
    'django_apscheduler',
    # Apps
    'accounts',
    'patients',
    'statistic',
    'rcp',

]

# ─── MIDDLEWARE ──────────────────────────────────────────────────────────────
MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',          # ← لازم يكون أول واحد
    'config.middleware.RawBodyLoggingMiddleware',      # ← من الملف 2
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',  # ← زيد هذا
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

# ─── DATABASE ────────────────────────────────────────────────────────────────
# ─── DATABASE ────────────────────────────────────────────────────────────────
import dj_database_url

DATABASE_URL = config('DATABASE_URL', default='')

if DATABASE_URL:
    DATABASES = {
        'default': dj_database_url.parse(DATABASE_URL)
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }

# ─── DRF + JWT ───────────────────────────────────────────────────────────────
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME':  timedelta(hours=8),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
}

# ─── CORS ────────────────────────────────────────────────────────────────────
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_ALL_ORIGINS = True   # dev only — غير في production

CORS_ALLOWED_ORIGINS = [
    'https://register-de-cancer-frontend.vercel.app',
    'http://localhost:3000',
]

CORS_ALLOWED_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
]

# LAN mobile testing
if DEV_LOCAL_IP and DEV_LOCAL_IP not in ('localhost', '127.0.0.1'):
    CORS_ALLOWED_ORIGINS.append(f"http://{DEV_LOCAL_IP}:3000")

# ─── LOCALISATION ────────────────────────────────────────────────────────────
LANGUAGE_CODE = 'fr-fr'
TIME_ZONE     = 'Africa/Algiers'
USE_I18N      = True
USE_TZ        = True

# ─── STATIC & MEDIA ──────────────────────────────────────────────────────────
STATIC_URL = '/static/'
MEDIA_URL  = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')

ALLOWED_HOSTS = [
    'register-de-cancer.onrender.com',
    'localhost',
    '127.0.0.1',
]
AUTH_USER_MODEL = 'accounts.User'

# Auto create superuser
import os
if os.environ.get('SUPERUSER_EMAIL'):
    from django.db.models.signals import post_migrate
    from django.dispatch import receiver
    
    @receiver(post_migrate)
    def create_superuser(sender, **kwargs):
        if sender.name == 'accounts':
            from django.contrib.auth import get_user_model
            User = get_user_model()
            email = os.environ.get('SUPERUSER_EMAIL')
            password = os.environ.get('SUPERUSER_PASSWORD')
            if email and not User.objects.filter(email=email).exists():
                User.objects.create_superuser(email=email, password=password, nom='Admin', prenom='Super')
                print(f'Superuser {email} created!')
