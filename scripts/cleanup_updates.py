import pathlib
import re

root = pathlib.Path(r'c:/Users/TOSHIBA/Desktop/Syst-me-de-Registre-de-Cancer')
stat_file = root / 'frontend' / 'src' / 'pages' / 'Statistics.jsx'
zone_file = root / 'frontend' / 'src' / 'utils' / 'zoneUtils.js'

# Remove old residual block from Statistics.jsx after the new ChoroplethMap insertion
stat_text = stat_file.read_text(encoding='utf-8', errors='replace')
marker = ') {\n  const [selectedWilaya, setSelectedWilaya] = useState(null);'
marker_pos = stat_text.find(marker)
if marker_pos != -1:
    stat_text = stat_text[:marker_pos]
    stat_file.write_text(stat_text, encoding='utf-8')
    print('Removed old residual block from Statistics.jsx')
else:
    print('No residual block marker found in Statistics.jsx')

# Remove duplicate second computeCompletePollutionData in zoneUtils.js
zone_text = zone_file.read_text(encoding='utf-8', errors='replace')
pattern = r'export function computeCompletePollutionData\('
starts = [m.start() for m in re.finditer(pattern, zone_text)]
if len(starts) < 2:
    print('No duplicate computeCompletePollutionData found in zoneUtils.js')
else:
    start = starts[1]
    brace = 0
    end = None
    for i, ch in enumerate(zone_text[start:]):
        if ch == '{':
            brace += 1
        elif ch == '}':
            brace -= 1
            if brace == 0:
                end = start + i + 1
                break
    if end is None:
        raise SystemExit('Could not find end of duplicate computeCompletePollutionData in zoneUtils.js')
    zone_text = zone_text[:start] + zone_text[end:]
    zone_file.write_text(zone_text, encoding='utf-8')
    print('Removed duplicate computeCompletePollutionData from zoneUtils.js')
