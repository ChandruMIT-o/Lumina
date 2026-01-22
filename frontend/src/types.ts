export type VariableType = 'text' | 'email' | 'date' | 'number' | 'select';

export interface VariableConfig {
  key: string;
  type: VariableType;
  label: string;
  options?: string[]; // Comma separated for input, array for usage
  required?: boolean;
}

export interface AppConfig {
    delimiterStart: string;
    delimiterEnd: string;
}
