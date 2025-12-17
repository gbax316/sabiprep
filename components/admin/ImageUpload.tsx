'use client';

import React, { useState, useRef, useCallback } from 'react';

/**
 * ImageUpload Props
 */
interface ImageUploadProps {
  value?: string; // Current image URL
  onChange: (data: { url: string; width: number; height: number } | null) => void;
  onAltTextChange: (altText: string) => void;
  altText?: string;
  error?: string;
}

/**
 * ImageUpload Component
 * Reusable component for uploading images with drag-and-drop support
 */
export function ImageUpload({
  value,
  onChange,
  onAltTextChange,
  altText = '',
  error,
}: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(value || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Validate file
  const validateFile = (file: File): string | null => {
    // Check file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      return 'Invalid file type. Please upload a JPEG, PNG, GIF, or WebP image.';
    }

    // Check file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > maxSize) {
      return 'File size exceeds 5MB. Please upload a smaller image.';
    }

    return null;
  };

  // Get image dimensions
  const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        resolve({ width: img.width, height: img.height });
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Failed to load image'));
      };

      img.src = objectUrl;
    });
  };

  // Upload file
  const uploadFile = async (file: File) => {
    setIsUploading(true);
    setUploadError(null);
    setUploadProgress(0);

    try {
      // Validate file
      const validationError = validateFile(file);
      if (validationError) {
        setUploadError(validationError);
        setIsUploading(false);
        return;
      }

      // Get image dimensions
      const dimensions = await getImageDimensions(file);

      // Create form data
      const formData = new FormData();
      formData.append('image', file);

      // Upload to API
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 100);
          setUploadProgress(progress);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          const response = JSON.parse(xhr.responseText);
          const imageUrl = response.data.url;

          setPreviewUrl(imageUrl);
          onChange({
            url: imageUrl,
            width: dimensions.width,
            height: dimensions.height,
          });
          setIsUploading(false);
          setUploadProgress(100);
        } else {
          const errorData = JSON.parse(xhr.responseText);
          setUploadError(errorData.message || 'Failed to upload image');
          setIsUploading(false);
        }
      });

      xhr.addEventListener('error', () => {
        setUploadError('Network error occurred during upload');
        setIsUploading(false);
      });

      xhr.open('POST', '/api/admin/questions/upload-image');
      xhr.send(formData);
    } catch (err) {
      console.error('Upload error:', err);
      setUploadError(err instanceof Error ? err.message : 'Failed to upload image');
      setIsUploading(false);
    }
  };

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadFile(file);
    }
  };

  // Handle drag events
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      uploadFile(file);
    }
  }, []);

  // Handle remove image
  const handleRemove = () => {
    setPreviewUrl(null);
    onChange(null);
    onAltTextChange('');
    setUploadError(null);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle click to upload
  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-3">
      {/* Upload Area */}
      {!previewUrl ? (
        <div
          onClick={handleClick}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
            isDragging
              ? 'border-emerald-500 bg-emerald-50'
              : 'border-gray-300 hover:border-gray-400 bg-gray-50'
          } ${isUploading ? 'pointer-events-none opacity-50' : ''}`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
            onChange={handleFileSelect}
            className="hidden"
            disabled={isUploading}
          />

          {isUploading ? (
            <div className="space-y-3">
              <div className="flex justify-center">
                <svg
                  className="w-12 h-12 text-emerald-500 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              </div>
              <p className="text-sm text-gray-600">Uploading... {uploadProgress}%</p>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          ) : (
            <>
              <div className="flex justify-center mb-3">
                <svg
                  className="w-12 h-12 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <p className="text-sm text-gray-600 mb-1">
                <span className="font-medium text-emerald-600">Click to upload</span> or drag and drop
              </p>
              <p className="text-xs text-gray-500">
                JPEG, PNG, GIF, or WebP (max 5MB)
              </p>
            </>
          )}
        </div>
      ) : (
        /* Image Preview */
        <div className="relative border border-gray-200 rounded-lg p-4 bg-gray-50">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <img
                src={previewUrl}
                alt={altText || 'Question image preview'}
                className="w-32 h-32 object-cover rounded-lg border border-gray-200"
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 mb-1">Image uploaded</p>
              <p className="text-xs text-gray-500 truncate mb-2">{previewUrl}</p>
              <button
                type="button"
                onClick={handleRemove}
                className="text-sm text-red-600 hover:text-red-700 flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
                Remove Image
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alt Text Input (shown when image exists) */}
      {previewUrl && (
        <div>
          <label htmlFor="image_alt_text" className="block text-sm font-medium text-gray-700 mb-1">
            Alt Text <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="image_alt_text"
            value={altText}
            onChange={(e) => onAltTextChange(e.target.value)}
            placeholder="Describe the image for accessibility..."
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
              error ? 'border-red-500' : 'border-gray-200'
            }`}
          />
          <p className="mt-1 text-xs text-gray-500">
            Required for accessibility. Describe what the image shows.
          </p>
          {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
        </div>
      )}

      {/* Error Message */}
      {uploadError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{uploadError}</p>
        </div>
      )}
    </div>
  );
}

export default ImageUpload;