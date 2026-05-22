import React, { useMemo } from 'react';

const StatsSummary = ({ patients = [] }) => {
  const stats = useMemo(() => {
    if (!patients || patients.length === 0) {
      return null;
    }

    // 1. Total number of cases (patients with at least one cancer)
    const totalCases = patients.filter(p => p.cancers && p.cancers.length > 0).length;

    // 2. Number of unique wilayas
    const uniqueWilayas = new Set(
      patients
        .filter(p => p.wilaya_name)
        .map(p => p.wilaya_name)
    );
    const numberOfWilayas = uniqueWilayas.size;

    // 3. Dominant cancer type
    const cancerTypeCounts = {};
    patients.forEach(patient => {
      if (patient.cancers && patient.cancers.length > 0) {
        patient.cancers.forEach(cancer => {
          const cancerName = cancer.cancer_type_name || 'Inconnu';
          cancerTypeCounts[cancerName] = (cancerTypeCounts[cancerName] || 0) + 1;
        });
      }
    });
    const dominantCancerType = Object.entries(cancerTypeCounts).length > 0
      ? Object.entries(cancerTypeCounts).sort((a, b) => b[1] - a[1])[0][0]
      : 'N/A';

    // 4. Male vs Female percentage
    const maleCount = patients.filter(p => p.sexe === 'M').length;
    const femaleCount = patients.filter(p => p.sexe === 'F').length;
    const totalPatients = patients.length;
    const malePercentage = totalPatients > 0 ? ((maleCount / totalPatients) * 100).toFixed(1) : 0;
    const femalePercentage = totalPatients > 0 ? ((femaleCount / totalPatients) * 100).toFixed(1) : 0;

    // 5. Top dairas by number of cases (communes)
    const dairaStats = {};
    patients.forEach(patient => {
      const daira = patient.commune_name || 'Inconnu';
      if (patient.cancers && patient.cancers.length > 0) {
        dairaStats[daira] = (dairaStats[daira] || 0) + patient.cancers.length;
      }
    });
    const topDairas = Object.entries(dairaStats)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, count]) => `${name} (${count})`);

    return {
      totalCases,
      numberOfWilayas,
      dominantCancerType,
      malePercentage,
      femalePercentage,
      topDairas,
    };
  }, [patients]);

  if (!stats) {
    return (
      <div style={{ padding: 12, textAlign: 'center', color: '#94a3b8' }}>
        Aucune donnée disponible
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12 }}>
      {[
        { title: 'Total cas', value: stats.totalCases },
        { title: 'Nombre de wilayas', value: stats.numberOfWilayas },
        { title: 'Type de cancer dominant', value: stats.dominantCancerType },
        { title: 'Masculin / Féminin', value: `${stats.malePercentage}% / ${stats.femalePercentage}%` },
        { title: 'Top dairas', value: stats.topDairas.length > 0 ? stats.topDairas.join(', ') : 'N/A' },
      ].map((item) => (
        <div key={item.title} style={{ padding: 12, borderRadius: 10, background: 'white', border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: 10, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>{item.title}</div>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', wordBreak: 'break-word' }}>{item.value}</div>
        </div>
      ))}
    </div>
  );
};

export default StatsSummary;
