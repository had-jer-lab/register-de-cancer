import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
User = get_user_model()

email = os.environ.get('SUPERUSER_EMAIL', 'admin@registre-cancer.com')
password = os.environ.get('SUPERUSER_PASSWORD', 'admin123')

if not User.objects.filter(email=email).exists():
    User.objects.create_superuser(email=email, password=password)
    print(f'Superuser {email} created!')
else:
    print('Superuser already exists.')
