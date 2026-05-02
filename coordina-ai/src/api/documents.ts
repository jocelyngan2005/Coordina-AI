import { mockStore } from './mockStore';
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
    return mockStore.documents.upload(projectId, file, documentType);
  },

  listByProject: async (projectId: string): Promise<BackendDocument[]> => {
    return mockStore.documents.listByProject(projectId);
  },
};
