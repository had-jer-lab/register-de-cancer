import React, { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePatient } from '../context/PatientContext';
import Layout from '../components/Layout';
import { SC, Field, Select, TagGroup, ImgCard, PageHeader, BtnRow } from '../components/FormFields';
import { MicButton } from '../components/MicButton';
import CustomFieldsRenderer from '../components/CustomFieldsRenderer';

const IMAGERIE_LIST = [
  { type: 'IRM', icon: '🏥' },
  { type: 'Scanner', icon: '📡' },
  { type: 'TEP/TDM', icon: '⚡' },
  { type: 'Échographie', icon: '〰' },
  { type: 'Radiologie', icon: '☢' },
  { type: 'Mammographie', icon: '🔍' },
  { type: 'Scintigraphie', icon: '💡' },
  { type: 'Endoscopie', icon: '🔭' },
  { type: 'Autre', icon: '➕' },
];

const MARQUEURS = [
  { key: 'cea',   label: 'CEA',    unit: 'ng/mL' },
  { key: 'ca199', label: 'CA 19-9', unit: 'U/mL' },
  { key: 'ca125', label: 'CA 125',  unit: 'U/mL' },
  { key: 'afp',   label: 'AFP',     unit: 'ng/mL' },
  { key: 'psa',   label: 'PSA',     unit: 'ng/mL' },
  { key: 'ca153', label: 'CA 15-3', unit: 'U/mL' },
];

