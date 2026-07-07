export interface PatronPublic {
  id: string;
  full_name: string;
  student_code: string;
  class_name: string | null;
  identity_number: string | null;
  email: string | null;
  phone: string | null;
  card_number: string;
  issue_date: string | null;
  membership_expiry: string;
  status: string;
  current_status: string | null;
  created_at: string;
  updated_at: string;
  has_face: boolean;
  course: string | null;
  permanent_address: string | null;
}

export interface PatronCreate {
  full_name: string;
  student_code: string;
  class_name?: string;
  membership_expiry: string;
  issue_date?: string;
  course?: string;
  permanent_address?: string;
  identity_number?: string;
  email?: string;
  phone?: string;
}

export interface PatronUpdate {
  full_name?: string;
  class_name?: string;
  identity_number?: string;
  email?: string;
  phone?: string;
  membership_expiry?: string;
  status?: string;
  course?: string;
  permanent_address?: string;
}

export interface PatronLookupResult {
  exists: boolean;
  patron: PatronPublic | null;
  has_face: boolean;
  is_expired: boolean;
  is_locked: boolean;
}
