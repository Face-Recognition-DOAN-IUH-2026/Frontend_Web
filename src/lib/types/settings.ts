export interface SystemConfigEntry {
  id: string;
  category: string;
  config_key: string;
  config_value: any;
  label: string;
  description: string | null;
  is_encrypted: boolean;
  updated_at: string;
  updated_by: string | null;
}

export interface SettingsByCategory {
  [category: string]: SystemConfigEntry[];
}
