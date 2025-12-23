'use client';

import { useState, memo, useCallback } from 'react';
import { ChevronRight, ChevronDown, Upload, Download, FileText, Image, File, FolderPlus, MoreVertical, Trash2, ImagePlus, X, CalendarDays, Clock } from 'lucide-react';
import type { DocumentModalWithTaskProps, Folder, SubFolder, Document } from '../types';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';

const statusColors: Record<string, { bg: string; text: string }> = {
  approved: { bg: 'bg-green-500/10', text: 'text-green-500' },
  pending: { bg: 'bg-yellow-500/10', text: 'text-yellow-500' },
  revision: { bg: 'bg-orange-500/10', text: 'text-orange-500' },
  submitted: { bg: 'bg-blue-500/10', text: 'text-blue-500' },
  overdue: { bg: 'bg-red-500/10', text: 'text-red-500' },
};

const getFileIcon = (type: Document['type'], size: 'sm' | 'lg' = 'sm') => {
  const sizeClass = size === 'lg' ? 'w-6 h-6' : 'w-4 h-4';
  switch (type) {
    case 'pdf':
      return <FileText className={`${sizeClass} text-red-400`} />;
    case 'jpg':
    case 'png':
      return <Image className={`${sizeClass} text-blue-400`} />;
    case 'dwg':
      return <File className={`${sizeClass} text-purple-400`} />;
    default:
      return <File className={`${sizeClass} text-gray-400`} />;
  }
};

const formatDate = (date: Date) => {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
};

const getDuration = (start: Date, end: Date) => {
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays === 1 ? '1 day' : `${diffDays} days`;
};

interface TreeItemProps {
  label: string;
  icon?: React.ReactNode;
  count?: number;
  isSelected?: boolean;
  isExpanded?: boolean;
  hasChildren?: boolean;
  depth?: number;
  onToggle?: () => void;
  onSelect?: () => void;
}

const TreeItem = memo(function TreeItem({
  label,
  icon,
  count,
  isSelected,
  isExpanded,
  hasChildren,
  depth = 0,
  onToggle,
  onSelect,
}: TreeItemProps) {
  return (
    <button
      onClick={hasChildren ? onToggle : onSelect}
      className={`w-full flex items-center gap-1.5 py-1.5 px-2 text-left hover:bg-gray-100 dark:hover:bg-[var(--bg-hover)] rounded transition-colors ${
        isSelected ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600' : ''
      }`}
      style={{ paddingLeft: `${8 + depth * 12}px` }}
    >
      {hasChildren ? (
        isExpanded ? (
          <ChevronDown className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
        )
      ) : (
        <span className="w-3.5" />
      )}
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <span className={`flex-1 text-xs truncate ${isSelected ? 'font-medium' : 'text-gray-700 dark:text-[var(--text-secondary)]'}`}>
        {label}
      </span>
      {count !== undefined && (
        <span className="text-[10px] text-gray-400">{count}</span>
      )}
    </button>
  );
});

interface PreviewPanelProps {
  title: string;
  documents: Document[];
  onDocumentSelect?: (doc: Document) => void;
  onUpload?: () => void;
}

