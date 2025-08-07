import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { uploadAvatar } from '../../lib/supabaseStorage';
import { getUserAvatar } from '../../lib/avatarHelper';

const ProfileEditor = ({ onClose }) => {
  const { user, setUser } = useAuth();
  const [previewImage, setPreviewImage] = useState(user?.avatar || null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const fileInputRef = useRef(null);

  // Fetch the latest avatar from the user_profiles table
  useEffect(() => {
    const fetchAvatar = async () => {
      if (user?.id) {
        setIsLoading(true);
        try {
          // Add console log for debugging
          console.log("Fetching avatar for user:", user.id);
          
          const avatarUrl = await getUserAvatar(user.id);
          console.log("Avatar fetch result:", avatarUrl ? "Got avatar" : "No avatar found");
          
          if (avatarUrl) {
            setPreviewImage(avatarUrl);
            // Also update user context
            setUser(prev => ({ ...prev, avatar: avatarUrl }));
          }
        } catch (error) {
          console.error("Error fetching user avatar:", error);
        } finally {
          setIsLoading(false);
        }
      }
    };

    fetchAvatar();
  }, [user?.id, setUser]);
  
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Reset states
    setUploadError(null);
    setSuccessMessage(null);
    
    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setUploadError('Please select a valid image file (JPEG, PNG, GIF, or WebP)');
      return;
    }
    
    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setUploadError('Image size should be less than 2MB');
      return;
    }
    
    // Store the selected file for upload
    setSelectedFile(file);
    
    // Create file preview and base64 conversion
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewImage(reader.result);
    };
    reader.readAsDataURL(file);
  };
  
  // Helper function to convert image to base64 (PNG format)
  const convertImageToBase64PNG = (file) => {
    return new Promise((resolve, reject) => {
      // Create a new image element
      const img = new Image();
      
      img.onload = () => {
        // Create a canvas element
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        
        // Draw the image on the canvas
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        
        // Convert to PNG base64
        try {
          const pngBase64 = canvas.toDataURL('image/png');
          resolve(pngBase64);
        } catch (err) {
          reject(err);
        }
      };
      
      img.onerror = (err) => {
        reject(err);
      };
      
      // Set source to the preview image
      img.src = URL.createObjectURL(file);
    });
  };
  
  const handleUpload = async () => {
    // Return if no image selected or already uploading
    if (!selectedFile || !previewImage || previewImage === user?.avatar || uploading) return;
    
    setUploading(true);
    setUploadError(null);
    
    try {
      // Always convert to base64 PNG format for consistent storage
      let base64Image;
      try {
        base64Image = await convertImageToBase64PNG(selectedFile);
        console.log("Successfully converted image to base64 PNG format");
      } catch (conversionError) {
        console.error("Error converting image to PNG:", conversionError);
        // Fallback to the original preview (which is already base64)
        base64Image = previewImage;
      }
      
      if (!base64Image) {
        throw new Error("Failed to convert image to base64");
      }
      
      // Upload the base64 image to Supabase via our helper function
      // This function will store the base64 string directly in the users table
      try {
        await uploadAvatar(selectedFile, user.id);
        console.log("Successfully uploaded base64 avatar to Supabase");
      } catch (storageError) {
        console.error("Error uploading to Supabase:", storageError);
        throw storageError; // Re-throw to handle in the outer catch block
      }
      
      // Update user in context with the base64 image
      const updatedUser = { ...user, avatar: base64Image };
      setUser(updatedUser);
      
      // Set isLoading to false since we're done loading
      setIsLoading(false);
      
      // Save to localStorage for persistence
      try {
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setSuccessMessage('Profile picture saved successfully to Supabase!');
        
        // Close modal after a delay
        setTimeout(() => {
          onClose();
        }, 1500);
      } catch (err) {
        console.error("Error saving user to localStorage:", err);
        setUploadError('Error saving to local storage.');
      }
    } catch (error) {
      console.error("Error uploading image:", error);
      setUploadError(`Error uploading image: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };
  
  const triggerFileSelect = () => {
    fileInputRef.current.click();
  };
  
  const handleRemoveImage = () => {
    setPreviewImage(null);
    fileInputRef.current.value = '';
    setUploadError(null);
    setSuccessMessage(null);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md relative">
        <button 
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
          disabled={uploading}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        
        <h2 className="text-xl font-bold mb-4">Update Profile Picture</h2>
        
        <div className="mb-6">
          <div className="flex flex-col items-center">
            <div 
              className="h-32 w-32 rounded-full overflow-hidden bg-gray-200 mb-4 border-2 border-gray-300"
              onClick={triggerFileSelect}
            >
              {isLoading ? (
                <div className="h-full w-full flex items-center justify-center">
                  <svg className="animate-spin h-8 w-8 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
              ) : previewImage ? (
                <img 
                  src={previewImage} 
                  alt="Profile Preview" 
                  className="h-full w-full object-cover" 
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </div>
            
            <div className="flex gap-2">
              <button
                type="button"
                onClick={triggerFileSelect}
                className="py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
                disabled={uploading}
              >
                Select Image
              </button>
              
              {previewImage && previewImage !== user?.avatar && (
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="py-2 px-4 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm font-medium"
                  disabled={uploading}
                >
                  Remove
                </button>
              )}
            </div>
            
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/jpeg,image/png,image/gif,image/webp"
              className="hidden"
              disabled={uploading}
            />
          </div>
          
          {uploadError && (
            <div className="mt-4 p-3 bg-red-100 border border-red-200 text-red-700 rounded-md text-sm">
              {uploadError}
            </div>
          )}
          
          {successMessage && (
            <div className="mt-4 p-3 bg-green-100 border border-green-200 text-green-700 rounded-md text-sm">
              {successMessage}
            </div>
          )}
          
          <div className="mt-6 text-xs text-gray-500">
            <p>Supported formats: JPEG, PNG, GIF, WebP</p>
            <p>Maximum file size: 2MB</p>
          </div>
        </div>
        
        <div className="flex justify-end space-x-2">
          <button
            type="button"
            onClick={onClose}
            className="py-2 px-4 border border-gray-300 rounded-md hover:bg-gray-50 text-sm font-medium"
            disabled={uploading}
          >
            Cancel
          </button>
          
          <button
            type="button"
            onClick={handleUpload}
            className={`py-2 px-4 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm font-medium ${uploading || previewImage === user?.avatar || !previewImage ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={uploading || previewImage === user?.avatar || !previewImage}
          >
            {uploading ? 'Uploading...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfileEditor;