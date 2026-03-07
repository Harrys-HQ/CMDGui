import React, { useState, useEffect } from 'react';
import { FileEntry } from '../types';

interface FileExplorerProps {
  rootPath: string;
  onSelectFolder: (path: string) => void;
}

const FileItem: React.FC<{
  entry: FileEntry;
  depth: number;
  onSelectFolder: (path: string) => void;
}> = ({ entry, depth, onSelectFolder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [children, setChildren] = useState<FileEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const toggleOpen = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (entry.isDirectory) {
      if (!isOpen && children.length === 0) {
        setIsLoading(true);
        const files = await window.electron.listDirectory(entry.path);
        // Sort: directories first, then alphabetical
        setChildren(
          files.sort((a, b) => {
            if (a.isDirectory === b.isDirectory) return a.name.localeCompare(b.name);
            return a.isDirectory ? -1 : 1;
          })
        );
        setIsLoading(false);
      }
      setIsOpen(!isOpen);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div
        onClick={toggleOpen}
        onDoubleClick={() => entry.isDirectory && onSelectFolder(entry.path)}
        style={{
          padding: '4px 8px',
          paddingLeft: `${depth * 12 + 8}px`,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '12px',
          color: '#ccc',
          transition: 'background 0.1s',
        }}
        className="file-explorer-item"
        title={entry.path}
      >
        <span style={{ fontSize: '10px', width: '12px', opacity: entry.isDirectory ? 1 : 0 }}>
          {isOpen ? '▼' : '▶'}
        </span>
        <span>{entry.isDirectory ? '📁' : '📄'}</span>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {entry.name}
        </span>
        {isLoading && <span style={{ fontSize: '10px', color: '#666' }}>...</span>}
      </div>
      {isOpen &&
        children.map((child) => (
          <FileItem
            key={child.path}
            entry={child}
            depth={depth + 1}
            onSelectFolder={onSelectFolder}
          />
        ))}
    </div>
  );
};

const FileExplorer: React.FC<FileExplorerProps> = ({ rootPath, onSelectFolder }) => {
  const [files, setFiles] = useState<FileEntry[]>([]);

  useEffect(() => {
    const loadRoot = async () => {
      const result = await window.electron.listDirectory(rootPath);
      setFiles(
        result.sort((a, b) => {
          if (a.isDirectory === b.isDirectory) return a.name.localeCompare(b.name);
          return a.isDirectory ? -1 : 1;
        })
      );
    };
    loadRoot();
  }, [rootPath]);

  return (
    <div style={{ background: '#1e1e1e', borderTop: '1px solid #333', paddingBottom: '4px' }}>
      {files.map((file) => (
        <FileItem key={file.path} entry={file} depth={0} onSelectFolder={onSelectFolder} />
      ))}
    </div>
  );
};

export default FileExplorer;
