import React from 'react';
import {
  Code,
  Folder,
  GitBranch,
  Terminal,
  Cpu,
  Layers,
  Box,
  Flame,
  Smartphone,
  Server,
  Database,
} from 'lucide-react';

interface TechIconProps {
  type?: string;
  size?: number;
  className?: string;
}

export const TechIcon: React.FC<TechIconProps> = ({ type, size = 16, className = '' }) => {
  const normType = (type || '').toLowerCase();

  switch (normType) {
    case 'react':
      return (
        <span className={`tech-icon-wrapper tech-react ${className}`} title="React Project">
          <svg width={size} height={size} viewBox="-11.5 -10.23174 23 20.46348" fill="none" stroke="currentColor">
            <circle cx="0" cy="0" r="2.05" fill="#06b6d4" />
            <g stroke="#06b6d4" strokeWidth="1">
              <ellipse rx="11" ry="4.2" />
              <ellipse rx="11" ry="4.2" transform="rotate(60)" />
              <ellipse rx="11" ry="4.2" transform="rotate(120)" />
            </g>
          </svg>
        </span>
      );

    case 'vue':
      return (
        <span className={`tech-icon-wrapper tech-vue ${className}`} title="Vue Project">
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <path d="M2 3h4l6 10.5L18 3h4L12 21 2 3z" fill="#42b883" />
            <path d="M6.5 3h3.5L12 6.5 14 3h3.5L12 12 6.5 3z" fill="#35495e" />
          </svg>
        </span>
      );

    case 'angular':
      return (
        <span className={`tech-icon-wrapper tech-angular ${className}`} title="Angular Project">
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <path d="M12 2L2 5.5l1.5 13L12 22l8.5-3.5 1.5-13L12 2z" fill="#dd0031" />
            <path d="M12 4.5l6.5 12h-2.3l-1.3-3.2H9.1l-1.3 3.2H5.5L12 4.5zm1.9 6.8L12 7.2l-1.9 4.1h3.8z" fill="#fff" />
          </svg>
        </span>
      );

    case 'svelte':
      return (
        <span className={`tech-icon-wrapper tech-svelte ${className}`} title="Svelte Project" style={{ color: '#ff3e00' }}>
          <Flame size={size} strokeWidth={2.2} />
        </span>
      );

    case 'node':
      return (
        <span className={`tech-icon-wrapper tech-node ${className}`} title="Node.js Project" style={{ color: '#22c55e' }}>
          <Server size={size} strokeWidth={2.2} />
        </span>
      );

    case 'python':
      return (
        <span className={`tech-icon-wrapper tech-python ${className}`} title="Python Project">
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <path d="M11.9 2c-3.1 0-2.9 1.3-2.9 1.3V5h6v1H6.7S3 5.6 3 9.7c0 4.1 2.5 4 2.5 4H7v-2c0-2.3 2-2.3 2-2.3h6c2 0 2-2 2-2V4.7c0-2.7-5.1-2.7-5.1-2.7zm-2.4 1.7a.8.8 0 110 1.6.8.8 0 010-1.6z" fill="#38bdf8" />
            <path d="M12.1 22c3.1 0 2.9-1.3 2.9-1.3V19h-6v-1h8.3s3.7.4 3.7-3.7c0-4.1-2.5-4-2.5-4H17v2c0 2.3-2 2.3-2 2.3H9c-2 0-2 2-2 2v2.6c0 2.7 5.1 2.7 5.1 2.7zm2.4-1.7a.8.8 0 110-1.6.8.8 0 010 1.6z" fill="#facc15" />
          </svg>
        </span>
      );

    case 'rust':
      return (
        <span className={`tech-icon-wrapper tech-rust ${className}`} title="Rust Project" style={{ color: '#ea580c' }}>
          <Cpu size={size} strokeWidth={2.2} />
        </span>
      );

    case 'go':
      return (
        <span className={`tech-icon-wrapper tech-go ${className}`} title="Go Project" style={{ color: '#00add8', fontWeight: 800, fontFamily: 'monospace', fontSize: `${size}px`, lineHeight: 1 }}>
          Go
        </span>
      );

    case 'docker':
      return (
        <span className={`tech-icon-wrapper tech-docker ${className}`} title="Docker Project" style={{ color: '#0ea5e9' }}>
          <Box size={size} strokeWidth={2.2} />
        </span>
      );

    case 'git':
      return (
        <span className={`tech-icon-wrapper tech-git ${className}`} title="Git Repository" style={{ color: '#f97316' }}>
          <GitBranch size={size} strokeWidth={2.2} />
        </span>
      );

    case 'dotnet':
      return (
        <span className={`tech-icon-wrapper tech-dotnet ${className}`} title=".NET Project" style={{ color: '#8b5cf6' }}>
          <Layers size={size} strokeWidth={2.2} />
        </span>
      );

    case 'android':
      return (
        <span className={`tech-icon-wrapper tech-android ${className}`} title="Android Project" style={{ color: '#10b981' }}>
          <Smartphone size={size} strokeWidth={2.2} />
        </span>
      );

    case 'react-native':
    case 'flutter':
    case 'ios':
      return (
        <span className={`tech-icon-wrapper tech-mobile ${className}`} title="Mobile Project" style={{ color: '#38bdf8' }}>
          <Smartphone size={size} strokeWidth={2.2} />
        </span>
      );

    case 'cpp':
    case 'c':
      return (
        <span className={`tech-icon-wrapper tech-cpp ${className}`} title="C/C++ Project" style={{ color: '#60a5fa' }}>
          <Code size={size} strokeWidth={2.2} />
        </span>
      );

    case 'database':
    case 'sql':
      return (
        <span className={`tech-icon-wrapper tech-db ${className}`} title="Database" style={{ color: '#a78bfa' }}>
          <Database size={size} strokeWidth={2.2} />
        </span>
      );

    default:
      return (
        <span className={`tech-icon-wrapper tech-folder ${className}`} title="Project Folder" style={{ color: '#3b82f6' }}>
          <Folder size={size} strokeWidth={2} />
        </span>
      );
  }
};

export default TechIcon;
