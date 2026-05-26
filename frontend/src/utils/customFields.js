import API_BASE from './apiConfig';

/**
 * Fetch active custom field definitions from the API.
 * @param {string|null} section - optional section filter (diagnostic, biologie, …)
 */
export async function fetchActiveCustomFields(section = null) {
  const token = localStorage.getItem('access_token');
  const path = section
    ? `/patients/custom-fields/?section=${encodeURIComponent(section)}`
    : '/patients/custom-fields/';
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const list = Array.isArray(data) ? data : (data.results || []);
    return list.filter(f => f.is_active && (!section || f.section === section));
  } catch {
    return [];
  }
}

/** Keep only non-numeric keys (field.name) with non-empty values. */
export function buildCustomFieldsPayload(values = {}) {
  const out = {};
  Object.entries(values || {}).forEach(([key, value]) => {
    if (/^\d+$/.test(String(key))) return;
    if (value === undefined || value === null || String(value).trim() === '') return;
    out[key] = value;
  });
  return out;
}

/** Returns labels of required fields that are empty. */
export function validateRequiredCustomFields(fields, values = {}) {
  const missing = [];
  for (const field of fields) {
    if (!field.is_active || !field.is_required) continue;
    const v = values[field.name];
    if (v === undefined || v === null || String(v).trim() === '') {
      missing.push(field.label || field.name);
    }
  }
  return missing;
}
