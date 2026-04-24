import { BASE_URL } from './client';
import type { BackendDocument } from './types';

export const documentsApi = {
  /**
   * Upload a file to a project. Uses multipart/form-data (no Content-Type
   * header — browser sets it automatically with the correct boundary).
   */
  upload: async (
    projectId: string,
    file: File,
    documentType: string,
  ): Promise<BackendDocument> => {
    const form = new FormData();
    form.append('file', file);

    const url = `${BASE_URL}/api/documents/${projectId}/upload?document_type=${encodeURIComponent(documentType)}`;
    const res = await fetch(url, { method: 'POST', body: form });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(
        String((err as { detail?: string }).detail ?? 'Upload failed'),
      );
    }
    return res.json() as Promise<BackendDocument>;
  },

  listByProject: async (projectId: string): Promise<BackendDocument[]> => {
    const res = await fetch(
      `${BASE_URL}/api/documents/project/${projectId}`,
    );
    return res.json() as Promise<BackendDocument[]>;
  },
};
