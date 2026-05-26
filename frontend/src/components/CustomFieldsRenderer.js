// ══════════════════════════════════════════
// frontend/src/components/CustomFieldsRenderer.js
// Affiche les champs personnalisés dans le formulaire médecin
// ══════════════════════════════════════════

import React, { useState, useEffect } from 'react';

import { fetchActiveCustomFields } from '../utils/customFields';

// ─── Rendu d'un champ individuel ──────────────────────────────────────────────

function RenderField({ field, value, onChange, hasError }) {
  const base = {
    background: '#fff',
    border: `1.5px solid ${hasError ? '#FF6B6B' : '#DDE4F3'}`,
    borderRadius: 10,
    padding: '10px 14px',
    fontSize: 13.5,
    fontFamily: "'Nunito', sans-serif",
    color: '#1A2B4A',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
    transition: '0.2s',
  };

  switch (field.field_type) {
    case 'text':
      return (
        <input
          type="text"
          style={base}
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          placeholder={`Saisir ${field.label.toLowerCase()}…`}
        />
      );

    case 'number':
      return (
        <input
          type="number"
          style={base}
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          placeholder="0"
          step="any"
        />
      );

    case 'date':
      return (
        <input
          type="date"
          style={base}
          value={value || ''}
          onChange={e => onChange(e.target.value)}
        />
      );

    case 'textarea':
      return (
        <textarea
          style={{ ...base, minHeight: 80, resize: 'vertical' }}
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          placeholder={`Saisir ${field.label.toLowerCase()}…`}
        />
      );

    case 'boolean':
      return (
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          {['Oui', 'Non'].map(opt => (
            <button
              key={opt}
              type="button"
              style={{
                padding: '7px 18px',
                borderRadius: 30,
                border: `2px solid ${value === opt ? '#4A6CF7' : '#DDE4F3'}`,
                background: value === opt ? '#4A6CF7' : '#fff',
                color: value === opt ? '#fff' : '#7A8BAD',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: "'Nunito', sans-serif",
                transition: '0.15s',
              }}
              onClick={() => onChange(value === opt ? '' : opt)}
            >
              {opt === 'Oui' ? '✓' : '✗'} {opt}
            </button>
          ))}
        </div>
      );

    case 'select':
      return (
        <select
          style={base}
          value={value || ''}
          onChange={e => onChange(e.target.value)}
        >
          <option value="">Sélectionner…</option>
          {(field.options || []).map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      );

    default:
      return null;
  }
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function CustomFieldsRenderer({
  section = 'diagnostic',
  values = {},
  onChange,
  invalidNames = [],
}) {
  const [fields,  setFields]  = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActiveCustomFields(section)
      .then(setFields)
      .catch(() => setFields([]))
      .finally(() => setLoading(false));
  }, [section]);

  if (loading) return (
    <div style={{ padding: '12px 16px', color: '#7A8BAD', fontSize: 12, fontWeight: 600 }}>
      ⏳ Chargement des champs…
    </div>
  );

  if (fields.length === 0) return null;

  const SECTION_LABELS = {
    diagnostic: { label: 'Diagnostic & Cancer', icon: '🎗', color: '#FF6B6B' },
    biologie:   { label: 'Données biologiques', icon: '🔬', color: '#FFA26B' },
    traitement: { label: 'Traitement',           icon: '💊', color: '#00C9A7' },
    autres:     { label: 'Autres',               icon: '📌', color: '#9B59B6' },
  };
  const sec = SECTION_LABELS[section] || { label: 'Champs personnalisés', icon: '🎛️', color: '#4A6CF7' };

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(74,108,247,0.03), rgba(155,89,182,0.02))',
      border: `1.5px solid ${sec.color}30`,
      borderRadius: 16,
      padding: '20px 22px',
      marginTop: 16,
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        marginBottom: 18,
        paddingBottom: 12,
        borderBottom: `1.5px solid ${sec.color}25`,
      }}>
        <span style={{ fontSize: 16 }}>{sec.icon}</span>
        <div style={{
          fontSize: 10.5, fontWeight: 900, color: sec.color,
          textTransform: 'uppercase', letterSpacing: '1.3px', flex: 1,
        }}>
          Champs personnalisés — {sec.label}
        </div>
        <span style={{
          fontSize: 11, fontWeight: 800,
          padding: '3px 10px', borderRadius: 20,
          background: sec.color + '18', color: sec.color,
        }}>
          {fields.length} champ{fields.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Champs */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {fields.map(field => (
          <div
            key={field.id}
            style={{
              ...(field.field_type === 'textarea' ? { gridColumn: '1 / -1' } : {}),
              display: 'flex', flexDirection: 'column', gap: 5,
            }}
          >
            <label style={{
              fontSize: 11.5, fontWeight: 700, color: '#7A8BAD',
              display: 'flex', alignItems: 'center', gap: 5,
            }}>
              {field.label}
              {field.is_required && (
                <span style={{
                  color: '#FF6B6B', fontSize: 10, fontWeight: 900,
                  padding: '2px 6px', background: 'rgba(255,107,107,0.1)',
                  borderRadius: 5,
                }}>
                  Obligatoire
                </span>
              )}
            </label>
            {invalidNames.includes(field.name) && (
              <div style={{ fontSize: 11, color: '#FF6B6B', fontWeight: 700 }}>
                Ce champ est obligatoire
              </div>
            )}
            <RenderField
              field={field}
              value={values[field.name] ?? ''}
              hasError={invalidNames.includes(field.name)}
              onChange={val => onChange(field.name, val)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}


