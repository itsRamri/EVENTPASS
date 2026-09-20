export type UserRole = 'manager' | 'guest' | 'scanner';

export type EventStatus = 'active' | 'draft' | 'completed';

export type GuestStatus = 'invited' | 'pending' | 'approved' | 'checkedin' | 'rejected' | 'blocked';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  mobile: string;
  role: UserRole;
  status: 'active' | 'disabled';
  avatar: string;
  college?: string;
  branch?: string;
  preferences?: {
    soundBeep?: boolean;
    vibration?: boolean;
    highPerfCam?: boolean;
    pushNotifs?: boolean;
    emailAlerts?: boolean;
    offlineSync?: boolean;
  };
}

export interface RequirementField {
  id: string;
  label: string;
  type: 
    | 'live_photo'
    | 'image_upload'
    | 'pdf_upload'
    | 'text' 
    | 'email' 
    | 'mobile' 
    | 'number' 
    | 'date' 
    | 'dropdown' 
    | 'radio' 
    | 'checkbox' 
    | 'address' 
    | 'college' 
    | 'branch' 
    | 'roll_number' 
    | 'profile_photo' 
    | 'id_card' 
    | 'custom_question';
  required: boolean;
  description?: string;
  options?: string[];
  validation?: string;
}

export interface EventDocument {
  id: string;
  name: string;
  size: string;
  uploadDate: string;
  type: 'pdf' | 'image' | 'doc';
  url: string;
}

export interface TokenSettings {
  totalLimit: number;
  tokensPerUser?: number; // Configurable token limit per user/guest (e.g. 15, 1, 5, etc.)
  tokenType: string;
  prefix: string;
  validity: string;
  autoGenerate: boolean;
  qrEnabled: boolean;
}

export interface EventItem {
  id: string;
  name: string;
  tagline: string;
  status: EventStatus;
  coverImage: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  venue: string;
  location: string;
  organizer: string;
  creatorId?: string;
  creatorEmail?: string;
  creatorMobile?: string;
  tokenSettings: TokenSettings;
  requirements: RequirementField[];
  staffRequirements?: RequirementField[];
  documents: EventDocument[];
}

export interface GuestDocument {
  name: string;
  type: 'pdf' | 'image' | 'doc';
  size?: string;
  url?: string;
}

export interface TokenItem {
  tokenCode: string;
  index: number;
  status: 'valid' | 'used';
  checkInTime?: string | null;
  scannedBy?: string | null;
}

export interface GuestRegistration {
  id: string;
  userId?: string;
  eventId: string;
  name: string;
  email: string;
  mobile: string;
  avatar: string;
  college?: string;
  branch?: string;
  rollNo?: string;
  status: GuestStatus;
  token: string;
  tokens?: string[]; // Array of unique tokens assigned to this user (e.g. 15 tokens)
  tokenList?: TokenItem[]; // Detailed individual status for each token
  tokenCount?: number; // Total number of tokens allocated to this user
  usedTokens?: number; // Count of tokens already scanned/admitted
  passId: string;
  registrationDate: string;
  checkInTime: string | null;
  scanTimestamp?: string | null;
  scannedBy?: string | null;
  scannedByEmail?: string | null;
  answers: Record<string, any>;
  documents: GuestDocument[];
}


export interface StaffPermissions {
  canScan: boolean;
  canCheckIn: boolean;
  canViewDetails: boolean;
  canApprove: boolean;
  canReject: boolean;
}

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  phone?: string;
  designation?: string;
  role: 'scanner';
  status: 'active' | 'disabled';
  isProfileComplete?: boolean;
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  document?: GuestDocument;
  documents?: GuestDocument[];
  answers?: Record<string, any>;
  assignedEventId: string;
  permissions: StaffPermissions;
  requestedAt?: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'info' | 'warning' | 'error';
  timestamp: string;
  read: boolean;
  recipientUserId?: string;
  recipientEmail?: string;
  recipientPhone?: string;
  recipientRole?: 'guest' | 'staff' | 'manager' | 'all';
}

export interface ScanHistoryRecord {
  id: string;
  guestName: string;
  token: string;
  passId?: string;
  eventName: string;
  status: GuestStatus | 'invalid';
  timestamp: string;
  scannerStaff: string;
}

export interface CheckinAuditRecord {
  id: string;
  guestId: string;
  guestName: string;
  eventId: string;
  eventName: string;
  timestamp: string;
  isoTimestamp: string;
  scannedBy: string;
  token: string;
  passId: string;
  avatar?: string;
  college?: string;
  branch?: string;
  rollNo?: string;
  gate?: string;
  status: 'verified' | 'checkedin';
}

