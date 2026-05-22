from django.core.management.base import BaseCommand
from django.db import transaction
from patients.models import Wilaya, Commune, Patient

class Command(BaseCommand):
    help = 'Fix duplicate wilayas/communes and add GPS coordinates'

    # Real GPS coordinates for our exact communes
    COORDS = {
        # Tlemcen wilaya
        'Tlemcen':               (34.8783, -1.3150),
        'Tlemcen-Centre':        (34.8800, -1.3100),
        'Maghnia':               (34.8167, -1.7333),
        'Souani':                (34.9167, -1.2833),
        # Oran wilaya
        'Oran-Centre':           (35.6969, -0.6331),
        'Es Senia':              (35.6500, -0.6167),
        'Bir El Djir':           (35.7333, -0.5667),
        # Sidi Bel Abbes wilaya
        'Sidi Bel Abbes-Centre': (35.2000, -0.6333),
        'Boukadir':              (36.0667,  1.0833),
        'Tessala':               (35.0833, -0.5833),
        # Mascara wilaya
        'Mascara-Centre':        (35.4000,  0.1333),
        'Tighennif':             (35.4167,  0.3167),
        'Ain Ferah':             (34.8167,  0.1833),
        # Mostaganem wilaya
        'Mostaganem-Centre':     (35.9333,  0.0833),
        'Hassi Mameche':         (35.8500,  0.0500),
        'Sidi Lakhdar':          (36.1667,  0.3333),
    }

    @transaction.atomic
    def handle(self, *args, **kwargs):
        # Step 1: Fix duplicate Tlemcen wilaya (ids 1 and 2)
        try:
            w_keep = Wilaya.objects.get(id=1)   # keep id=1
            w_dup = Wilaya.objects.get(id=2)    # remove id=2
            Commune.objects.filter(wilaya=w_dup).update(wilaya=w_keep)
            w_dup.delete()
            self.stdout.write(self.style.SUCCESS('Fixed duplicate Tlemcen wilaya'))
        except Wilaya.DoesNotExist:
            self.stdout.write('Wilaya fix skipped (already clean)')

        # Step 2: Fix duplicate communes (keep lowest id, merge patients)
        seen = {}
        for commune in Commune.objects.select_related('wilaya').order_by('id'):
            key = (commune.name.strip().lower(), commune.wilaya_id)
            if key in seen:
                original = seen[key]
                moved = Patient.objects.filter(commune=commune).update(commune=original)
                self.stdout.write(f'  Moved {moved} patients from commune {commune.id} to {original.id} ({commune.name})')
                commune.delete()
            else:
                seen[key] = commune

        self.stdout.write(self.style.SUCCESS('Fixed duplicate communes'))

        # Step 3: Add GPS coordinates to all communes
        updated = 0
        for commune in Commune.objects.all():
            coords = self.COORDS.get(commune.name)
            if coords:
                commune.latitude = coords[0]
                commune.longitude = coords[1]
                commune.save(update_fields=['latitude', 'longitude'])
                updated += 1
                self.stdout.write(f'  Coords set for {commune.name}: {coords}')
            else:
                wilaya_coords = {
                    'Tlemcen':        (34.8783, -1.3150),
                    'Oran':           (35.6969, -0.6331),
                    'Sidi Bel Abbes': (35.2000, -0.6333),
                    'Mascara':        (35.4000,  0.1333),
                    'Mostaganem':     (35.9333,  0.0833),
                }
                wc = wilaya_coords.get(commune.wilaya.name)
                if wc:
                    import random
                    commune.latitude = wc[0] + random.uniform(-0.05, 0.05)
                    commune.longitude = wc[1] + random.uniform(-0.05, 0.05)
                    commune.save(update_fields=['latitude', 'longitude'])
                    updated += 1

        self.stdout.write(self.style.SUCCESS(f'Added coords to {updated} communes'))
        self.stdout.write(self.style.SUCCESS('All done!'))
