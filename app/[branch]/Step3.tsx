

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Camera, Trash2, Circle, X, Loader, Repeat, FileText } from 'lucide-react';
import { RootState } from './store/store';
import { updateField } from './store/formSlice';
import Image from 'next/image';
import imageCompression from 'browser-image-compression';

// Types
interface Step3Props {
  validateStep: () => boolean;
  customerName?: string;
  mobileno?: string;
  relationship?: string;
}

interface FormData {
  nomineeName?: string;
  nomineeRelation?: string;
  nomineeMobile?: string;
  photo1: string | null;
  photo2: string | null;
  [key: string]: string | null | undefined;
}

interface ImageSizeInfo {
  originalSize: number;
  compressedSize: number;
}

const DEFAULT_IMAGE = '/placeholder.jpg' as const;
const DEFAULT_COMPRESSION_OPTIONS = {
  maxSizeMB: 0.0927, // 95KB in MB (95/1024)
  maxWidthOrHeight: 2048, // Increased to maintain quality
  useWebWorker: true,
  fileType: 'image/jpeg',
  initialQuality: 0.95, // Start with high quality
} as const;

// New function to iteratively compress until target size
const compressToTargetSize = async (
  file: File | Blob,
  targetSizeKB: number = 95,
  maxAttempts: number = 5
): Promise<Blob> => {
  let quality = 0.95;
  let attempt = 0;
  let compressedFile = file;
  const targetSizeMB = targetSizeKB / 1024;

  while (attempt < maxAttempts) {
    const options = {
      ...DEFAULT_COMPRESSION_OPTIONS,
      maxSizeMB: targetSizeMB,
      initialQuality: quality
    };

    try {
      compressedFile = await imageCompression(
        file instanceof File ? file : new File([file], 'photo.jpg', { type: 'image/jpeg' }),
        options
      );

      // Check if we're within 5KB of target size
      const currentSizeKB = compressedFile.size / 1024;
      if (Math.abs(currentSizeKB - targetSizeKB) <= 5) {
        break;
      }

      // Adjust quality based on result
      if (currentSizeKB > targetSizeKB) {
        quality -= 0.05;
      } else {
        quality += 0.02;
      }

      attempt++;
    } catch (error) {
      console.error('Compression attempt failed:', error);
      break;
    }
  }

  return compressedFile;
};

