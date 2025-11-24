import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from './ui/button';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ImageUpload = ({ currentImage, onImageUploaded, onUpload, onRemove, label = "Upload Image" }) => {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(currentImage || '');
  const [inputId] = useState(`image-upload-${Math.random().toString(36).substr(2, 9)}`); // Unique ID per component

  // Sync preview with currentImage prop changes
  useEffect(() => {
    setPreview(currentImage || '');
  }, [currentImage]);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB');
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result);
    };
    reader.readAsDataURL(file);

    // If onUpload is provided, let parent handle the upload
    if (onUpload) {
      setUploading(true);
      try {
        await onUpload(file);
      } catch (error) {
        console.error('Upload failed:', error);
        alert('Failed to upload image. Please try again.');
        setPreview(currentImage || '');
      } finally {
        setUploading(false);
      }
      return;
    }

    // Otherwise, handle upload internally (legacy behavior)
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post(`${API}/upload/image`, formData, {
        withCredentials: true,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // Convert /uploads/filename to /api/uploads/filename for proper routing
      const uploadPath = response.data.url.replace('/uploads/', '/api/uploads/');
      const imageUrl = `${BACKEND_URL}${uploadPath}`;
      if (onImageUploaded) {
        onImageUploaded(imageUrl);
      }
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Failed to upload image. Please try again.');
      setPreview(currentImage || '');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-700">{label}</label>
      
      {/* Preview */}
      {preview && (
        <div className="relative w-full h-48 border border-slate-300 rounded-lg overflow-hidden bg-slate-50">
          <img
            src={preview}
            alt="Preview"
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Upload Button */}
      <div className="flex items-center gap-2">
        <input
          type="file"
          id={inputId}
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
          disabled={uploading}
        />
        <label htmlFor={inputId}>
          <Button
            type="button"
            onClick={() => document.getElementById(inputId).click()}
            disabled={uploading}
            className="cursor-pointer"
          >
            {uploading ? 'Uploading...' : preview ? 'Change Image' : 'Choose Image'}
          </Button>
        </label>
        {preview && onRemove && !uploading && (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setPreview('');
              if (onRemove) onRemove();
            }}
            className="text-red-600 hover:text-red-700"
          >
            Remove
          </Button>
        )}
        {preview && !uploading && (
          <p className="text-xs text-green-600">✓ Image ready</p>
        )}
      </div>
      
      <p className="text-xs text-slate-500">
        Max size: 5MB. Supported formats: JPG, PNG, WebP
      </p>
    </div>
  );
};

export default ImageUpload;
