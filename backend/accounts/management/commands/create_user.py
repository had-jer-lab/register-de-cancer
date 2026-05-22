from django.core.management.base import BaseCommand
from django.db import IntegrityError
from accounts.models import User


class Command(BaseCommand):
    help = 'Create a new user account'

    def add_arguments(self, parser):
        parser.add_argument('email', type=str, help='User email')
        parser.add_argument('password', type=str, help='User password')
        parser.add_argument('--nom', type=str, default='', help='User last name')
        parser.add_argument('--prenom', type=str, default='', help='User first name')
        parser.add_argument('--role', type=str, default='medecin', choices=['admin', 'medecin', 'biologiste'], help='User role')
        parser.add_argument('--statut', type=str, default='actif', choices=['actif', 'inactif', 'suspendu'], help='User status')
        parser.add_argument('--is-superuser', action='store_true', help='Make this user a superuser')

    def handle(self, *args, **options):
        email = options['email']
        password = options['password']
        nom = options['nom'] or email.split('@')[0]
        prenom = options['prenom'] or email.split('@')[0]
        role = options['role']
        statut = options['statut']
        is_superuser = options['is_superuser']

        try:
            if is_superuser:
                user = User.objects.create_superuser(
                    email=email,
                    password=password,
                    nom=nom,
                    prenom=prenom,
                    role=role,
                    statut=statut,
                )
                self.stdout.write(self.style.SUCCESS(f'✓ Superuser créé: {email}'))
            else:
                user = User.objects.create_user(
                    email=email,
                    password=password,
                    nom=nom,
                    prenom=prenom,
                    role=role,
                    statut=statut,
                )
                self.stdout.write(self.style.SUCCESS(f'✓ Utilisateur créé: {email}'))
            
            self.stdout.write(f'  Email: {user.email}')
            self.stdout.write(f'  Rôle: {user.role}')
            self.stdout.write(f'  Statut: {user.statut}')
            self.stdout.write(f'  ID: {user.id}')

        except IntegrityError:
            self.stdout.write(self.style.ERROR(f'✗ Erreur: Cet email existe déjà'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'✗ Erreur: {str(e)}'))
