import React from 'react';

const StatusBadge = ({ type, value }) => {
  let formattedValue = value ? value.replace('_', ' ') : '';
  if (value === 'Pending') {
    formattedValue = 'Pending Review';
  }
  
  if (type === 'severity') {
    const severityClass = `badge badge-${value ? value.toLowerCase() : 'low'}`;
    return (
      <span className={severityClass}>
        {formattedValue}
      </span>
    );
  }

  // Type is status
  const statusClass = `badge badge-${value ? value.toLowerCase() : 'pending'}`;
  return (
    <span className={statusClass}>
      {formattedValue}
    </span>
  );
};

export default StatusBadge;
