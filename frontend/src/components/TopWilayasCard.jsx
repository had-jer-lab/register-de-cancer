import React from 'react';

const TopWilayasCard = ({ wilaya, rank, totalCases, maxCases }) => {
  const colors = {
    1: { badge: '#FFD700', text: '#B8860B', bg: '#FFFACD' },
    2: { badge: '#C0C0C0', text: '#696969', bg: '#F5F5F5' },
    3: { badge: '#CD7F32', text: '#8B4513', bg: '#FFE4B5' }
  };

  const activeColor = colors[rank] || { badge: '#2563eb', text: '#1e40af', bg: '#eff6ff' };
  const percentage = (wilaya.cases / maxCases) * 100;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '14px 16px',
        background: activeColor.bg,
        borderRadius: 10,
        border: `1.5px solid ${activeColor.badge}33`,
        boxShadow: rank <= 3 ? `0 4px 12px ${activeColor.badge}22` : '0 2px 6px rgba(0,0,0,0.08)',
        transition: 'all 0.2s ease',
        marginBottom: 8
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateX(4px)';
        e.currentTarget.style.boxShadow = `0 6px 16px ${activeColor.badge}33`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateX(0)';
        e.currentTarget.style.boxShadow = rank <= 3 ? `0 4px 12px ${activeColor.badge}22` : '0 2px 6px rgba(0,0,0,0.08)';
      }}
    >
      {/* Badge Classement */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 40,
          height: 40,
          borderRadius: '50%',
          background: activeColor.badge,
          color: 'white',
          fontSize: 14,
          fontWeight: 800,
          flexShrink: 0,
          boxShadow: `0 2px 8px ${activeColor.badge}44`,
          position: 'relative'
        }}
      >
        #{rank}
        {rank <= 3 && (
          <div
            style={{
              position: 'absolute',
              top: -8,
              right: -8,
              width: 14,
              height: 14,
              borderRadius: '50%',
              background: activeColor.badge,
              border: '2px solid white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 8,
              fontWeight: 700
            }}
          >
            ★
          </div>
        )}
      </div>

      {/* Contenu */}
      <div style={{ flex: 1 }}>
        {/* Nom + Cases */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 6
        }}>
          <span style={{
            fontSize: 13,
            fontWeight: 700,
            color: '#0f172a'
          }}>
            {wilaya.label}
          </span>
          <span style={{
            fontSize: 12,
            fontWeight: 800,
            color: activeColor.text
          }}>
            {wilaya.cases.toLocaleString('fr-FR')} cas
          </span>
        </div>

        {/* Barre de progression */}
        <div
          style={{
            width: '100%',
            height: 6,
            borderRadius: 3,
            background: 'rgba(255, 255, 255, 0.6)',
            overflow: 'hidden',
            border: `1px solid ${activeColor.badge}44`
          }}
        >
          <div
            style={{
              height: '100%',
              borderRadius: 3,
              background: activeColor.badge,
              width: `${percentage}%`,
              transition: 'width 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
              boxShadow: `0 0 8px ${activeColor.badge}66`
            }}
          />
        </div>

        {/* Pourcentage */}
        <div style={{
          fontSize: 9.5,
          color: activeColor.text,
          fontWeight: 600,
          marginTop: 3,
          opacity: 0.85
        }}>
          {percentage.toFixed(1)}% du total
        </div>
      </div>
    </div>
  );
};

export default TopWilayasCard;
