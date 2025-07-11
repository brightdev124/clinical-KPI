import { supabase } from '../lib/supabase';

export interface UploadedFile {
  name: string;
  url: string;
  size: number;
  type: string;
}

export class FileUploadService {
  private static readonly BUCKET_NAME = 'review-files';
  private static readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private static readonly ALLOWED_TYPES = [
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/jpg',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ];

  /**
   * Upload multiple files to Supabase Storage
   */
  static async uploadFiles(
    files: File[],
    clinicianId: string,
    kpiId: string,
    reviewId?: string
  ): Promise<UploadedFile[]> {
    const uploadedFiles: UploadedFile[] = [];
    
    for (const file of files) {
      try {
        // Validate file
        this.validateFile(file);
        
        // Generate unique filename
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(2, 15);
        const fileExtension = file.name.split('.').pop();
        const fileName = `${clinicianId}/${kpiId}/${timestamp}_${randomString}.${fileExtension}`;
        
        // Upload file to Supabase Storage
        const { data, error } = await supabase.storage
          .from(this.BUCKET_NAME)
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (error) {
          throw new Error(`Failed to upload ${file.name}: ${error.message}`);
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from(this.BUCKET_NAME)
          .getPublicUrl(fileName);

        uploadedFiles.push({
          name: file.name,
          url: urlData.publicUrl,
          size: file.size,
          type: file.type
        });

      } catch (error) {
        console.error(`Error uploading file ${file.name}:`, error);
        throw error;
      }
    }

    return uploadedFiles;
  }

  /**
   * Delete a file from Supabase Storage
   */
  static async deleteFile(fileUrl: string): Promise<void> {
    try {
      // Extract file path from URL
      const url = new URL(fileUrl);
      const pathParts = url.pathname.split('/');
      const fileName = pathParts.slice(-3).join('/'); // Get clinicianId/kpiId/filename

      const { error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .remove([fileName]);

      if (error) {
        throw new Error(`Failed to delete file: ${error.message}`);
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
  }

  /**
   * Validate file before upload
   */
  private static validateFile(file: File): void {
    // Check file size
    if (file.size > this.MAX_FILE_SIZE) {
      throw new Error(`File ${file.name} is too large. Maximum size is 10MB.`);
    }

    // Check file type
    if (!this.ALLOWED_TYPES.includes(file.type)) {
      throw new Error(`File type ${file.type} is not allowed. Allowed types: PDF, PNG, JPG, DOC, DOCX, TXT.`);
    }
  }

  /**
   * Get file info from URL
   */
  static getFileInfoFromUrl(url: string): { name: string; type: string } {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/');
      const fileName = pathParts[pathParts.length - 1];
      const originalName = fileName.split('_').slice(1).join('_'); // Remove timestamp prefix
      const extension = originalName.split('.').pop()?.toLowerCase();
      
      let type = 'application/octet-stream';
      switch (extension) {
        case 'pdf':
          type = 'application/pdf';
          break;
        case 'png':
          type = 'image/png';
          break;
        case 'jpg':
        case 'jpeg':
          type = 'image/jpeg';
          break;
        case 'doc':
          type = 'application/msword';
          break;
        case 'docx':
          type = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
          break;
        case 'txt':
          type = 'text/plain';
          break;
      }

      return {
        name: originalName,
        type
      };
    } catch (error) {
      return {
        name: 'Unknown file',
        type: 'application/octet-stream'
      };
    }
  }

  /**
   * Format file size for display
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

export default FileUploadService;