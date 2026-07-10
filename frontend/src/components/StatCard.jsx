import React from 'react';

const StatCard = ({ title, value, icon: Icon, color = '#38bdf8' }) => {
  return (
    <div className="glass-card kpi-card">
      <div 
        className="kpi-icon-wrapper"
        style={{
          color: color,
          backgroundColor: `${color}15`,
          borderColor: `${color}33`
        }}
      >
        {Icon && <Icon size={22} />}
      </div>
      <div className="kpi-details">
        <h3>{title}</h3>
        <div className="value">{value}</div>
      </div>
    </div>
  );
};

export default StatCard;
