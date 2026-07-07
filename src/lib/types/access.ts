import type { PatronPublic } from "./patron";

export interface AccessLogPublic {
  id: string;
  patron_id: string | null;
  patron_name: string | null;
  student_code: string | null;
  access_type: string;
  verify_method: string;
  confidence: number | null;
  camera_id: string;
  access_time: string;
  status: string;
  image_url?: string | null;
  event_id?: string | null;
  source?: string | null;
}

export interface AccessLogList {
  items: AccessLogPublic[];
  total: number;
}

export interface ActivePatron {
  id: string;
  full_name: string;
  student_code: string;
  entered_at: string;
  camera_id: string;
  image_url: string | null;
  confidence: number | null;
}

export interface AccessFrequencyDay {
  date: string;
  entry: number;
  exit: number;
}

export interface AccessFrequencyResponse {
  daily: AccessFrequencyDay[];
}

export interface StatsResponse {
  total_patrons: number;
  active_patrons: number;
  today_entries: number;
  today_exits: number;
}

export interface KioskResult {
  success: boolean;
  message: string;
  patron: PatronPublic | null;
  job_id: string | null;
  confidence?: number;
}

export interface CameraStatus {
  camera_id: string;
  url: string;
  running: boolean;
  connected: boolean;
  frames_processed: number;
  last_frame_time: string | null;
  last_error: string | null;
  retry_count: number;
  next_retry_in: number | null;
}

export interface CameraEvent {
  camera_id: string;
  status: "granted" | "no_match" | "expired" | "spoof" | "error";
  patron_id?: string;
  full_name?: string;
  student_code?: string;
  score?: number;
  access_type?: string;
  is_live?: boolean;
  liveness_score?: number;
  error?: string;
  bbox?: [number, number, number, number];
  landmarks?: [number, number][];
}

export interface FaceResultEvent {
  event_id: string;
  event_type: "face_result";
  task_id: string;
  process_type: "face_recognition" | "liveness_check" | "verify" | "identify";
  status: "SUCCESS" | "FAILURE";
  result?: Record<string, unknown>;
  user_id?: string;
  camera_id?: string;
  occurred_at: string;
  source: string;
}
