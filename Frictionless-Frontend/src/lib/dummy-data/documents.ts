export type DummyDocumentCategory = 'pitch_deck' | 'financial_model' | 'cap_table' | 'legal' | 'data_room' | 'data_room_doc' | 'other';

export type DummyValidationStatus = 'pending' | 'valid' | 'invalid' | 'expired';

export interface DummyDocument {
  id: string;
  name: string;
  category: DummyDocumentCategory;
  file_type: string;
  file_size: number;
  uploaded_at: string;
  uploaded_by: string;
  validation_status: DummyValidationStatus;
  url?: string;
}

export const dummyDocuments: DummyDocument[] = [
  {
    id: 'doc-1',
    name: 'NeuralPay Pitch Deck Q1 2025.pdf',
    category: 'pitch_deck',
    file_type: 'application/pdf',
    file_size: 2450000,
    uploaded_at: '2025-02-08T10:30:00Z',
    uploaded_by: 'Sarah Chen',
    validation_status: 'valid',
  },
  {
    id: 'doc-2',
    name: 'NeuralPay Financial Model v3.xlsx',
    category: 'financial_model',
    file_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    file_size: 890000,
    uploaded_at: '2025-02-07T14:20:00Z',
    uploaded_by: 'Sarah Chen',
    validation_status: 'valid',
  },
  {
    id: 'doc-3',
    name: 'Cap Table - February 2025.csv',
    category: 'cap_table',
    file_type: 'text/csv',
    file_size: 45000,
    uploaded_at: '2025-02-05T09:15:00Z',
    uploaded_by: 'Sarah Chen',
    validation_status: 'valid',
  },
  {
    id: 'doc-4',
    name: 'Certificate of Incorporation.pdf',
    category: 'legal',
    file_type: 'application/pdf',
    file_size: 120000,
    uploaded_at: '2025-01-20T11:00:00Z',
    uploaded_by: 'Marcus Webb',
    validation_status: 'valid',
  },
  {
    id: 'doc-5',
    name: 'Bylaws - NeuralPay Inc.pdf',
    category: 'legal',
    file_type: 'application/pdf',
    file_size: 180000,
    uploaded_at: '2025-01-20T11:05:00Z',
    uploaded_by: 'Marcus Webb',
    validation_status: 'valid',
  },
  {
    id: 'doc-6',
    name: 'SAFE Agreement - Series Seed.pdf',
    category: 'legal',
    file_type: 'application/pdf',
    file_size: 220000,
    uploaded_at: '2024-06-15T16:00:00Z',
    uploaded_by: 'Sarah Chen',
    validation_status: 'valid',
  },
  {
    id: 'doc-7',
    name: 'Data Room - Complete.zip',
    category: 'data_room',
    file_type: 'application/zip',
    file_size: 12500000,
    uploaded_at: '2025-02-09T08:45:00Z',
    uploaded_by: 'Sarah Chen',
    validation_status: 'valid',
  },
  {
    id: 'doc-8',
    name: 'Product Roadmap 2025.pdf',
    category: 'other',
    file_type: 'application/pdf',
    file_size: 340000,
    uploaded_at: '2025-02-01T13:30:00Z',
    uploaded_by: 'Marcus Webb',
    validation_status: 'valid',
  },
  {
    id: 'doc-9',
    name: 'SOC 2 Type II Report.pdf',
    category: 'legal',
    file_type: 'application/pdf',
    file_size: 2100000,
    uploaded_at: '2025-01-15T10:00:00Z',
    uploaded_by: 'Sarah Chen',
    validation_status: 'valid',
  },
  {
    id: 'doc-10',
    name: 'Customer Case Study - Acme Corp.pdf',
    category: 'other',
    file_type: 'application/pdf',
    file_size: 560000,
    uploaded_at: '2025-02-04T15:20:00Z',
    uploaded_by: 'Sarah Chen',
    validation_status: 'valid',
  },
  {
    id: 'doc-11',
    name: 'Pitch Deck - Old Version.pdf',
    category: 'pitch_deck',
    file_type: 'application/pdf',
    file_size: 2100000,
    uploaded_at: '2024-12-10T09:00:00Z',
    uploaded_by: 'Sarah Chen',
    validation_status: 'expired',
  },
  {
    id: 'doc-12',
    name: 'Q4 2024 Metrics Summary.xlsx',
    category: 'financial_model',
    file_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    file_size: 180000,
    uploaded_at: '2025-01-08T12:00:00Z',
    uploaded_by: 'Sarah Chen',
    validation_status: 'valid',
  },
  {
    id: 'doc-13',
    name: 'Employment Agreement Template.pdf',
    category: 'legal',
    file_type: 'application/pdf',
    file_size: 95000,
    uploaded_at: '2024-11-20T14:00:00Z',
    uploaded_by: 'Marcus Webb',
    validation_status: 'valid',
  },
  {
    id: 'doc-14',
    name: 'Investor Memo Draft.docx',
    category: 'other',
    file_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    file_size: 67000,
    uploaded_at: '2025-02-06T16:30:00Z',
    uploaded_by: 'Sarah Chen',
    validation_status: 'pending',
  },
  {
    id: 'doc-15',
    name: 'Unit Economics Deep Dive.pdf',
    category: 'financial_model',
    file_type: 'application/pdf',
    file_size: 420000,
    uploaded_at: '2025-02-03T11:00:00Z',
    uploaded_by: 'Sarah Chen',
    validation_status: 'valid',
  },
];