const PreviewPanel = memo(function PreviewPanel({
  title,
  documents,
  onDocumentSelect,
  onUpload,
}: PreviewPanelProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Preview Header */}
      <div className="px-3 py-2 border-b border-gray-100 dark:border-[var(--border-color)]">
        <h4 className="text-sm font-medium text-gray-900 dark:text-[var(--text-primary)]">
          {title}
        </h4>
        <p className="text-[10px] text-gray-400 mt-0.5">
          {documents.length} document{documents.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Document Grid */}
      <div className="flex-1 overflow-y-auto p-2">
        <div className="grid grid-cols-2 gap-2">
          {documents.map((doc) => (
            <button
              key={doc.id}
              onClick={() => onDocumentSelect?.(doc)}
              className="flex flex-col items-center p-2 rounded-lg border border-gray-100 dark:border-[var(--border-color)] hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all group"
            >
              <div className="w-10 h-10 rounded bg-gray-50 dark:bg-[var(--bg-input)] flex items-center justify-center mb-1.5">
                {getFileIcon(doc.type, 'lg')}
              </div>
              <span className="text-[10px] text-gray-600 dark:text-[var(--text-secondary)] text-center line-clamp-2 leading-tight w-full">
                {doc.name.split('.')[0]}
              </span>
              <span className="text-[9px] text-gray-400 mt-0.5">.{doc.type}</span>
              <span className={`text-[9px] px-1.5 py-0.5 rounded mt-1 ${statusColors[doc.status]?.bg ?? 'bg-gray-500/10'} ${statusColors[doc.status]?.text ?? 'text-gray-500'}`}>
                {doc.status}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="px-2 py-2 border-t border-gray-100 dark:border-[var(--border-color)] flex gap-2">
        <button
          onClick={onUpload}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded text-xs transition-colors"
        >
          <Upload className="w-3.5 h-3.5" />
          Upload
        </button>
        <button className="flex items-center justify-center gap-1.5 py-1.5 px-3 bg-gray-100 dark:bg-[var(--bg-input)] hover:bg-gray-200 dark:hover:bg-[var(--bg-hover)] text-gray-600 dark:text-[var(--text-secondary)] rounded text-xs transition-colors">
          <Download className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
});

interface TaskHeaderProps {
  feature: DocumentModalWithTaskProps['feature'];
  group: string;
  onCoverImageChange?: (featureId: string, coverImage: string | undefined) => void;
  onDelete?: (featureId: string) => void;
}

const TaskHeader = memo(function TaskHeader({
  feature,
  group,
  onCoverImageChange,
  onDelete,
}: TaskHeaderProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleCoverImageChange = useCallback((imageUrl: string | undefined) => {
    onCoverImageChange?.(feature.id, imageUrl);
  }, [feature.id, onCoverImageChange]);

  const handleDelete = useCallback(() => {
    onDelete?.(feature.id);
  }, [feature.id, onDelete]);

  const handleFileDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => handleCoverImageChange(reader.result as string);
      reader.readAsDataURL(file);
    }
  }, [handleCoverImageChange]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => handleCoverImageChange(reader.result as string);
      reader.readAsDataURL(file);
    }
  }, [handleCoverImageChange]);

  // Calculate progress based on current date
  const calculateProgress = () => {
    const now = new Date();
    const start = feature.startAt;
    const end = feature.endAt;

    if (!start || !end) return 0;

    if (now < start) return 0;
    if (now > end) return 100;

    const total = end.getTime() - start.getTime();
    const elapsed = now.getTime() - start.getTime();
    return Math.round((elapsed / total) * 100);
  };

  const progress = feature.progress ?? calculateProgress();

  return (
    <div className="border-b border-gray-100 dark:border-[var(--border-color)]">
      <div className="flex gap-3 p-3">
        {/* Cover Image */}
        {feature.coverImage ? (
          <div className="relative group flex-shrink-0">
            <img
              src={feature.coverImage}
              alt="Cover"
              className="w-[100px] h-[100px] object-cover rounded-lg"
            />
            <button
              type="button"
              onClick={() => handleCoverImageChange(undefined)}
              className="absolute top-1 right-1 p-0.5 bg-black/50 hover:bg-black/70 rounded opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-3 h-3 text-white" />
            </button>
          </div>
        ) : (
          <div
            className={`
              relative w-[100px] h-[100px] flex-shrink-0 rounded-lg border border-dashed transition-all cursor-pointer
              ${isDragging
                ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-[var(--bg-input)]'
              }
            `}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleFileDrop}
            onClick={() => document.getElementById(`cover-input-modal-${feature.id}`)?.click()}
          >
            <input
              id={`cover-input-modal-${feature.id}`}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileSelect}
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
              <ImagePlus className="w-5 h-5 text-gray-400" />
              <span className="text-[10px] text-gray-400">Add cover</span>
            </div>
          </div>
        )}

        {/* Task Info */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* Title + Menu */}
          <div className="flex items-start gap-1.5">
            <h3 className="flex-1 font-semibold text-[14px] text-gray-900 dark:text-[var(--text-primary)] leading-tight line-clamp-2">
              {feature.name}
            </h3>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="p-0.5 hover:bg-gray-100 dark:hover:bg-[var(--bg-hover)] rounded transition-colors flex-shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="w-3.5 h-3.5 text-gray-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" sideOffset={4}>
                <DropdownMenuItem destructive onClick={handleDelete}>
                  <Trash2 className="w-4 h-4" />
                  Delete task
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Status + Group */}
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            <span
              className="px-1.5 py-0.5 rounded text-[10px] font-semibold flex-shrink-0"
              style={{
                backgroundColor: `${feature.status.color}15`,
                color: feature.status.color,
              }}
            >
              {feature.status.name}
            </span>
            <span className="text-[10px] text-gray-400 dark:text-gray-500 truncate">
              {group}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="mt-auto pt-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-gray-400 dark:text-gray-500">Progress</span>
              <span
                className="text-[10px] font-bold"
                style={{ color: feature.status.color }}
              >
                {progress}%
              </span>
            </div>
            <div className="h-1 bg-gray-100 dark:bg-[var(--bg-input)] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500 ease-out"
                style={{
                  width: `${progress}%`,
                  backgroundColor: feature.status.color,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Date Footer */}
      {feature.startAt && feature.endAt && (
        <div className="px-3 py-2 border-t border-gray-100 dark:border-[var(--border-color)] bg-gray-50/50 dark:bg-[var(--bg-input)]/30">
          <div className="flex items-center gap-3 text-[11px]">
            <div className="flex items-center gap-1.5 text-gray-500 dark:text-[var(--text-secondary)]">
              <CalendarDays className="w-3 h-3 flex-shrink-0" />
              <span>{formatDate(feature.startAt)} – {formatDate(feature.endAt)}</span>
            </div>
            <div className="flex items-center gap-1.5 text-gray-400 dark:text-gray-500">
              <Clock className="w-3 h-3 flex-shrink-0" />
              <span>{getDuration(feature.startAt, feature.endAt)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export const SplitViewModal = memo(function SplitViewModal({
  category,
  feature,
  group,
  onDocumentSelect,
  onUpload,
  onCoverImageChange,
  onDelete,
}: DocumentModalWithTaskProps) {
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
    submittals: true,
  });
  const [selectedItem, setSelectedItem] = useState<{
    type: 'folder' | 'subfolder';
    folder: Folder;
    subFolder?: SubFolder;
  } | null>(null);

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => ({ ...prev, [folderId]: !prev[folderId] }));
  };

  const selectFolder = (folder: Folder) => {
    setSelectedItem({ type: 'folder', folder });
  };

  const selectSubFolder = (folder: Folder, subFolder: SubFolder) => {
    setSelectedItem({ type: 'subfolder', folder, subFolder });
  };

  const getSelectedDocuments = (): Document[] => {
    if (!selectedItem) return [];
    if (selectedItem.type === 'subfolder' && selectedItem.subFolder) {
      return selectedItem.subFolder.documents;
    }
    if (selectedItem.folder.documents) {
      return selectedItem.folder.documents;
    }
    return [];
  };

  const getSelectedTitle = (): string => {
    if (!selectedItem) return 'Select a folder';
    if (selectedItem.type === 'subfolder' && selectedItem.subFolder) {
      return selectedItem.subFolder.name;
    }
    return selectedItem.folder.name;
  };

  return (
    <div className="w-[520px] flex flex-col bg-white dark:bg-[var(--bg-card)] rounded-2xl overflow-hidden">
      {/* Task Header with Cover Image */}
      <TaskHeader
        feature={feature}
        group={group}
        onCoverImageChange={onCoverImageChange}
        onDelete={onDelete}
      />

      {/* Split View Content */}
      <div className="flex h-[320px]">
        {/* Left Panel - Tree */}
        <div className="w-[200px] border-r border-gray-100 dark:border-[var(--border-color)] flex flex-col">
          <div className="px-3 py-2 border-b border-gray-100 dark:border-[var(--border-color)]">
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
              Folders
            </span>
          </div>
          <div className="flex-1 overflow-y-auto py-1">
            {category.folders.map((folder) => (
              <div key={folder.id}>
                <TreeItem
                  label={folder.name}
                  icon={<span className="text-sm">{folder.icon}</span>}
                  count={folder.count}
                  hasChildren={!!folder.subFolders?.length}
                  isExpanded={expandedFolders[folder.id]}
                  isSelected={selectedItem?.folder.id === folder.id && selectedItem.type === 'folder'}
                  onToggle={() => toggleFolder(folder.id)}
                  onSelect={() => selectFolder(folder)}
                />
                {expandedFolders[folder.id] && folder.subFolders?.map((subFolder) => (
                  <TreeItem
                    key={subFolder.id}
                    label={subFolder.name}
                    icon={<span className="text-xs">📄</span>}
                    count={subFolder.documents.length}
                    depth={1}
                    isSelected={selectedItem?.subFolder?.id === subFolder.id}
                    onSelect={() => selectSubFolder(folder, subFolder)}
                  />
                ))}
              </div>
            ))}
          </div>
          <div className="px-2 py-2 border-t border-gray-100 dark:border-[var(--border-color)]">
            <button className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-[var(--bg-hover)] rounded transition-colors">
              <FolderPlus className="w-3.5 h-3.5" />
              New Folder
            </button>
          </div>
        </div>

        {/* Right Panel - Preview */}
        <div className="flex-1 bg-gray-50/30 dark:bg-[var(--bg-input)]/20">
          {selectedItem ? (
            <PreviewPanel
              title={getSelectedTitle()}
              documents={getSelectedDocuments()}
              onDocumentSelect={onDocumentSelect}
              onUpload={() => onUpload?.(selectedItem.folder.id, selectedItem.subFolder?.id)}
            />
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
              <span className="text-3xl mb-2">📂</span>
              <span className="text-sm">Select a folder to view documents</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

export default SplitViewModal;
