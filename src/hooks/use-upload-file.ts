import * as React from 'react';

import { toast } from 'sonner';

export type UploadedFile = {
  key: string;
  name: string;
  size: number;
  type: string;
  url: string;
};

interface UseUploadFileProps {
  onUploadComplete?: (file: UploadedFile) => void;
  onUploadError?: (error: unknown) => void;
}

/** Upload local : blob URL uniquement (pas de serveur UploadThing). */
export function useUploadFile({
  onUploadComplete,
  onUploadError,
}: UseUploadFileProps = {}) {
  const [uploadedFile, setUploadedFile] = React.useState<UploadedFile>();
  const [uploadingFile, setUploadingFile] = React.useState<File>();
  const [progress, setProgress] = React.useState<number>(0);
  const [isUploading, setIsUploading] = React.useState(false);

  async function uploadFile(file: File) {
    setIsUploading(true);
    setUploadingFile(file);

    try {
      let p = 0;
      while (p < 100) {
        await new Promise((r) => setTimeout(r, 20));
        p += 8;
        setProgress(Math.min(p, 100));
      }

      const done: UploadedFile = {
        key: `local-${file.name}-${file.size}`,
        name: file.name,
        size: file.size,
        type: file.type,
        url: URL.createObjectURL(file),
      };

      setUploadedFile(done);
      onUploadComplete?.(done);
      return done;
    } catch (error) {
      toast.error('Impossible de charger le fichier.');
      onUploadError?.(error);
      throw error;
    } finally {
      setProgress(0);
      setIsUploading(false);
      setUploadingFile(undefined);
    }
  }

  return {
    isUploading,
    progress,
    uploadedFile,
    uploadFile,
    uploadingFile,
  };
}
