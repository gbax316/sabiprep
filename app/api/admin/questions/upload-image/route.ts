import { NextRequest } from 'next/server';
import { createServerClient } from '@/lib/supabaseServer';
import {
  withAdminAuth,
  createErrorResponse,
  createSuccessResponse,
  type AdminApiUser
} from '@/lib/api/admin-auth';
import { randomUUID } from 'crypto';

/**
 * POST /api/admin/questions/upload-image
 * Upload an image for a question to Supabase Storage
 */
export async function POST(request: NextRequest) {
  return withAdminAuth(request, async (adminUser: AdminApiUser) => {
    try {
      const supabase = await createServerClient();
      const formData = await request.formData();
      const file = formData.get('image') as File;
      
      // Validate file exists
      if (!file) {
        return createErrorResponse(400, 'Bad Request', 'Image file is required');
      }
      
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        return createErrorResponse(
          400, 
          'Bad Request', 
          'Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed'
        );
      }
      
      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB in bytes
      if (file.size > maxSize) {
        return createErrorResponse(
          400, 
          'Bad Request', 
          'File size exceeds 5MB limit'
        );
      }
      
      // Generate unique filename
      const fileExtension = file.name.split('.').pop() || 'jpg';
      const uniqueFilename = `${randomUUID()}.${fileExtension}`;
      const filePath = `questions/${uniqueFilename}`;
      
      // Convert File to ArrayBuffer then to Buffer for upload
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase
        .storage
        .from('question-images')
        .upload(filePath, buffer, {
          contentType: file.type,
          cacheControl: '3600',
          upsert: false,
        });
      
      if (uploadError) {
        console.error('Error uploading image:', uploadError);
        return createErrorResponse(500, 'Upload Error', 'Failed to upload image to storage');
      }
      
      // Get public URL
      const { data: urlData } = supabase
        .storage
        .from('question-images')
        .getPublicUrl(filePath);
      
      if (!urlData?.publicUrl) {
        return createErrorResponse(500, 'Upload Error', 'Failed to generate public URL');
      }
      
      // Get image dimensions using browser Image API simulation
      // Since we're on the server, we'll return dimensions as null
      // and let the client handle dimension detection if needed
      // Alternatively, we could use a library like 'sharp' to get dimensions
      let width: number | null = null;
      let height: number | null = null;
      
      // Try to get dimensions using image-size library if available
      try {
        // This is a placeholder - in production, you might want to use 'sharp' or 'image-size'
        // For now, we'll return null and let the frontend handle it
        const imageSize = await getImageDimensions(buffer, file.type);
        width = imageSize.width;
        height = imageSize.height;
      } catch (error) {
        console.log('Could not determine image dimensions:', error);
        // Continue without dimensions - they're optional
      }
      
      return createSuccessResponse({
        url: urlData.publicUrl,
        width,
        height,
        filename: uniqueFilename,
        size: file.size,
        type: file.type,
        message: 'Image uploaded successfully',
      }, 201);
    } catch (error) {
      console.error('Error in POST /api/admin/questions/upload-image:', error);
      return createErrorResponse(500, 'Internal Server Error', 'An unexpected error occurred');
    }
  });
}

/**
 * Helper function to get image dimensions from buffer
 * This is a basic implementation - in production, use a proper library like 'sharp'
 */
async function getImageDimensions(buffer: Buffer, mimeType: string): Promise<{ width: number; height: number }> {
  // For now, return null dimensions
  // In production, you would use a library like 'sharp' or 'image-size'
  // Example with sharp:
  // const sharp = require('sharp');
  // const metadata = await sharp(buffer).metadata();
  // return { width: metadata.width || 0, height: metadata.height || 0 };
  
  throw new Error('Image dimension detection not implemented');
}
