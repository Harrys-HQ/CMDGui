import React from 'react';
import { ChevronRight } from 'lucide-react';

const CollapsibleSection: React.FC<{
  title: string;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  action?: React.ReactNode;
}> = ({ title, isExpanded, onToggle, children, action }) => {
  return (
    <div className="sidebar-section">
      <div className="sidebar-section-header" onClick={onToggle}>
        <span
          style={{
            marginRight: '5px',
            transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform 0.15s ease',
            display: 'inline-flex',
            alignItems: 'center',
          }}
        >
          <ChevronRight size={12} strokeWidth={2.2} />
        </span>
        <span style={{ fontWeight: 'bold' }}>{title}</span>
        {action && (
          <div onClick={(e) => e.stopPropagation()} style={{ marginLeft: 'auto' }}>
            {action}
          </div>
        )}
      </div>
      {isExpanded && <div className="sidebar-section-content">{children}</div>}
    </div>
  );
};

export default CollapsibleSection;
