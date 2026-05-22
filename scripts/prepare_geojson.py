#!/usr/bin/env python3
"""
Script pour préparer et valider les fichiers GeoJSON d'Algérie
Utilisé après l'export depuis QGIS ou Overpass Turbo
"""

import json
import os
from pathlib import Path
from typing import Dict, List, Tuple

class GeoJSONValidator:
    """Valide et prépare les fichiers GeoJSON"""
    
    REQUIRED_FIELDS = {
        'wilayas': ['id', 'name', 'admin_level'],
        'dairat': ['id', 'name', 'wilaya_code', 'admin_level']
    }
    
    ALGERIA_BOUNDS = {
        'min_lat': 19.0,
        'max_lat': 37.1,
        'min_lon': -8.7,
        'max_lon': 12.0
    }
    
    @staticmethod
    def validate_geojson(file_path: str) -> Tuple[bool, List[str]]:
        """
        Valide la structure d'un fichier GeoJSON
        
        Returns:
            (is_valid: bool, messages: List[str])
        """
        messages = []
        
        # Vérifier l'existence du fichier
        if not os.path.exists(file_path):
            return False, [f"❌ Fichier non trouvé: {file_path}"]
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            messages.append(f"✅ Fichier JSON valide")
        except json.JSONDecodeError as e:
            return False, [f"❌ JSON invalide: {str(e)}"]
        except UnicodeDecodeError:
            return False, [f"❌ Encodage incorrect. Utilisez UTF-8"]
        
        # Vérifier la structure FeatureCollection
        if data.get('type') != 'FeatureCollection':
            return False, [f"❌ Doit être de type 'FeatureCollection'"]
        
        features = data.get('features', [])
        if not features:
            return False, [f"❌ Aucune feature trouvée"]
        
        messages.append(f"✅ {len(features)} features trouvées")
        
        # Valider les coordonnées
        invalid_coords = 0
        for feature in features:
            geom = feature.get('geometry', {})
            if not GeoJSONValidator._validate_geometry(geom):
                invalid_coords += 1
        
        if invalid_coords > 0:
            messages.append(f"⚠️  {invalid_coords} feature(s) avec coordonnées invalides")
        else:
            messages.append(f"✅ Toutes les coordonnées sont valides")
        
        # Vérifier les propriétés
        missing_props = set()
        for feature in features:
            props = feature.get('properties', {})
            if 'name' not in props and 'admin_name' not in props:
                missing_props.add('name')
        
        if missing_props:
            messages.append(f"⚠️  Propriétés manquantes: {missing_props}")
        else:
            messages.append(f"✅ Propriétés de base présentes")
        
        return True, messages
    
    @staticmethod
    def _validate_geometry(geometry: Dict) -> bool:
        """Valide la géométrie"""
        if not geometry or 'coordinates' not in geometry:
            return False
        
        geom_type = geometry.get('type')
        coords = geometry.get('coordinates')
        
        if geom_type == 'Point':
            return len(coords) == 2
        elif geom_type == 'Polygon':
            return all(len(ring) >= 4 for ring in coords)
        elif geom_type == 'MultiPolygon':
            return all(len(ring) >= 4 for poly in coords for ring in poly)
        
        return True
    
    @staticmethod
    def convert_to_wgs84(file_path: str, output_path: str, from_epsg: str = '2560'):
        """
        Convertit un GeoJSON d'une projection à WGS84 (EPSG:4326)
        
        Note: Nécessite pyproj
        Usage: convert_to_wgs84('input.geojson', 'output.geojson', '2560')
        """
        try:
            from pyproj import Transformer
        except ImportError:
            print("❌ Installez pyproj: pip install pyproj")
            return False
        
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        transformer = Transformer.from_epsg(int(from_epsg), 4326)
        
        for feature in data['features']:
            geom = feature['geometry']
            geom['coordinates'] = GeoJSONValidator._transform_coords(
                geom['coordinates'],
                transformer,
                geom['type']
            )
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        
        return True
    
    @staticmethod
    def _transform_coords(coords, transformer, geom_type):
        """Transforme les coordonnées"""
        if geom_type == 'Point':
            lon, lat = coords
            return list(transformer.transform(lat, lon))
        elif geom_type == 'Polygon':
            return [[list(transformer.transform(lat, lon)) for lon, lat in ring] 
                    for ring in coords]
        elif geom_type == 'MultiPolygon':
            return [[[list(transformer.transform(lat, lon)) for lon, lat in ring] 
                     for ring in poly] for poly in coords]
        return coords
    
    @staticmethod
    def enrich_with_codes(geojson_path: str, output_path: str, feature_type: str = 'wilaya'):
        """
        Enrichit un GeoJSON avec des codes standardisés pour l'Algérie
        
        Args:
            feature_type: 'wilaya' ou 'dairat'
        """
        with open(geojson_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # Codes des wilayas algériennes
        wilaya_codes = {
            'Adrar': '01', 'Chlef': '02', 'Laghouat': '03', 'Oum El Bouaghi': '04',
            'Batna': '05', 'Béjaïa': '06', 'Biskra': '07', 'Béchar': '08',
            'Tlemcen': '09', 'Tiaret': '10', 'Tizi Ouzou': '11', 'Algiers': '16',
            'Alger': '16', 'Sidi Bel Abbès': '22', 'Saïda': '20', 'Skikda': '21',
            'Sétif': '19', 'Saïda': '20', 'Skikda': '21', 'Sidi Bel Abbès': '22',
            'Annaba': '23', 'Guelma': '24', 'Constantine': '25', 'Médéa': '26',
            'Mostaganem': '27', 'M\'Sila': '28', 'Mascara': '29', 'Ouargla': '30',
            'Oran': '31', 'El Bayadh': '32', 'Illizi': '33', 'Bordj Bou Arréridj': '34',
            'Boumerdès': '35', 'El Taref': '36', 'Tindouf': '37', 'Tissemsilt': '38',
            'El Oued': '39', 'Khenchela': '40', 'Souk Ahras': '41', 'Tipaza': '42',
            'Mila': '43', 'Aïn Defla': '44', 'Naâma': '45', 'Aïn Témouchent': '46',
            'Ghardaïa': '47', 'Relizane': '48', 'El M\'Ghair': '49', 'El Menia': '50',
            'Ouled Djellal': '51', 'Bordj El Kiffan': '52', 'Ain Salah': '53',
            'Touggourt': '54', 'Djanet': '55', 'In Guezzam': '56', 'Timimoun': '57',
            'Sidi Okba': '58'
        }
        
        for feature in data['features']:
            props = feature['properties']
            name = props.get('name') or props.get('admin_name', '')
            
            if feature_type == 'wilaya':
                # Chercher le code de la wilaya
                for wilaya_name, code in wilaya_codes.items():
                    if wilaya_name.lower() in name.lower() or name.lower() in wilaya_name.lower():
                        props['code'] = code
                        break
                if 'code' not in props:
                    props['code'] = props.get('id', '')
            
            # Standardiser le champ name
            if 'name' not in props:
                props['name'] = props.get('admin_name', '')
            
            # Ajouter le niveau administratif
            if 'admin_level' not in props:
                props['admin_level'] = '4' if feature_type == 'wilaya' else '5'
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        
        print(f"✅ Fichier enrichi sauvegardé: {output_path}")
        return True


def main():
    """Script principal"""
    print("🗺️  VALIDATEUR GEOJSON ALGERIE\n")
    
    # Chemins
    geojson_dir = Path(__file__).parent.parent / 'frontend' / 'public' / 'geojson'
    geojson_dir.mkdir(parents=True, exist_ok=True)
    
    files_to_check = [
        ('algeria-wilayas.geojson', 'wilayas'),
        ('algeria-dairat.geojson', 'daïras')
    ]
    
    for filename, label in files_to_check:
        file_path = geojson_dir / filename
        print(f"\n{'='*50}")
        print(f"📋 Validation: {label.upper()}")
        print(f"{'='*50}")
        
        is_valid, messages = GeoJSONValidator.validate_geojson(str(file_path))
        
        for msg in messages:
            print(msg)
        
        if is_valid:
            print(f"\n✅ {filename} est valide et prêt pour Leaflet!")
        else:
            print(f"\n❌ {filename} nécessite des corrections")
            print(f"\n💡 Astuces:")
            print(f"  1. Téléchargez depuis Overpass Turbo (plus rapide)")
            print(f"  2. Vérifiez le système de coordonnées: EPSG:4326")
            print(f"  3. Assurez l'encodage UTF-8 dans QGIS")


if __name__ == '__main__':
    main()
