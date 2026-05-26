import React, { useState, useEffect, useCallback } from 'react';

const API = 'http://localhost:8000/api';

async function apiFetch(path, options = {}) {
  const token = localStorage.getItem('access_token');
  const res = await fetch(`${API}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  });
  if (!res.ok) throw await res.json().catch(() => ({}));
  if (res.status === 204) return null;
  return res.json();
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const FIELD_TYPES = [
  { value: 'text',     label: 'Texte libre',        icon: '✍️',  desc: 'Champ texte simple' },
  { value: 'number',   label: 'Nombre',              icon: '🔢',  desc: 'Valeur numérique' },
  { value: 'date',     label: 'Date',                icon: '📅',  desc: 'Sélecteur de date' },
  { value: 'select',   label: 'Liste déroulante',    icon: '📋',  desc: 'Choix parmi des options' },
  { value: 'boolean',  label: 'Oui / Non',           icon: '✅',  desc: 'Case à cocher' },
  { value: 'textarea', label: 'Texte long',          icon: '📝',  desc: 'Zone de texte multi-lignes' },
];

const SECTIONS = [
  { value: 'diagnostic', label: 'Diagnostic & Cancer',   icon: '🎗', color: '#FF6B6B' },
  { value: 'biologie',   label: 'Données biologiques',   icon: '🔬', color: '#FFA26B' },
  { value: 'traitement', label: 'Traitement',             icon: '💊', color: '#00C9A7' },
  { value: 'autres',     label: 'Autres',                 icon: '📌', color: '#9B59B6' },
];

const SECTION_MAP = Object.fromEntries(SECTIONS.map(s => [s.value, s]));
const TYPE_MAP    = Object.fromEntries(FIELD_TYPES.map(t => [t.value, t]));

// ─── Composant Modal ──────────────────────────────────────────────────────────

function FieldModal({ field, onClose, onSave }) {
  const isNew = !field;
  const [form, setForm] = useState(
    field || {
      label: '', name: '', field_type: 'text', section: 'diagnostic',
      is_required: false, is_active: true, options: [], order: 0,
    }
  );
  const [optionInput, setOptionInput] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const up = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Auto-générer le name depuis le label
  const handleLabelChange = (val) => {
    up('label', val);
    if (isNew) {
      const slug = val
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '');
      up('name', slug);
    }
  };

  const addOption = () => {
    const val = optionInput.trim();
    if (!val) return;
    up('options', [...(form.options || []), val]);
    setOptionInput('');
  };

  const removeOption = (i) => {
    up('options', form.options.filter((_, idx) => idx !== i));
  };

  const validate = () => {
    const e = {};
    if (!form.label.trim()) e.label = 'Le libellé est obligatoire';
    if (!form.name.trim())  e.name  = 'Le nom technique est obligatoire';
    if (form.field_type === 'select' && (!form.options || form.options.length < 2))
      e.options = 'Ajoutez au moins 2 options';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await onSave(form);
    } catch (err) {
      const e = {};
      if (err.label) e.label = err.label[0];
      if (err.name)  e.name  = err.name[0];
      setErrors(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.overlay}>
      <div style={s.modal}>
        {/* Header */}
        <div style={s.mHead}>
          <div style={s.mHeadLeft}>
            <div style={s.mHeadIcon}>{isNew ? '➕' : '✏️'}</div>
            <div>
              <div style={s.mHeadTitle}>{isNew ? 'Nouveau champ' : `Modifier — ${field.label}`}</div>
              <div style={s.mHeadSub}>Champ personnalisé pour le formulaire de diagnostic</div>
            </div>
          </div>
          <button style={s.mClose} onClick={onClose}>✕</button>
        </div>

        {/* Body */}
        <div style={s.mBody}>

          {/* Section */}
          <div style={s.mSection}>
            <div style={s.mSectionLabel}>Section d'affichage</div>
            <div style={s.sectionGrid}>
              {SECTIONS.map(sec => (
                <div key={sec.value}
                  style={{ ...s.sectionChip, ...(form.section === sec.value ? { ...s.sectionChipActive, borderColor: sec.color, background: sec.color + '18', color: sec.color } : {}) }}
                  onClick={() => up('section', sec.value)}
                >
                  <span style={{ fontSize: 18 }}>{sec.icon}</span>
                  <span style={{ fontSize: 12, fontWeight: 700 }}>{sec.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Libellé + Nom */}
          <div style={s.mSection}>
            <div style={s.mSectionLabel}>Identification</div>
            <div style={s.mGrid2}>
              <div style={s.mfg}>
                <label style={s.ml}>Libellé affiché *</label>
                <input
                  style={{ ...s.mi, ...(errors.label ? s.miErr : {}) }}
                  value={form.label}
                  onChange={e => handleLabelChange(e.target.value)}
                  placeholder="ex: Score de Gleason, HER2 détaillé…"
                />
                {errors.label && <span style={s.errTxt}>{errors.label}</span>}
              </div>
              <div style={s.mfg}>
                <label style={s.ml}>Nom technique (auto)</label>
                <input
                  style={{ ...s.mi, ...(errors.name ? s.miErr : {}), background: '#F0F4FF', color: '#4A6CF7' }}
                  value={form.name}
                  onChange={e => up('name', e.target.value)}
                  placeholder="score_gleason"
                />
                {errors.name && <span style={s.errTxt}>{errors.name}</span>}
              </div>
            </div>
          </div>

          {/* Type de champ */}
          <div style={s.mSection}>
            <div style={s.mSectionLabel}>Type de champ</div>
            <div style={s.typeGrid}>
              {FIELD_TYPES.map(ft => (
                <div key={ft.value}
                  style={{ ...s.typeCard, ...(form.field_type === ft.value ? s.typeCardActive : {}) }}
                  onClick={() => up('field_type', ft.value)}
                >
                  <div style={s.typeIcon}>{ft.icon}</div>
                  <div style={s.typeLabel}>{ft.label}</div>
                  <div style={s.typeDesc}>{ft.desc}</div>
                  <div style={{ ...s.typeCheck, ...(form.field_type === ft.value ? s.typeCheckActive : {}) }}>
                    {form.field_type === ft.value ? '✓' : ''}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Options (si select) */}
          {form.field_type === 'select' && (
            <div style={s.mSection}>
              <div style={s.mSectionLabel}>Options de la liste</div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <input
                  style={{ ...s.mi, flex: 1 }}
                  value={optionInput}
                  onChange={e => setOptionInput(e.target.value)}
                  placeholder="Ajouter une option…"
                  onKeyPress={e => e.key === 'Enter' && addOption()}
                />
                <button style={s.addOptionBtn} onClick={addOption}>＋ Ajouter</button>
              </div>
              {errors.options && <div style={s.errTxt}>{errors.options}</div>}
              {(form.options || []).length > 0 && (
                <div style={s.optionsList}>
                  {form.options.map((opt, i) => (
                    <div key={i} style={s.optionItem}>
                      <span style={s.optionDot}>⠿</span>
                      <span style={{ flex: 1, fontSize: 13, color: '#1A2B4A', fontWeight: 600 }}>{opt}</span>
                      <button style={s.optionDel} onClick={() => removeOption(i)}>✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Paramètres */}
          <div style={s.mSection}>
            <div style={s.mSectionLabel}>Paramètres</div>
            <div style={s.paramGrid}>
              <div style={s.paramCard}
                onClick={() => up('is_required', !form.is_required)}
              >
                <div style={{ ...s.paramCheck, ...(form.is_required ? s.paramCheckOn : {}) }}>
                  {form.is_required ? '✓' : ''}
                </div>
                <div>
                  <div style={s.paramLabel}>Champ obligatoire</div>
                  <div style={s.paramSub}>Le médecin devra remplir ce champ</div>
                </div>
              </div>
              <div style={s.paramCard}
                onClick={() => up('is_active', !form.is_active)}
              >
                <div style={{ ...s.paramCheck, ...(form.is_active ? s.paramCheckOn : {}) }}>
                  {form.is_active ? '✓' : ''}
                </div>
                <div>
                  <div style={s.paramLabel}>Champ actif</div>
                  <div style={s.paramSub}>Visible dans les formulaires médecins</div>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div style={s.mFoot}>
          <button style={s.btnGhost} onClick={onClose} disabled={loading}>Annuler</button>
          <button style={{ ...s.btnPrimary, opacity: loading ? 0.7 : 1 }} onClick={handleSubmit} disabled={loading}>
            {loading ? '⏳ Sauvegarde…' : isNew ? '✓ Créer le champ' : '✓ Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Preview du champ ─────────────────────────────────────────────────────────

function FieldPreview({ field }) {
  const [val, setVal] = useState('');
  const ft = TYPE_MAP[field.field_type] || {};
  const sec = SECTION_MAP[field.section] || {};

  return (
    <div style={s.previewCard}>
      <div style={s.previewHeader}>
        <span style={{ fontSize: 14 }}>{ft.icon}</span>
        <span style={s.previewTitle}>Aperçu — tel qu'il apparaîtra</span>
        <span style={{ ...s.previewSec, color: sec.color, background: sec.color + '18' }}>
          {sec.icon} {sec.label}
        </span>
      </div>
      <div style={s.previewBody}>
        <label style={s.previewLabel}>
          {field.label}
          {field.is_required && <span style={{ color: '#FF6B6B', marginLeft: 4 }}>*</span>}
        </label>
        {field.field_type === 'text' && (
          <input style={s.previewInput} placeholder={`Saisir ${field.label.toLowerCase()}…`} value={val} onChange={e => setVal(e.target.value)} />
        )}
        {field.field_type === 'number' && (
          <input style={s.previewInput} type="number" placeholder="0" value={val} onChange={e => setVal(e.target.value)} />
        )}
        {field.field_type === 'date' && (
          <input style={s.previewInput} type="date" value={val} onChange={e => setVal(e.target.value)} />
        )}
        {field.field_type === 'textarea' && (
          <textarea style={{ ...s.previewInput, minHeight: 80, resize: 'vertical' }} placeholder="Texte libre…" value={val} onChange={e => setVal(e.target.value)} />
        )}
        {field.field_type === 'boolean' && (
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            {['Oui', 'Non'].map(opt => (
              <button key={opt} style={{ ...s.previewTag, ...(val === opt ? s.previewTagSel : {}) }} onClick={() => setVal(val === opt ? '' : opt)}>
                {opt === 'Oui' ? '✓' : '✗'} {opt}
              </button>
            ))}
          </div>
        )}
        {field.field_type === 'select' && field.options?.length > 0 && (
          <select style={s.previewInput} value={val} onChange={e => setVal(e.target.value)}>
            <option value="">Sélectionner…</option>
            {field.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        )}
      </div>
    </div>
  );
}

// ─── Composant Principal ──────────────────────────────────────────────────────

export default function CustomFieldsPage({ search = '' }) {
  const [fields,      setFields]      = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [showModal,   setShowModal]   = useState(false);
  const [editField,   setEditField]   = useState(null);
  const [preview,     setPreview]     = useState(null);
  const [activeSection, setActiveSection] = useState('all');
  const [toast,       setToast]       = useState({ msg: '', type: 'success' });

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: '', type: 'success' }), 3500);
  }, []);

  const loadFields = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/patients/custom-fields/');
      setFields(Array.isArray(data) ? data : (data.results || []));
    } catch {
      showToast('Erreur de chargement', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { loadFields(); }, [loadFields]);

  const handleSave = async (formData) => {
    if (editField) {
      const updated = await apiFetch(`/patients/custom-fields/${editField.id}/`, {
        method: 'PATCH',
        body: JSON.stringify(formData),
      });
      setFields(prev => prev.map(f => f.id === editField.id ? updated : f));
      showToast(`✓ Champ « ${formData.label} » modifié`);
    } else {
      const created = await apiFetch('/patients/custom-fields/', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      setFields(prev => [...prev, created]);
      showToast(`✓ Champ « ${formData.label} » créé avec succès`);
    }
    setShowModal(false);
    setEditField(null);
  };

  const handleDelete = async (id, label) => {
    if (!window.confirm(`Supprimer le champ « ${label} » ?`)) return;
    try {
      await apiFetch(`/patients/custom-fields/${id}/`, { method: 'DELETE' });
      setFields(prev => prev.filter(f => f.id !== id));
      showToast(`✓ Champ supprimé`);
    } catch {
      showToast('Erreur de suppression', 'error');
    }
  };

  const handleToggleActive = async (field) => {
    try {
      const updated = await apiFetch(`/patients/custom-fields/${field.id}/`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: !field.is_active }),
      });
      setFields(prev => prev.map(f => f.id === field.id ? updated : f));
      showToast(`Champ ${updated.is_active ? 'activé' : 'désactivé'}`);
    } catch {
      showToast('Erreur', 'error');
    }
  };

  const filtered = fields.filter(f => {
    const matchSection = activeSection === 'all' || f.section === activeSection;
    const matchSearch  = `${f.label} ${f.name} ${f.section}`.toLowerCase().includes(search.toLowerCase());
    return matchSection && matchSearch;
  });

  const groupedBySection = SECTIONS.map(sec => ({
    ...sec,
    fields: filtered.filter(f => f.section === sec.value),
  })).filter(sec => sec.fields.length > 0 || activeSection === sec.value);

  const stats = {
    total:  fields.length,
    active: fields.filter(f => f.is_active).length,
    required: fields.filter(f => f.is_required).length,
  };

  return (
    <div>
      {/* Toast */}
      {toast.msg && (
        <div style={{
          ...s.toast,
          background: toast.type === 'error'
            ? 'linear-gradient(135deg,#FF6B6B,#e74c3c)'
            : 'linear-gradient(135deg,#00C9A7,#00a98b)',
        }}>
          {toast.msg}
        </div>
      )}

      {/* Modal */}
      {(showModal || editField) && (
        <FieldModal
          field={editField}
          onClose={() => { setShowModal(false); setEditField(null); }}
          onSave={handleSave}
        />
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div style={s.pageTitle}>
            Champs personnalisés
            <span style={s.pageTitleBadge}>{stats.total} champ{stats.total !== 1 ? 's' : ''}</span>
          </div>
          <div style={s.pageSub}>
            Ajoutez des champs sur mesure dans le formulaire de diagnostic des médecins
          </div>
        </div>
        <button style={{ ...s.btnPrimary, flexShrink: 0 }} onClick={() => setShowModal(true)}>
  ➕ Nouveau champ
</button>
      </div>

      {/* Stats rapides */}
      <div style={s.statsRow}>
        {[
          { icon: '📋', label: 'Total champs',    value: stats.total,    color: '#4A6CF7' },
          { icon: '✅', label: 'Champs actifs',   value: stats.active,   color: '#00C9A7' },
          { icon: '⚠️', label: 'Obligatoires',    value: stats.required, color: '#FFA26B' },
          { icon: '🎗', label: 'Sections',         value: SECTIONS.length, color: '#9B59B6' },
        ].map(({ icon, label, value, color }) => (
          <div key={label} style={s.statMini}>
            <div style={{ ...s.statMiniIcon, color, background: color + '18' }}>{icon}</div>
            <div>
              <div style={{ ...s.statMiniVal, color }}>{value}</div>
              <div style={s.statMiniLabel}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filtres section */}
      <div style={s.filterRow}>
        <button
          style={{ ...s.filterBtn, ...(activeSection === 'all' ? s.filterBtnActive : {}) }}
          onClick={() => setActiveSection('all')}
        >
          Toutes les sections
        </button>
        {SECTIONS.map(sec => (
          <button key={sec.value}
            style={{
              ...s.filterBtn,
              ...(activeSection === sec.value ? {
                background: sec.color,
                borderColor: sec.color,
                color: '#fff',
              } : {}),
            }}
            onClick={() => setActiveSection(sec.value)}
          >
            {sec.icon} {sec.label}
          </button>
        ))}
      </div>

      {/* Preview latéral */}
      {preview && (
        <div style={s.previewBanner}>
          <FieldPreview field={preview} />
          <button style={s.closePreview} onClick={() => setPreview(null)}>✕ Fermer l'aperçu</button>
        </div>
      )}

      {/* Contenu */}
      {loading ? (
        <div style={s.loadBox}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
          Chargement des champs personnalisés…
        </div>
      ) : filtered.length === 0 ? (
        <div style={s.emptyBox}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🎛️</div>
          <div style={{ fontWeight: 800, fontSize: 16, color: '#1A2B4A', marginBottom: 8 }}>
            {search ? 'Aucun champ trouvé' : 'Aucun champ personnalisé'}
          </div>
          <div style={{ fontSize: 13, color: '#7A8BAD', marginBottom: 20, maxWidth: 360 }}>
            {search
              ? `Aucun résultat pour « ${search} »`
              : 'Créez votre premier champ personnalisé pour enrichir les formulaires de diagnostic des médecins.'
            }
          </div>
          {!search && (
            <button style={s.btnPrimary} onClick={() => setShowModal(true)}>
              ➕ Créer le premier champ
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {groupedBySection.map(sec => (
            <div key={sec.value}>
              {/* Section header */}
              <div style={{ ...s.secHeader, borderLeftColor: sec.color }}>
                <span style={{ fontSize: 20 }}>{sec.icon}</span>
                <span style={{ ...s.secTitle, color: sec.color }}>{sec.label}</span>
                <span style={{ ...s.secCount, color: sec.color, background: sec.color + '18' }}>
                  {sec.fields.length} champ{sec.fields.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Table */}
              <div style={s.tableWrap}>
                <table style={s.table}>
                  <thead>
                    <tr style={s.thead}>
                      {['#', 'Libellé', 'Type', 'Options', 'Obligatoire', 'Statut', 'Créé le', 'Actions'].map(h => (
                        <th key={h} style={s.th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sec.fields.map((field, i) => {
                      const ft  = TYPE_MAP[field.field_type] || {};
                      return (
                        <tr key={field.id} style={{ ...s.tr, background: i % 2 === 0 ? '#fff' : '#FAFBFF' }}>
                          <td style={s.td}>
                            <span style={s.orderBadge}>{i + 1}</span>
                          </td>
                          <td style={s.td}>
                            <div style={{ fontWeight: 800, color: '#1A2B4A', fontSize: 14 }}>
                              {field.label}
                            </div>
                            <div style={{ fontSize: 11, color: '#7A8BAD', fontWeight: 600, fontFamily: 'monospace' }}>
                              {field.name}
                            </div>
                          </td>
                          <td style={s.td}>
                            <span style={s.typeBadge}>
                              {ft.icon} {ft.label}
                            </span>
                          </td>
                          <td style={s.td}>
                            {field.field_type === 'select' && field.options?.length > 0 ? (
                              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                {field.options.slice(0, 3).map(opt => (
                                  <span key={opt} style={s.optBadge}>{opt}</span>
                                ))}
                                {field.options.length > 3 && (
                                  <span style={{ ...s.optBadge, color: '#7A8BAD' }}>
                                    +{field.options.length - 3}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span style={{ color: '#C5D0E8', fontSize: 12 }}>—</span>
                            )}
                          </td>
                          <td style={s.td}>
                            {field.is_required ? (
                              <span style={s.reqBadge}>⚠️ Oui</span>
                            ) : (
                              <span style={{ color: '#C5D0E8', fontSize: 12 }}>Non</span>
                            )}
                          </td>
                          <td style={s.td}>
                            <div
                              style={{ ...s.statusToggle, background: field.is_active ? 'rgba(0,201,167,0.12)' : 'rgba(122,139,173,0.1)' }}
                              onClick={() => handleToggleActive(field)}
                            >
                              <div style={{
                                ...s.toggleDot,
                                background: field.is_active ? '#00C9A7' : '#7A8BAD',
                                boxShadow: field.is_active ? '0 0 8px rgba(0,201,167,0.5)' : 'none',
                              }} />
                              <span style={{ fontSize: 12, fontWeight: 800, color: field.is_active ? '#00C9A7' : '#7A8BAD' }}>
                                {field.is_active ? 'Actif' : 'Inactif'}
                              </span>
                            </div>
                          </td>
                          <td style={s.td}>
                            <span style={{ fontSize: 11, color: '#7A8BAD', fontWeight: 700 }}>
                              {field.created_at ? new Date(field.created_at).toLocaleDateString('fr-FR') : '—'}
                            </span>
                          </td>
                          <td style={s.td}>
                            <div style={s.actionBtns}>
                              <button
                                style={{ ...s.iconBtn, color: '#9B59B6', borderColor: 'rgba(155,89,182,0.3)' }}
                                title="Aperçu"
                                onClick={() => setPreview(preview?.id === field.id ? null : field)}
                              >
                                👁
                              </button>
                              <button
                                style={s.iconBtn}
                                title="Modifier"
                                onClick={() => setEditField(field)}
                              >
                                ✏️
                              </button>
                              <button
                                style={{ ...s.iconBtn, color: '#FF6B6B', borderColor: 'rgba(255,107,107,0.3)' }}
                                title="Supprimer"
                                onClick={() => handleDelete(field.id, field.label)}
                              >
                                🗑
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Guide d'utilisation */}
      {!loading && fields.length > 0 && (
        <div style={s.guideBox}>
          <div style={{ fontSize: 22, marginBottom: 10 }}>💡</div>
          <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 8, color: '#1A2B4A' }}>
            Comment fonctionnent les champs personnalisés ?
          </div>
          <div style={{ fontSize: 13, color: '#7A8BAD', lineHeight: 1.7 }}>
            1. Les champs <strong>actifs</strong> apparaissent automatiquement dans le formulaire de diagnostic des médecins (Page 2)<br />
            2. Les champs <strong>obligatoires</strong> doivent être remplis avant la soumission du dossier<br />
            3. Les valeurs saisies sont sauvegardées avec chaque dossier cancer et consultables dans la fiche patient<br />
            4. Vous pouvez <strong>désactiver</strong> un champ sans le supprimer pour conserver les données existantes
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = {
  toast: { position: 'fixed', bottom: 24, right: 24, color: '#fff', padding: '14px 24px', borderRadius: 14, fontSize: 14, fontWeight: 800, boxShadow: '0 10px 30px rgba(0,0,0,0.2)', zIndex: 2000, fontFamily: "'Nunito', sans-serif", maxWidth: 420 },
  pageTitle: { fontFamily: "'Poppins', sans-serif", fontWeight: 800, fontSize: 20, color: '#1A2B4A', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 },
  pageTitleBadge: { fontSize: 13, fontWeight: 700, color: '#7A8BAD', background: '#EEF2FF', padding: '3px 10px', borderRadius: 20 },
  pageSub: { fontSize: 13, color: '#7A8BAD', fontWeight: 600 },
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 },
  statMini: { background: '#fff', borderRadius: 14, padding: '14px 16px', border: '1.5px solid #EEF2FF', display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 2px 10px rgba(74,108,247,0.06)' },
  statMiniIcon: { width: 40, height: 40, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 },
  statMiniVal: { fontFamily: "'Poppins', sans-serif", fontWeight: 900, fontSize: 20 },
  statMiniLabel: { fontSize: 11, color: '#7A8BAD', fontWeight: 700 },
  filterRow: { display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' },
  filterBtn: { padding: '8px 16px', borderRadius: 30, border: '1.5px solid #DDE4F3', background: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', color: '#7A8BAD', fontFamily: "'Nunito', sans-serif", transition: '0.2s' },
  filterBtnActive: { background: '#4A6CF7', borderColor: '#4A6CF7', color: '#fff' },
  previewBanner: { background: '#fff', borderRadius: 16, padding: '20px', border: '2px solid rgba(155,89,182,0.25)', marginBottom: 20, boxShadow: '0 4px 20px rgba(155,89,182,0.1)' },
  closePreview: { marginTop: 12, padding: '8px 16px', borderRadius: 30, border: '1.5px solid #DDE4F3', background: '#F5F8FF', color: '#7A8BAD', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: "'Nunito', sans-serif" },
  loadBox: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 60, color: '#7A8BAD', fontSize: 14, fontWeight: 600 },
  emptyBox: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', background: '#fff', borderRadius: 16, border: '1.5px solid #EEF2FF', textAlign: 'center' },
  secHeader: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, borderLeft: '4px solid #4A6CF7', paddingLeft: 14 },
  secTitle: { fontFamily: "'Poppins', sans-serif", fontWeight: 800, fontSize: 15 },
  secCount: { fontSize: 12, fontWeight: 800, padding: '3px 10px', borderRadius: 20 },
  tableWrap: { background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 20px rgba(74,108,247,0.08)', border: '1.5px solid #EEF2FF' },
  table: { width: '100%', borderCollapse: 'collapse' },
  thead: { background: '#F5F8FF' },
  th: { padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 900, color: '#7A8BAD', textTransform: 'uppercase', letterSpacing: '0.9px', borderBottom: '1.5px solid #EEF2FF', whiteSpace: 'nowrap' },
  tr: { transition: '0.15s' },
  td: { padding: '13px 16px', fontSize: 13, color: '#1A2B4A', fontWeight: 600, borderBottom: '1px solid #EEF2FF' },
  orderBadge: { width: 24, height: 24, borderRadius: '50%', background: '#EEF2FF', color: '#4A6CF7', fontSize: 11, fontWeight: 900, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' },
  typeBadge: { padding: '4px 10px', borderRadius: 8, fontSize: 12, fontWeight: 700, background: 'rgba(74,108,247,0.08)', color: '#4A6CF7', whiteSpace: 'nowrap' },
  optBadge: { padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700, background: '#F0F4FF', color: '#4A6CF7' },
  reqBadge: { padding: '3px 10px', borderRadius: 6, fontSize: 12, fontWeight: 700, background: 'rgba(255,162,107,0.12)', color: '#FFA26B' },
  statusToggle: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 30, cursor: 'pointer', transition: '0.2s' },
  toggleDot: { width: 8, height: 8, borderRadius: '50%', transition: '0.2s' },
  actionBtns: { display: 'flex', gap: 5 },
  iconBtn: { width: 32, height: 32, borderRadius: 8, border: '1.5px solid rgba(74,108,247,0.2)', background: 'rgba(74,108,247,0.05)', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4A6CF7', transition: '0.2s' },
  guideBox: { marginTop: 24, background: 'linear-gradient(135deg,rgba(74,108,247,0.05),rgba(0,201,167,0.03))', border: '1.5px solid rgba(74,108,247,0.15)', borderRadius: 16, padding: '24px 28px' },

  // Modal
  overlay: { position: 'fixed', inset: 0, background: 'rgba(10,20,50,0.6)', backdropFilter: 'blur(10px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 },
  modal: { background: '#fff', borderRadius: 24, width: '100%', maxWidth: 720, maxHeight: '94vh', display: 'flex', flexDirection: 'column', boxShadow: '0 32px 80px rgba(0,0,0,0.25)' },
  mHead: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '22px 28px', borderBottom: '1.5px solid #EEF2FF' },
  mHeadLeft: { display: 'flex', alignItems: 'center', gap: 14 },
  mHeadIcon: { width: 44, height: 44, background: 'linear-gradient(135deg,#4A6CF7,#6B87FF)', borderRadius: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: '#fff', boxShadow: '0 6px 18px rgba(74,108,247,0.35)' },
  mHeadTitle: { fontFamily: "'Poppins', sans-serif", fontWeight: 800, fontSize: 18, color: '#1A2B4A' },
  mHeadSub: { fontSize: 12, color: '#7A8BAD', fontWeight: 600, marginTop: 2 },
  mClose: { width: 34, height: 34, borderRadius: 8, border: '1.5px solid #DDE4F3', background: '#F5F8FF', cursor: 'pointer', fontSize: 16, color: '#7A8BAD', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  mBody: { padding: '24px 28px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 24 },
  mSection: {},
  mSectionLabel: { fontSize: 10.5, fontWeight: 900, color: '#7A8BAD', textTransform: 'uppercase', letterSpacing: '1.3px', marginBottom: 14 },
  mGrid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  mfg: { display: 'flex', flexDirection: 'column', gap: 5 },
  ml: { fontSize: 11.5, fontWeight: 700, color: '#7A8BAD' },
  mi: { background: '#F5F8FF', border: '1.5px solid #DDE4F3', borderRadius: 10, padding: '10px 14px', fontSize: 13, fontFamily: "'Nunito', sans-serif", color: '#1A2B4A', outline: 'none', width: '100%', boxSizing: 'border-box' },
  miErr: { borderColor: '#FF6B6B' },
  errTxt: { fontSize: 11, color: '#FF6B6B', fontWeight: 700 },
  sectionGrid: { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 },
  sectionChip: { padding: '12px 8px', borderRadius: 12, border: '2px solid #DDE4F3', background: '#F5F8FF', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, transition: '0.2s' },
  sectionChipActive: { border: '2px solid' },
  typeGrid: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 },
  typeCard: { padding: '14px', border: '2px solid #DDE4F3', borderRadius: 12, cursor: 'pointer', position: 'relative', transition: '0.2s', background: '#F5F8FF' },
  typeCardActive: { border: '2px solid #4A6CF7', background: 'rgba(74,108,247,0.06)' },
  typeIcon: { fontSize: 22, marginBottom: 6 },
  typeLabel: { fontSize: 13, fontWeight: 800, color: '#1A2B4A', marginBottom: 2 },
  typeDesc: { fontSize: 11, color: '#7A8BAD' },
  typeCheck: { position: 'absolute', top: 10, right: 10, width: 20, height: 20, borderRadius: '50%', border: '2px solid #DDE4F3', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900 },
  typeCheckActive: { background: '#4A6CF7', borderColor: '#4A6CF7', color: '#fff' },
  addOptionBtn: { padding: '10px 18px', borderRadius: 10, border: 'none', background: '#4A6CF7', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: "'Nunito', sans-serif", whiteSpace: 'nowrap' },
  optionsList: { display: 'flex', flexDirection: 'column', gap: 6 },
  optionItem: { display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: '#F5F8FF', borderRadius: 8, border: '1.5px solid #DDE4F3' },
  optionDot: { color: '#7A8BAD', fontSize: 14, cursor: 'grab' },
  optionDel: { background: 'none', border: 'none', color: '#FF6B6B', cursor: 'pointer', fontSize: 13, fontWeight: 700 },
  paramGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },
  paramCard: { display: 'flex', alignItems: 'center', gap: 12, padding: '14px', border: '1.5px solid #DDE4F3', borderRadius: 12, cursor: 'pointer', background: '#F5F8FF', transition: '0.2s' },
  paramCheck: { width: 22, height: 22, borderRadius: 6, border: '2px solid #DDE4F3', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 900, flexShrink: 0, transition: '0.2s' },
  paramCheckOn: { background: '#4A6CF7', borderColor: '#4A6CF7', color: '#fff' },
  paramLabel: { fontSize: 13, fontWeight: 800, color: '#1A2B4A' },
  paramSub: { fontSize: 11, color: '#7A8BAD', marginTop: 2 },
  mFoot: { display: 'flex', gap: 12, padding: '18px 28px', borderTop: '1.5px solid #EEF2FF', justifyContent: 'flex-end' },
  btnPrimary: { padding: '11px 24px', borderRadius: 30, border: 'none', background: 'linear-gradient(135deg,#4A6CF7,#6B87FF)', color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: "'Nunito', sans-serif", boxShadow: '0 6px 20px rgba(74,108,247,0.35)', transition: '0.2s' },
  btnGhost: { padding: '11px 24px', borderRadius: 30, border: '1.5px solid #DDE4F3', background: '#F5F8FF', color: '#7A8BAD', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: "'Nunito', sans-serif" },

  // Preview
  previewCard: { background: '#F8FAFF', borderRadius: 12, overflow: 'hidden', border: '1.5px solid #DDE4F3' },
  previewHeader: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', background: '#fff', borderBottom: '1.5px solid #EEF2FF' },
  previewTitle: { flex: 1, fontSize: 12, fontWeight: 700, color: '#7A8BAD' },
  previewSec: { padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 800 },
  previewBody: { padding: '16px' },
  previewLabel: { display: 'block', fontSize: 12, fontWeight: 700, color: '#7A8BAD', marginBottom: 6, letterSpacing: '0.3px' },
  previewInput: { width: '100%', background: '#fff', border: '1.5px solid #DDE4F3', borderRadius: 10, padding: '10px 14px', fontSize: 13, fontFamily: "'Nunito', sans-serif", color: '#1A2B4A', outline: 'none', boxSizing: 'border-box' },
  previewTag: { padding: '7px 16px', borderRadius: 30, border: '2px solid #DDE4F3', background: '#fff', color: '#7A8BAD', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: "'Nunito', sans-serif' " },
  previewTagSel: { background: '#4A6CF7', borderColor: '#4A6CF7', color: '#fff' },
};