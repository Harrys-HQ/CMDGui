import React from 'react';

interface BreadcrumbsProps {
  path: string;
  onNavigate?: (path: string) => void;
}

const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ path, onNavigate }) => {
  if (!path) return <div className="breadcrumbs-placeholder" />;

  const segments = path.split(/[\\/]/).filter(Boolean);
  const isWindows = path.includes('\\') || /^[A-Z]:/i.test(path);
  const root = isWindows && /^[A-Z]:/i.test(path) ? path.split(/[\\/]/)[0] : '/';

  const parts: { name: string; fullPath: string }[] = [];
  let currentPath = '';

  segments.forEach((segment, index) => {
    if (index === 0 && isWindows && segment.includes(':')) {
      currentPath = segment + '\\';
      parts.push({ name: segment, fullPath: currentPath });
    } else {
      if (isWindows) {
        currentPath += (currentPath.endsWith('\\') ? '' : '\\') + segment;
      } else {
        currentPath += '/' + segment;
      }
      parts.push({ name: segment, fullPath: currentPath });
    }
  });

  return (
    <div className="breadcrumbs">
      <div className="breadcrumb-item root" onClick={() => onNavigate?.(root)}>
        🏠
      </div>
      {parts.map((part, index) => (
        <React.Fragment key={part.fullPath}>
          <div className="breadcrumb-separator">/</div>
          <div
            className={`breadcrumb-item ${index === parts.length - 1 ? 'active' : ''}`}
            onClick={() => onNavigate?.(part.fullPath)}
            title={part.fullPath}
          >
            {part.name}
          </div>
        </React.Fragment>
      ))}
    </div>
  );
};

export default Breadcrumbs;
