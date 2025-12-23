import type { DocumentCategory, AttentionItem, Folder, SubFolder, Document } from './types';

export const earthworkCategory: DocumentCategory = {
  id: 'earthwork',
  name: 'Earthwork & Excavation',
  csiCodes: ['31 20 00 Earth Moving', '31 23 16 Excavation', '31 25 00 Erosion Control', '31 23 33 Trenching'],
  folders: [
    {
      id: 'rfi',
      name: 'RFI',
      icon: 'clipboard-list',
      count: 3,
      documents: [
        { id: 'rfi-001', name: 'RFI-001-Foundation-Depth.pdf', type: 'pdf', size: '245 KB', uploadedAt: new Date('2024-12-15'), uploadedBy: 'John Smith', status: 'approved' },
        { id: 'rfi-002', name: 'RFI-002-Soil-Condition.pdf', type: 'pdf', size: '312 KB', uploadedAt: new Date('2024-12-18'), uploadedBy: 'Sarah Chen', status: 'pending' },
        { id: 'rfi-003', name: 'RFI-003-Excavation-Limits.pdf', type: 'pdf', size: '189 KB', uploadedAt: new Date('2024-12-20'), uploadedBy: 'Mike Johnson', status: 'approved' },
      ],
    },
    {
      id: 'submittals',
      name: 'Submittals',
      icon: 'folder-open',
      count: 12,
      subFolders: [
        {
          id: 'product-data',
          name: 'Product Data',
          documents: [
            { id: 'pd-001', name: 'Geotextile-Spec-Sheet.pdf', type: 'pdf', size: '1.2 MB', uploadedAt: new Date('2024-12-10'), uploadedBy: 'John Smith', status: 'approved' },
            { id: 'pd-002', name: 'Erosion-Control-Blanket.pdf', type: 'pdf', size: '856 KB', uploadedAt: new Date('2024-12-12'), uploadedBy: 'Sarah Chen', status: 'approved' },
            { id: 'pd-003', name: 'Drainage-Pipe-Specs.pdf', type: 'pdf', size: '432 KB', uploadedAt: new Date('2024-12-14'), uploadedBy: 'Mike Johnson', status: 'pending' },
            { id: 'pd-004', name: 'Backfill-Material-Data.pdf', type: 'pdf', size: '567 KB', uploadedAt: new Date('2024-12-16'), uploadedBy: 'John Smith', status: 'approved' },
          ],
        },
        {
          id: 'shop-drawings',
          name: 'Shop Drawings',
          documents: [
            { id: 'sd-001', name: 'SD-001-Foundation-Plan.pdf', type: 'pdf', size: '2.4 MB', uploadedAt: new Date('2024-12-20'), uploadedBy: 'Sarah Chen', status: 'approved' },
            { id: 'sd-002', name: 'SD-002-Rebar-Schedule.dwg', type: 'dwg', size: '1.8 MB', uploadedAt: new Date('2024-12-21'), uploadedBy: 'Mike Johnson', status: 'pending' },
            { id: 'sd-003', name: 'SD-003-Excavation-Detail.pdf', type: 'pdf', size: '3.1 MB', uploadedAt: new Date('2024-12-22'), uploadedBy: 'John Smith', status: 'revision' },
            { id: 'sd-004', name: 'SD-004-Drainage-Layout.dwg', type: 'dwg', size: '2.2 MB', uploadedAt: new Date('2024-12-22'), uploadedBy: 'Sarah Chen', status: 'approved' },
            { id: 'sd-005', name: 'SD-005-Grading-Plan.pdf', type: 'pdf', size: '4.5 MB', uploadedAt: new Date('2024-12-23'), uploadedBy: 'Mike Johnson', status: 'submitted' },
          ],
        },
        {
          id: 'certs',
          name: 'Certs',
          documents: [
            { id: 'cert-001', name: 'Soil-Compaction-Test.pdf', type: 'pdf', size: '156 KB', uploadedAt: new Date('2024-12-19'), uploadedBy: 'Lab Tech', status: 'approved' },
            { id: 'cert-002', name: 'Material-Certification.pdf', type: 'pdf', size: '234 KB', uploadedAt: new Date('2024-12-20'), uploadedBy: 'Supplier', status: 'approved' },
            { id: 'cert-003', name: 'Equipment-Certification.pdf', type: 'pdf', size: '189 KB', uploadedAt: new Date('2024-12-21'), uploadedBy: 'Equipment Co', status: 'pending' },
          ],
        },
      ],
    },
    {
      id: 'change-orders',
      name: 'Change Orders',
      icon: 'file-pen',
      count: 2,
      documents: [
        { id: 'co-001', name: 'CO-001-Additional-Excavation.pdf', type: 'pdf', size: '445 KB', uploadedAt: new Date('2024-12-18'), uploadedBy: 'Project Manager', status: 'approved' },
        { id: 'co-002', name: 'CO-002-Soil-Remediation.pdf', type: 'pdf', size: '523 KB', uploadedAt: new Date('2024-12-21'), uploadedBy: 'Project Manager', status: 'pending' },
      ],
    },
    {
      id: 'photos',
      name: 'Photos',
      icon: 'camera',
      count: 28,
      subFolders: [
        {
          id: 'progress-photos',
          name: 'Progress Photos',
          documents: [
            { id: 'ph-001', name: 'Site-Prep-Day1.jpg', type: 'jpg', size: '2.1 MB', uploadedAt: new Date('2024-12-10'), uploadedBy: 'Field Super', status: 'approved' },
            { id: 'ph-002', name: 'Excavation-Start.jpg', type: 'jpg', size: '1.8 MB', uploadedAt: new Date('2024-12-12'), uploadedBy: 'Field Super', status: 'approved' },
            { id: 'ph-003', name: 'Foundation-Dig.jpg', type: 'jpg', size: '2.3 MB', uploadedAt: new Date('2024-12-15'), uploadedBy: 'Field Super', status: 'approved' },
          ],
        },
        {
          id: 'inspection-photos',
          name: 'Inspection Photos',
          documents: [
            { id: 'ip-001', name: 'Footing-Inspection.jpg', type: 'jpg', size: '1.9 MB', uploadedAt: new Date('2024-12-18'), uploadedBy: 'Inspector', status: 'approved' },
            { id: 'ip-002', name: 'Soil-Test-Location.jpg', type: 'jpg', size: '1.5 MB', uploadedAt: new Date('2024-12-19'), uploadedBy: 'Lab Tech', status: 'approved' },
          ],
        },
      ],
    },
    {
      id: 'inspections',
      name: 'Inspections',
      icon: 'clipboard-check',
      count: 6,
      subFolders: [
        {
          id: 'insp-product-data',
          name: 'Product Data',
          documents: [
            { id: 'ipd-001', name: 'Inspection-Checklist.pdf', type: 'pdf', size: '89 KB', uploadedAt: new Date('2024-12-17'), uploadedBy: 'QC Manager', status: 'approved' },
            { id: 'ipd-002', name: 'Code-Requirements.pdf', type: 'pdf', size: '234 KB', uploadedAt: new Date('2024-12-17'), uploadedBy: 'QC Manager', status: 'approved' },
          ],
        },
        {
          id: 'insp-shop-drawings',
          name: 'Shop Drawings',
          documents: [
            { id: 'isd-001', name: 'Inspection-Points-Plan.pdf', type: 'pdf', size: '1.1 MB', uploadedAt: new Date('2024-12-18'), uploadedBy: 'QC Manager', status: 'approved' },
          ],
        },
        {
          id: 'insp-certs',
          name: 'Certs',
          documents: [
            { id: 'ic-001', name: 'Foundation-Inspection-Cert.pdf', type: 'pdf', size: '156 KB', uploadedAt: new Date('2024-12-20'), uploadedBy: 'City Inspector', status: 'approved' },
            { id: 'ic-002', name: 'Soil-Bearing-Report.pdf', type: 'pdf', size: '312 KB', uploadedAt: new Date('2024-12-21'), uploadedBy: 'Geotech Engineer', status: 'pending' },
            { id: 'ic-003', name: 'Compaction-Report.pdf', type: 'pdf', size: '245 KB', uploadedAt: new Date('2024-12-22'), uploadedBy: 'Lab Tech', status: 'approved' },
          ],
        },
      ],
    },
  ],
};

