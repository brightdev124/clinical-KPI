# Supabase Storage Setup for File Uploads

## Required Setup Steps

### 1. Create Storage Bucket
In your Supabase dashboard, go to Storage and create a new bucket:
- Bucket name: `review-files`
- Make it public: ✅ Yes
- File size limit: 10MB
- Allowed MIME types: 
  - `application/pdf`
  - `image/png`
  - `image/jpeg`
  - `image/jpg`
  - `application/msword`
  - `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
  - `text/plain`

### 2. Set Storage Policies
In the Supabase SQL Editor, run these commands:

```sql
-- Allow public uploads to review-files bucket
CREATE POLICY "Allow public uploads to review-files bucket" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'review-files');

-- Allow public downloads from review-files bucket
CREATE POLICY "Allow public downloads from review-files bucket" ON storage.objects
FOR SELECT USING (bucket_id = 'review-files');

-- Allow public deletes from review-files bucket
CREATE POLICY "Allow public deletes from review-files bucket" ON storage.objects
FOR DELETE USING (bucket_id = 'review-files');
```

### 3. Update Database Schema
Make sure the `file_url` column exists in the `review_items` table:

```sql
-- Add file_url column if it doesn't exist
ALTER TABLE review_items ADD COLUMN IF NOT EXISTS file_url TEXT;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_review_items_file_url ON review_items(file_url);
```

## How It Works

1. **File Upload**: When a KPI is marked as "Not Met", users can upload supporting files
2. **Storage**: Files are stored in Supabase Storage bucket `review-files`
3. **Database**: The file URL is saved in the `file_url` column of the `review_items` table
4. **Organization**: Files are organized by clinician ID and KPI ID in the storage bucket
5. **Access**: Files can be viewed, downloaded, or deleted through the UI

## File Management Features

- **Upload Progress**: Shows upload status with spinner
- **File Preview**: Display file name, size, and type
- **View Files**: Click to open files in new tab
- **Delete Files**: Remove files from both storage and database
- **Existing Files**: Shows files from previous reviews
- **File Validation**: Checks file size (max 10MB) and type restrictions

## Supported File Types

- PDF documents (`.pdf`)
- Images (`.png`, `.jpg`, `.jpeg`)
- Word documents (`.doc`, `.docx`)
- Text files (`.txt`)

## Security

- Files are stored in a public bucket for easy access
- File paths include clinician and KPI IDs for organization
- Files are automatically cleaned up when reviews are deleted
- File size and type validation prevents abuse