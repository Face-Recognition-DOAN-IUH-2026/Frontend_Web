export interface TaskStatusResponse {
  task_id: string;
  status: "PENDING" | "SUCCESS" | "FAILURE" | "RETRY" | "STARTED" | "ERROR";
  result: TaskResult | null;
}

export interface LivenessBreakdown {
  lbp?: number;
  color?: number;
  noise?: number;
  fft?: number;
  multi_scale?: number;
  bbox?: number;
  insightface?: number;
}

export interface TaskResult {
  status: string;
  user_id?: string;
  verified?: boolean;
  score?: number;
  matches?: Array<{ user_id: string; score: number }>;
  liveness_score?: number;
  is_live?: boolean;
  breakdown?: LivenessBreakdown;
  error?: string;
  type?: string;
  access_token?: string;
  refresh_token?: string;
  detail?: string;
  patron_id?: string;
  student_code?: string;
  full_name?: string;
  access_type?: string;
}
