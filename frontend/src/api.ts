import axios from 'axios';

const API_URL = 'http://localhost:8000/api';

import type { VariableConfig } from './types';

export interface UploadResponse {
  file_id: string;
  filename: string;
  variables: VariableConfig[];
}

export interface PreviewResponse {
  images: string[];
}

export const uploadTemplate = async (file: File, delimiters?: { start: string; end: string }) => {
  const formData = new FormData();
  formData.append('file', file);
  if (delimiters) {
      formData.append('delimiter_start', delimiters.start);
      formData.append('delimiter_end', delimiters.end);
  }
  const response = await axios.post<UploadResponse>(`${API_URL}/upload`, formData);
  return response.data;
};

export const getPreview = async (fileId: string, filename: string, data: Record<string, string>, delimiters?: { start: string; end: string }) => {
    const formData = new FormData();
    formData.append('file_id', fileId);
    formData.append('filename', filename);
    formData.append('data', JSON.stringify(data));
    if (delimiters) {
        formData.append('delimiter_start', delimiters.start);
        formData.append('delimiter_end', delimiters.end);
    }
    const response = await axios.post<PreviewResponse>(`${API_URL}/preview`, formData);
    return response.data;
}

export const exportDocument = async (fileId: string, filename: string, data: Record<string, string>, format: 'docx' | 'pdf', delimiters?: { start: string; end: string }) => {
    const formData = new FormData();
    formData.append('file_id', fileId);
    formData.append('filename', filename);
    formData.append('data', JSON.stringify(data));
    formData.append('format', format);
    if (delimiters) {
        formData.append('delimiter_start', delimiters.start);
        formData.append('delimiter_end', delimiters.end);
    }
    const response = await axios.post(`${API_URL}/export`, formData, {
        responseType: 'blob', // Important for file downloads
    });
    return response.data;
}