export const attentionItems: AttentionItem[] = [
  {
    id: 'att-001',
    type: 'missing',
    message: 'Missing: Soil Compaction Test (Zone 3)',
    severity: 'error',
    relatedFolder: 'certs',
  },
  {
    id: 'att-002',
    type: 'overdue',
    message: 'Overdue: RFI-004 Response (5 days)',
    severity: 'warning',
    relatedFolder: 'rfi',
  },
  {
    id: 'att-003',
    type: 'revision',
    message: 'Revision Requested: SD-003-Excavation-Detail',
    severity: 'info',
    relatedFolder: 'shop-drawings',
  },
];

// Helper to safely access nested mock data (type assertions for noUncheckedIndexedAccess)
const submittalsFolder = earthworkCategory.folders[1] as Folder;
const rfiFolder = earthworkCategory.folders[0] as Folder;
const shopDrawings = (submittalsFolder.subFolders as SubFolder[])[1] as SubFolder;
const certs = (submittalsFolder.subFolders as SubFolder[])[2] as SubFolder;
const productData = (submittalsFolder.subFolders as SubFolder[])[0] as SubFolder;

export const recentUploads: Document[] = [
  shopDrawings.documents[4] as Document, // SD-005
  shopDrawings.documents[3] as Document, // SD-004
  certs.documents[2] as Document, // cert-003
  (rfiFolder.documents as Document[])[2] as Document, // RFI-003
  shopDrawings.documents[2] as Document, // SD-003
];

export const pendingReview: Document[] = [
  (rfiFolder.documents as Document[])[1] as Document, // RFI-002 pending
  productData.documents[2] as Document, // pd-003 pending
  shopDrawings.documents[1] as Document, // SD-002 pending
];
