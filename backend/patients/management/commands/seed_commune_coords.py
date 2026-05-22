from django.core.management.base import BaseCommand
from patients.models import Commune

# Approximate GPS coordinates for major Algerian communes/dairas
COMMUNE_COORDS = {
    # Tlemcen wilaya dairas
    "Tlemcen": (34.8783, -1.3150),
    "Maghnia": (34.8167, -1.7333),
    "Ghazaouet": (35.0833, -1.8167),
    "Nedroma": (35.0167, -1.7333),
    "Remchi": (35.0667, -1.4333),
    "Bensekrane": (35.0667, -1.2167),
    "Hennaya": (34.9500, -1.3667),
    "Mansourah": (34.8667, -1.3333),
    "Chetouane": (34.9167, -1.2833),
    "Ouled Mimoun": (34.9000, -1.0333),
    "Sebdou": (34.6333, -1.3333),
    "Fellaoucene": (34.7167, -1.2833),
    "Zenata": (34.8167, -1.2833),
    "Hammam Boughrara": (35.0667, -1.2833),
    "Aïn Fezza": (34.9667, -1.2833),
    "Aïn Tallout": (34.8167, -1.2833),
    "Sabra": (34.8167, -1.2833),
    "Souahlia": (35.2833, -1.2833),
    "El Aricha": (34.2167, -1.2667),
    # Oran
    "Oran": (35.6969, -0.6331),
    "Aïn Témouchent": (35.3000, -1.1333),
    "Sidi Bel Abbès": (35.2000, -0.6333),
    "Mascara": (35.4000, 0.1333),
    "Mostaganem": (35.9333, 0.0833),
    # Alger
    "Alger": (36.7538, 3.0588),
    "Blida": (36.4167, 2.8333),
    "Boumerdès": (36.7667, 3.4667),
    "Tipaza": (36.5833, 2.4500),
    "Médéa": (36.2667, 2.7500),
    # Est
    "Constantine": (36.3667, 6.6167),
    "Annaba": (36.9000, 7.7667),
    "Sétif": (36.1833, 5.4167),
    "Batna": (35.5500, 6.1667),
    "Béjaïa": (36.7500, 5.0667),
    "Skikda": (36.8667, 6.9000),
    "Guelma": (36.4667, 7.4333),
    "Tébessa": (35.4000, 8.1167),
    "Souk Ahras": (36.2833, 7.9500),
    "Oum El Bouaghi": (35.8667, 7.1167),
    "Khenchela": (35.4333, 7.1333),
    "Mila": (36.4500, 6.2667),
    "Jijel": (36.8167, 5.7667),
    "Bordj Bou Arréridj": (36.0667, 4.7667),
    "Tizi Ouzou": (36.7167, 4.0500),
    "Bouira": (36.3667, 3.9000),
    # Centre
    "Chlef": (36.1667, 1.3333),
    "Tissemsilt": (35.6000, 1.8167),
    "Tiaret": (35.3667, 1.3167),
    "Relizane": (35.7333, 0.5500),
    "Aïn Defla": (36.2667, 1.9667),
    # Sud
    "Laghouat": (33.8000, 2.8667),
    "Djelfa": (34.6667, 3.2667),
    "Ghardaïa": (32.4833, 3.6667),
    "Ouargla": (31.9500, 5.3333),
    "Biskra": (34.8500, 5.7333),
    "El Oued": (33.3667, 6.8667),
    "Béchar": (31.6167, -2.2167),
    "Adrar": (27.9768, -0.2928),
    "Tamanrasset": (22.7850, 5.5228),
    "Tindouf": (27.6667, -8.1333),
    "Illizi": (26.4833, 8.4667),
    "In Salah": (27.2000, 2.4667),
    "Djanet": (24.5500, 9.4833),
    "Touggourt": (33.1167, 6.0667),
    "El Bayadh": (33.6833, 1.0167),
    "Naâma": (33.2667, -0.3000),
    "Saïda": (34.8333, 0.1500),
    "M'Sila": (35.7000, 4.5333),
    "El Tarf": (36.7667, 8.3167),
}

class Command(BaseCommand):
    help = 'Seed GPS coordinates for Algerian communes'

    def handle(self, *args, **kwargs):
        updated = 0
        not_found = []

        for commune in Commune.objects.all():
            coords = COMMUNE_COORDS.get(commune.name)
            if coords:
                commune.latitude = coords[0]
                commune.longitude = coords[1]
                commune.save(update_fields=['latitude', 'longitude'])
                updated += 1
            else:
                not_found.append(commune.name)

        self.stdout.write(self.style.SUCCESS(f'Updated {updated} communes'))
        if not_found:
            self.stdout.write(self.style.WARNING(f'No coords for: {", ".join(not_found)}'))
