// Document Modal Types for Construction Management

export type DocumentStatus = 'approved' | 'pending' | 'revision' | 'submitted' | 'overdue';

export interface Document {
  id: string;
  name: string;
  type: 'pdf' | 'dwg' | 'xlsx' | 'docx' | 'jpg' | 'png';
  size: string;
  uploadedAt: Date;
  uploadedBy: string;
  status: DocumentStatus;
}

export interface SubFolder {
  id: string;
  name: string;
  icon?: string;
  documents: Document[];
}

export interface Folder {
  id: string;
  name: string;
  icon: string;
  subFolders?: SubFolder[];
  documents?: Document[];
  count: number;
}

export interface DocumentCategory {
  id: string;
  name: string;
  csiCodes: string[];
  folders: Folder[];
}

export interface AttentionItem {
  id: string;
  type: 'missing' | 'overdue' | 'revision';
  message: string;
  severity: 'warning' | 'error' | 'info';
  relatedFolder?: string;
}

export type ModalVariant = 'accordion' | 'tabbed' | 'split' | 'drilldown' | 'smart';

export interface DocumentModalProps {
  category: DocumentCategory;
  onClose?: () => void;
  onDocumentSelect?: (doc: Document) => void;
  onUpload?: (folderId: string, subFolderId?: string) => void;
}

// Enhanced props for the main document modal with task context
export interface DocumentModalWithTaskProps extends DocumentModalProps {
  feature: {
    id: string;
    name: string;
    startAt?: Date | null;
    endAt?: Date | null;
    status: { id: string; name: string; color: string };
    coverImage?: string;
    progress?: number;
  };
  group: string;
  onCoverImageChange?: (featureId: string, coverImage: string | undefined) => void;
  onDelete?: (featureId: string) => void;
}