export default function Page3() {
  const navigate = useNavigate();
  const { data, update } = usePatient();
  const imgRef = useRef();
  const bioRef = useRef();
  const [imgFileName, setImgFileName] = React.useState('');
  const [bioFileName, setBioFileName] = React.useState('');

  const set = (key) => (e) => update({ [key]: e.target.value });

  const toggleImagerie = (type) => {
    const current = data.imagerie || [];
    const next = current.includes(type)
      ? current.filter(t => t !== type)
      : [...current, type];
    update({ imagerie: next });
  };

  const addRechute    = () => update({ rechutes: [...(data.rechutes || []), { debut: '', fin: '' }] });
  const removeRechute = (i) => update({ rechutes: data.rechutes.filter((_, idx) => idx !== i) });
  const updateRechute = (i, field, val) => {
    const r = [...(data.rechutes || [])];
    r[i] = { ...r[i], [field]: val };
    update({ rechutes: r });
  };

  const addPatho    = () => update({ pathos: [...(data.pathos || []), { name: '', date: '' }] });
  const removePatho = (i) => update({ pathos: data.pathos.filter((_, idx) => idx !== i) });
  const updatePatho = (i, field, val) => {
    const p = [...(data.pathos || [])];
    p[i] = { ...p[i], [field]: val };
    update({ pathos: p });
  };

  return (
    <Layout currentStep={4} progress={60}>
      <PageHeader
        icon="🔬"
        iconBg="linear-gradient(135deg,#FFA26B,#ffbf97)"
        title="Données biologiques & Imagerie"
        step={3}
      />

      <div className="grid-2">
        {/* LEFT */}
        <div className="col-stack">

          {/* Marqueurs tumoraux — valeurs numériques, pas de micro utile */}
          <SC label="Marqueurs tumoraux">
            {MARQUEURS.map(({ key, label, unit }) => (
              <div key={key} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px', background:'var(--card)', border:'1.5px solid var(--border)', borderRadius:10, marginBottom:8 }}>
                <span style={{ flex:1, fontSize:13, fontWeight:700, color:'var(--text)' }}>{label}</span>
                <span style={{ fontSize:11, color:'var(--text-muted)', marginRight:6 }}>{unit}</span>
                <input
                  className="fi"
                  style={{ width:90 }}
                  type="number" step="0.1" placeholder="—"
                  value={data[key]} onChange={set(key)}
                />
              </div>
            ))}
          </SC>

          {/* Bilan sanguin */}
          <SC label="Bilan sanguin">
            <div className="field-row c2">
              <Field label="NFS">
                <Select options={['Normal','Anémie','Leucopénie','Thrombopénie','Anormal (autre)']}
                  placeholder="Statut" value={data.nfs} onChange={set('nfs')} />
              </Field>
              <Field label="Créatinine (mg/L)">
                <input className="fi" type="number" step="0.1" placeholder="—" value={data.creat} onChange={set('creat')} />
              </Field>
            </div>
            <div className="field-row c2" style={{ marginTop:10 }}>
              <Field label="GGT (U/L)">
                <input className="fi" type="number" step="1" placeholder="—" value={data.ggt} onChange={set('ggt')} />
              </Field>
              <Field label="LDH (U/L)">
                <input className="fi" type="number" step="1" placeholder="—" value={data.ldh} onChange={set('ldh')} />
              </Field>
            </div>
            <div className="field-row c2" style={{ marginTop:10 }}>
              <Field label="Hb (g/dL)">
                <input className="fi" type="number" step="0.1" placeholder="—" value={data.hb} onChange={set('hb')} />
              </Field>
              <Field label="TP (%)">
                <input className="fi" type="number" step="1" placeholder="—" value={data.tp} onChange={set('tp')} />
              </Field>
            </div>
          </SC>

          {/* Biopsie */}
          <SC label="Biopsie / Rapport anatomo-pathologique">
            <Field label="Statut de la biopsie">
              <Select options={['Réalisée — résultat positif','Réalisée — résultat négatif','En attente de résultat','Non réalisée']}
                placeholder="Sélectionner…" value={data.biopsy} onChange={set('biopsy')} />
            </Field>
            <Field label="Date de la biopsie" style={{ marginTop:10 }}>
              <input className="fi" type="date" value={data.biopsyDate} onChange={set('biopsyDate')} />
            </Field>
            <Field label="Joindre rapport AP" style={{ marginTop:10 }}>
              <div className="upload-box" onClick={() => bioRef.current.click()}>
                📎 Cliquer pour joindre le rapport
                <input ref={bioRef} type="file" accept=".pdf,.jpg,.png" style={{ display:'none' }}
                  onChange={e => e.target.files[0] && setBioFileName('📄 ' + e.target.files[0].name)} />
              </div>
              {bioFileName && <div className="file-name">{bioFileName}</div>}
            </Field>
          </SC>
        </div>

        {/* RIGHT */}
        <div className="col-stack">

          {/* Imagerie */}
          <SC label="Examens d'imagerie">
            <div className="img-grid">
              {IMAGERIE_LIST.map(({ type, icon }) => (
                <ImgCard key={type} icon={icon} label={type}
                  selected={(data.imagerie || []).includes(type)}
                  onToggle={() => toggleImagerie(type)} />
              ))}
            </div>
            <Field label="Joindre fichier imagerie" style={{ marginTop:14 }}>
              <div className="upload-box" onClick={() => imgRef.current.click()}>
                📎 Joindre fichier (IRM, Scanner…)
                <input ref={imgRef} type="file" accept=".dcm,.pdf,.jpg,.png" style={{ display:'none' }}
                  onChange={e => e.target.files[0] && setImgFileName('📄 ' + e.target.files[0].name)} />
              </div>
              {imgFileName && <div className="file-name">{imgFileName}</div>}
            </Field>
          </SC>

          {/* Rechutes */}
          <SC label="Rechutes">
            {(data.rechutes || []).map((r, i) => (
              <div key={i} className="list-item" style={{ marginBottom:8 }}>
                <div className="num-badge">{i + 1}</div>
                <div className="fg" style={{ flex:1 }}>
                  <input className="fi" type="date" value={r.debut} onChange={e => updateRechute(i, 'debut', e.target.value)} />
                </div>
                <span style={{ color:'var(--text-muted)', fontSize:12, padding:'0 4px' }}>→</span>
                <div className="fg" style={{ flex:1 }}>
                  <input className="fi" type="date" value={r.fin} onChange={e => updateRechute(i, 'fin', e.target.value)} />
                </div>
                {i > 0 && (
                  <button className="del-btn" onClick={() => removeRechute(i)}>✕</button>
                )}
              </div>
            ))}
            <button className="list-add" onClick={addRechute}>＋ Ajouter une rechute</button>
          </SC>

          <CustomFieldsRenderer
            section="biologie"
            values={data.customFields || {}}
            onChange={(name, val) => update({
              customFields: { ...(data.customFields || {}), [name]: val },
            })}
          />

          {/* Pathologies chroniques — avec MicButton sur le champ nom */}
          <SC label="Pathologies chroniques associées">
            {(data.pathos || []).map((p, i) => (
              <div key={i} className="list-item">
                <div style={{ flex:1, display:'flex', gap:6, alignItems:'center' }}>
                  <input className="fi" style={{ flex:1, border:'none', background:'transparent' }}
                    type="text" placeholder="Pathologie…"
                    value={p.name} onChange={e => updatePatho(i, 'name', e.target.value)} />
                  <MicButton onResult={(t) => updatePatho(i, 'name', t)} />
                </div>
                <input className="fi" style={{ width:130 }} type="text" placeholder="Date…"
                  value={p.date} onChange={e => updatePatho(i, 'date', e.target.value)} />
                <button className="del-btn" onClick={() => removePatho(i)}>✕</button>
              </div>
            ))}
            <button className="list-add" onClick={addPatho}>＋ Ajouter une pathologie</button>
          </SC>

          {/* Comorbidités */}
          <SC label="Comorbidités notables">
            <TagGroup
              options={['Diabète','HTA','Insuffisance rénale','Insuffisance cardiaque','VIH / SIDA','Hépatite B/C','Aucune']}
              value={data.como}
              onChange={v => update({ como: v })}
            />
          </SC>
        </div>
      </div>

      <BtnRow onBack={() => navigate('/page6')} onNext={() => navigate('/page4')} />
    </Layout>
  );
}