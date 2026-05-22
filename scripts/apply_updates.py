import pathlib

root = pathlib.Path(r'c:/Users/TOSHIBA/Desktop/Syst-me-de-Registre-de-Cancer')
stat_file = root / 'frontend' / 'src' / 'pages' / 'Statistics.jsx'
zone_file = root / 'frontend' / 'src' / 'utils' / 'zoneUtils.js'
new_choropleth_file = root / 'scripts' / 'choropleth_new.jsx'
new_zone_file = root / 'scripts' / 'zone_compute_new.js'

stat_text = stat_file.read_text(encoding='utf-8', errors='replace')
new_choropleth = new_choropleth_file.read_text(encoding='utf-8')

start_token = 'function ChoroplethMap({ data, apiData, rawData, cancers, patients }) {'
start = stat_text.find(start_token)
if start == -1:
    raise SystemExit('Start token not found in Statistics.jsx')

brace = 0
end = None
for i, ch in enumerate(stat_text[start:]):
    if ch == '{':
        brace += 1
    elif ch == '}':
        brace -= 1
        if brace == 0:
            end = start + i + 1
            break
if end is None:
    raise SystemExit('End of ChoroplethMap not found')

stat_text = stat_text[:start] + new_choropleth + stat_text[end:]
stat_file.write_text(stat_text, encoding='utf-8')
print('Updated Statistics.jsx')

zone_text = zone_file.read_text(encoding='utf-8', errors='replace')
new_zone = new_zone_file.read_text(encoding='utf-8')
zone_start_token = 'export function computeCompletePollutionData('
zone_start = zone_text.find(zone_start_token)
if zone_start == -1:
    raise SystemExit('Start token not found in zoneUtils.js')

brace = 0
end = None
for i, ch in enumerate(zone_text[zone_start:]):
    if ch == '{':
        brace += 1
    elif ch == '}':
        brace -= 1
        if brace == 0:
            end = zone_start + i + 1
            break
if end is None:
    raise SystemExit('End of computeCompletePollutionData not found')

zone_text = zone_text[:zone_start] + new_zone + zone_text[end:]
zone_file.write_text(zone_text, encoding='utf-8')
print('Updated zoneUtils.js')