const Step3: React.FC<Step3Props> = ({ validateStep, customerName = '', mobileno = '', relationship = '' }) => {
  const formData = useSelector((state: RootState) => state.form) as FormData;
  const dispatch = useDispatch();
  
  // State
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [touched, setTouched] = useState<{ [key: string]: boolean }>({});
  const [isCompressing, setIsCompressing] = useState<{ [key: string]: boolean }>({
    photo1: false,
    photo2: false,
  });
  const [showCamera, setShowCamera] = useState<{ [key: string]: boolean }>({
    photo1: false,
    photo2: false,
  });
  const [currentCameraField, setCurrentCameraField] = useState<'photo1' | 'photo2' | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
    // Add these new state variables at the top of your component
    const [cameraDevices, setCameraDevices] = useState<MediaDeviceInfo[]>([]);
    const [currentDeviceId, setCurrentDeviceId] = useState<string | undefined>(undefined);

  // Refs
  const fileInputRef1 = useRef<HTMLInputElement>(null);
  const fileInputRef2 = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const photoLabels = {
    photo1: `${customerName}'s Photo`,
    photo2: `${customerName}'s ID Proof`
  };

  // Constants
  const getAllNomineeRelations = () => [
    'Spouse',
    'Father',
    'Mother',
    'Brother',
    'Sister',
    'Son',
    'Daughter'
  ];

  const getMyselfNomineeRelation = () => ['Myself'];

  // Get the appropriate nominee relations based on relationship
  const getNomineeRelations = useCallback(() => {
    // Use lowercase comparison for case-insensitive matching
    return relationship?.toLowerCase() === 'myself'
      ? getAllNomineeRelations()
      : getMyselfNomineeRelation();
  }, [relationship]);
  
  useEffect(() => {
    const availableRelations = getNomineeRelations();
    // Reset nomineeRelation if current value isn't in available options
    if (formData.nomineeRelation && !availableRelations.includes(formData.nomineeRelation)) {
      dispatch(updateField({ field: 'nomineeRelation', value: '' }));
    }
  }, [getNomineeRelations, formData.nomineeRelation, dispatch]);


  // Validation
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const validateField = (field: keyof FormData, value: any): string => {
    try {
      switch (field) {
        case 'nomineeName':
          if (!value?.trim()) throw new Error('Nominee name is required');
          if (value.length < 2) throw new Error('Name must be at least 2 characters');
          break;
          case 'nomineeMobile':
            if (!value) throw new Error('Mobile number is required');
            if (!/^\d{10}$/.test(value)) throw new Error('Mobile number must be 10 digits');
            // Add validation to check if nominee mobile matches customer mobile
            if (value === mobileno) throw new Error('Nominee mobile number cannot be same as customer mobile number');
            break;
            case 'nomineeRelation':
              if (!value) throw new Error('Nominee relation is required');
              if (!getNomineeRelations().includes(value)) throw new Error('Please select a valid relation');
              break;
        case 'photo1':
        case 'photo2':
          if (!value) throw new Error('Photo is required');
          break;
      }
      return '';
    } catch (error) {
      return error instanceof Error ? error.message : 'Invalid input';
    }
  };

  // Handlers
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleInputChange = (field: keyof FormData, value: any) => {
    dispatch(updateField({ field, value }));
    setTouched(prev => ({ ...prev, [field]: true }));
    // For mobile number, validate immediately to show the error
    if (field === 'nomineeMobile') {
      const error = validateField(field, value);
      setErrors(prev => ({ ...prev, [field]: error }));
    }
  };

  const handleBlur = (field: keyof FormData) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    const error = validateField(field, formData[field]);
    setErrors(prev => ({ ...prev, [field]: error }));
  };

  const getImageSrc = (field: 'photo1' | 'photo2'): string => {
    const photoData = formData[field];
    return typeof photoData === 'string' && photoData.length > 0
      ? photoData
      : DEFAULT_IMAGE;
  };

  const [imageSizes, setImageSizes] = useState<{ [key: string]: ImageSizeInfo }>({
    photo1: { originalSize: 0, compressedSize: 0 },
    photo2: { originalSize: 0, compressedSize: 0 },
  });

  const calculateImageSize = async (dataUrl: string): Promise<number> => {
    const base64Length = dataUrl.split(',')[1].length;
    return (base64Length * 3) / 4;
  };

  const compressAndProcessImage = async (file: File | Blob, field: 'photo1' | 'photo2') => {
    try {
      setIsCompressing(prev => ({ ...prev, [field]: true }));
      
      const originalSize = file.size;
      
      // Use new compression function
      const compressedFile = await compressToTargetSize(file);
      
      const reader = new FileReader();
      reader.onloadend = async () => {
        const result = reader.result as string;
        const compressedSize = await calculateImageSize(result);
        
        setImageSizes(prev => ({
          ...prev,
          [field]: {
            originalSize,
            compressedSize,
          }
        }));
        
        dispatch(updateField({ field, value: result }));
        setIsCompressing(prev => ({ ...prev, [field]: false }));
      };
      reader.readAsDataURL(compressedFile);
    } catch (error) {
      console.error('Compression error:', error);
      setErrors(prev => ({ ...prev, [field]: 'Error processing image' }));
      setIsCompressing(prev => ({ ...prev, [field]: false }));
    }
  };



  const handleFileChange = async (field: 'photo1' | 'photo2', event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        await compressAndProcessImage(file, field);
      } else {
        setErrors(prev => ({ ...prev, [field]: 'Please select an image file' }));
      }
    }
  };

  const checkForMultipleCameras = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      setHasMultipleCameras(videoDevices.length > 1);
      
      // Store available camera devices for later use
      setCameraDevices(videoDevices);
    } catch (error) {
      console.error('Error checking cameras:', error);
      setHasMultipleCameras(false);
    }
  };
  
  // Updated startCamera function
  const startCamera = async (photoField: 'photo1' | 'photo2', newFacingMode?: 'user' | 'environment') => {
    try {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
  
      const selectedFacingMode = newFacingMode || facingMode;
      setCurrentCameraField(photoField);
      setShowCamera(prev => ({ ...prev, [photoField]: true }));
  
      // Get list of devices if not already available
      if (cameraDevices.length === 0) {
        await checkForMultipleCameras();
      }
  
      // Find the appropriate device based on facing mode
      let deviceToUse = cameraDevices.find(device => {
        if (selectedFacingMode === 'user') {
          return device.label.toLowerCase().includes('front');
        } else {
          return device.label.toLowerCase().includes('back');
        }
      });
  
      // If no specific device found, use the first or last device based on facing mode
      if (!deviceToUse) {
        deviceToUse = selectedFacingMode === 'user' 
          ? cameraDevices[0] 
          : cameraDevices[cameraDevices.length - 1];
      }
  
      const constraints: MediaStreamConstraints = {
        video: {
          deviceId: deviceToUse?.deviceId ? { exact: deviceToUse.deviceId } : undefined,
          facingMode: selectedFacingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 },
        },
        audio: false
      };
  
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
  
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.setAttribute('playsinline', 'true');
        setStream(mediaStream);
        setFacingMode(selectedFacingMode);
        setCurrentDeviceId(deviceToUse?.deviceId);
  
        await new Promise((resolve) => {
          if (videoRef.current) {
            videoRef.current.onloadedmetadata = () => {
              videoRef.current?.play().catch(console.error);
              setIsCameraReady(true);
              resolve(true);
            };
          }
        });
      }
    } catch (err) {
      console.error('Camera error:', err);
      setErrors(prev => ({ ...prev, camera: 'Failed to access camera' }));
      setShowCamera(prev => ({ ...prev, [photoField]: false }));
    }
  };
  
  // Updated switchCamera function
  const switchCamera = async () => {
    try {
      // If we have specific device IDs, switch between them
      if (cameraDevices.length > 1) {
        const currentIndex = cameraDevices.findIndex(device => device.deviceId === currentDeviceId);
        const nextIndex = (currentIndex + 1) % cameraDevices.length;
        const nextDevice = cameraDevices[nextIndex];
        const newFacingMode = nextDevice.label.toLowerCase().includes('front') ? 'user' : 'environment';
        
        await startCamera(currentCameraField!, newFacingMode);
      } else {
        // Fallback to the simple facing mode switch
        const newFacingMode = facingMode === 'user' ? 'environment' : 'user';
        await startCamera(currentCameraField!, newFacingMode);
      }
    } catch (error) {
      console.error('Error switching camera:', error);
      setErrors(prev => ({ ...prev, camera: 'Failed to switch camera' }));
    }
  };
  
  // Add these effects at the component level
  useEffect(() => {
    // Request permissions and check for cameras when component mounts
    const initializeCamera = async () => {
      try {
        await navigator.mediaDevices.getUserMedia({ video: true });
        await checkForMultipleCameras();
      } catch (error) {
        console.error('Error initializing camera:', error);
        setErrors(prev => ({ ...prev, camera: 'Camera permission denied' }));
      }
    };
  
    initializeCamera();
  }, []);

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current || !currentCameraField || !isCameraReady) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext('2d');
    if (!context) return;
    
    // Only flip if using front camera
    if (facingMode === 'user') {
      context.translate(canvas.width, 0);
      context.scale(-1, 1);
    }
    
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Reset transform
    context.setTransform(1, 0, 0, 1, 0, 0);

    try {
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => {
          if (b) resolve(b);
        }, 'image/jpeg', 0.8);
      });

      await compressAndProcessImage(blob, currentCameraField);
      stopCamera();
    } catch (error) {
      console.error('Error capturing photo:', error);
      setErrors(prev => ({ ...prev, [currentCameraField]: 'Failed to capture photo' }));
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setStream(null);
    setShowCamera({ photo1: false, photo2: false });
    setCurrentCameraField(null);
    setIsCameraReady(false);
  };
  
  // Cleanup effect (keep as is)
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const renderImagePreview = (field: 'photo1' | 'photo2') => {
    if (!formData[field]) return null;
    
    const sizeInfo = imageSizes[field];
    
    return (
      <div className="mt-2">
        <div className="relative w-32 h-32">
          <Image
            src={getImageSrc(field)}
            alt={`Preview ${field}`}
            fill
            className="object-cover rounded"
            sizes="128px"
            priority
          />
        </div>
        {sizeInfo.originalSize > 0 && (
          <div className="text-xs text-gray-600 mt-1">
            <div className="flex items-center gap-1">
              <FileText className="w-3 h-3" />
              <span>Original: {(sizeInfo.originalSize)}</span>
            </div>
            <div className="flex items-center gap-1">
              <FileText className="w-3 h-3" />
              <span>Compressed: {(sizeInfo.compressedSize)}</span>
            </div>
          </div>
        )}
      </div>
    );
  };


  const handleDeleteImage = (field: 'photo1' | 'photo2') => {
    dispatch(updateField({ field, value: null }));
    if (field === 'photo1' && fileInputRef1.current) {
      fileInputRef1.current.value = '';
    } else if (field === 'photo2' && fileInputRef2.current) {
      fileInputRef2.current.value = '';
    }
    setErrors(prev => ({ ...prev, [field]: '' }));
    setTouched(prev => ({ ...prev, [field]: false }));
  };

  const getInputClassName = (field: keyof FormData) => {
    const hasError = touched[field] && errors[field];
    return `h-10 border mt-1 rounded px-4 w-full bg-gray-50 ${
      hasError ? 'border-red-500' : 'border-gray-300'
    }`;
  };

  // Effects
  useEffect(() => {
    validateStep();
  }, [formData, validateStep]);

  return (
    <div className="grid gap-4 gap-y-2 text-sm grid-cols-1 md:grid-cols-2">
      <div className="md:col-span-2">
        <label htmlFor="nomineeName" className="block text-left after:content-['*'] after:ml-0.5 after:text-red-500 text-sm font-bold text-slate-700">
          Nominee Name
        </label>
        <input
          type="text"
          value={formData.nomineeName || ''}
          onChange={(e) => handleInputChange('nomineeName', e.target.value)}
          onBlur={() => handleBlur('nomineeName')}
          className={getInputClassName('nomineeName')}
        />
        {touched.nomineeName && errors.nomineeName && (
          <p className="text-red-500 text-xs mt-1">{errors.nomineeName}</p>
        )}
      </div>

      <div className="md:col-span-2">
        <label htmlFor="nomineeRelation" className="block text-left after:content-['*'] after:ml-0.5 after:text-red-500 text-sm font-bold text-slate-700">
          Nominee Relation
        </label>
        <select
          value={formData.nomineeRelation || ''}
          onChange={(e) => handleInputChange('nomineeRelation', e.target.value)}
          onBlur={() => handleBlur('nomineeRelation')}
          className={getInputClassName('nomineeRelation')}
        >
          <option value="">Select Relation</option>
          {getNomineeRelations().map((relation) => (
            <option key={relation} value={relation}>
              {relation}
            </option>
          ))}
        </select>
        {touched.nomineeRelation && errors.nomineeRelation && (
          <p className="text-red-500 text-xs mt-1">{errors.nomineeRelation}</p>
        )}
      </div>

      <div className="md:col-span-2">
        <label htmlFor="nomineeMobile" className="block text-left after:content-['*'] after:ml-0.5 after:text-red-500 text-sm font-bold text-slate-700">
          Nominee Mobile Number
        </label>
        <input
          type="text"
          value={formData.nomineeMobile || ''}
          onChange={(e) => handleInputChange('nomineeMobile', e.target.value)}
          onBlur={() => handleBlur('nomineeMobile')}
          className={getInputClassName('nomineeMobile')}
          maxLength={10}
        />
        {touched.nomineeMobile && errors.nomineeMobile && (
          <p className="text-red-500 text-xs mt-1">{errors.nomineeMobile}</p>
        )}
      </div>

      {(['photo1', 'photo2'] as const).map((field, index) => (
        <div key={field} className="md:col-span-1">
          <label className="block text-left text-sm font-bold text-slate-700">
            {photoLabels[field]}
          </label>
          <div className="mt-2 flex items-center gap-2">
            <input
              type="file"
              ref={index === 0 ? fileInputRef1 : fileInputRef2}
              accept="image/*"
              onChange={(e) => handleFileChange(field, e)}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => (index === 0 ? fileInputRef1 : fileInputRef2).current?.click()}
              className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300 disabled:opacity-50"
              disabled={isCompressing[field]}
            >
              {isCompressing[field] ? 'Processing...' : 'Upload'}
            </button>
            <button
              type="button"
              onClick={() => startCamera(field)}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
              disabled={isCompressing[field]}
            >
              <Camera className="w-5 h-5" />
            </button>
            {formData[field] && (
              <button
                type="button"
                onClick={() => handleDeleteImage(field)}
                className="p-2 text-red-500 hover:text-red-600"
                aria-label="Delete image"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
          </div>

          {renderImagePreview(field)}

          {errors[field] && (
            <p className="text-red-500 text-xs mt-1">{errors[field]}</p>
          )}
        </div>
      ))}

      {/* Camera Modal */}
      {(showCamera.photo1 || showCamera.photo2) && (
        <div className="fixed inset-0 bg-black z-50 md:bg-black/50 md:p-4 md:flex md:items-center md:justify-center">
          <div className="w-full h-full md:h-auto md:max-w-2xl md:rounded-lg md:bg-white md:p-4">
            {/* Camera Container */}
            <div className="relative h-full md:aspect-video">
              {/* Video Element */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="absolute inset-0 w-full h-full object-cover md:rounded-lg"
                style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
              />
              <canvas ref={canvasRef} className="hidden" />
              {/* Overlay for Controls */}
              <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/50 to-transparent">
                <div className="flex items-center justify-center gap-4">
                  {/* Cancel Button */}
                  <button
                    onClick={stopCamera}
                    className="p-3 rounded-full bg-white/20 backdrop-blur-sm text-white hover:bg-white/30"
                  >
                    <X className="w-6 h-6" />
                  </button>
                  {/* Capture Button */}
                  <button
                    onClick={capturePhoto}
                    disabled={!isCameraReady}
                    className="p-5 rounded-full bg-white text-black hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCameraReady ? (
                      <Circle className="w-8 h-8" fill="currentColor" />
                    ) : (
                      <Loader className="w-8 h-8 animate-spin" />
                    )}
                  </button>
                  {/* Switch Camera Button */}
                  {hasMultipleCameras && (
                    <button
                      onClick={switchCamera}
                      className="p-3 rounded-full bg-white/20 backdrop-blur-sm text-white hover:bg-white/30"
                    >
                      <Repeat className="w-6 h-6" />
                    </button>
                  )}
                </div>
              </div>
              {/* Safe Area Spacing for iOS */}
              <div className="h-[env(safe-area-inset-bottom)] bg-black" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Step3;