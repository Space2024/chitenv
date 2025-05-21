import { useState, useEffect, useRef, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from './store/store';
import { setFormData } from './store/formSlice';
import axios from 'axios';
// import CHIT_API from './config';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, RefreshCw, Send } from 'lucide-react';
import Cookies from 'js-cookie';
import LeftBanner from './LeftBanner';
import SecureQRGenerator from './SecureQRGenerator';
import WifiStatus from './hooks/Wifistatus';
import {SkeletonLoader} from './LoadingStates'
import { Buffer } from 'buffer';
import { useParams } from 'next/navigation';

// Dynamically import heavy components
const QRCode = dynamic(() => import('qrcode.react').then(mod => mod.QRCodeSVG), {
  loading: () => <div>Loading QR Code...</div>,
  ssr: false
});

const Step1 = dynamic(() => import('./Step1'), {
  loading: () => <div className="animate-pulse"><SkeletonLoader/></div>
});

const Step2 = dynamic(() => import('./Step2'), {
  loading: () => <div className="animate-pulse"><SkeletonLoader/></div>
});

const Step3 = dynamic(() => import('./Step3'), {
  loading: () => <div className="animate-pulse"><SkeletonLoader/></div>
});

const Step4 = dynamic(() => import('./Step4'), {
  loading: () => <div className="animate-pulse"><SkeletonLoader/></div>
});

interface Notification {
  id: number;
  message: string;
  type: 'success' | 'error';
}

interface FormState {
  currentStep: number;
  formSubmitted: boolean;
  otpSent: boolean;
  otpVerified: boolean;
  submissionTimestamp: number | null;
  submissionAttempts: number;
  sessionId?: string;
}

interface StoredFormData {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
  timestamp: number;
  formState: FormState;
  sessionId?: string;
}

// Constants
const EXPIRATION_TIME = 10 * 60 * 1000;
const COOKIE_NAME = 'formData';
const COOKIE_EXPIRES = 1/144;
const MAX_SUBMISSION_ATTEMPTS = 5;
const OTP_TIMEOUT = 60;
// const CHIT_API = "http://localhost:8080";

// Enhanced API calls with retry mechanism
// eslint-disable-next-line @typescript-eslint/no-explicit-any
// const apiCallWithRetry = async (apiCall: () => Promise<any>, maxRetries = 5) => {
//   let lastError;
//   for (let i = 0; i < maxRetries; i++) {
//     try {
//       return await apiCall();
//     } catch (error) {
//       lastError = error;
//       if (i < maxRetries - 1) {
//         await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
//       }
//     }
//   }
//   throw lastError;
// };
const generateSessionId = () => {
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 10);
  return `${timestamp}-${randomStr}`;
};
const decodeBase64Twice = (str: WithImplicitCoercion<string> | { [Symbol.toPrimitive](hint: "string"): string; }) => {
    try {
      // First decode
      const firstDecode = Buffer.from(str, 'base64').toString();
      // Second decode
      const secondDecode = Buffer.from(firstDecode, 'base64').toString();
      return secondDecode;
    } catch (error) {
      console.error('Error decoding base64:', error);
      return '';
    }
  };
// Enhanced cookie helpers with error handling
const cookieHelpers = {
  set: (data: StoredFormData) => {
    try {
      Cookies.set(COOKIE_NAME, JSON.stringify(data), {
        expires: COOKIE_EXPIRES,
        sameSite: 'strict'
      });
      return true;
    } catch (error) {
      console.error('Error setting cookie:', error);
      return false;
    }
  },

  get: (): StoredFormData | null => {
    try {
      const cookieData = Cookies.get(COOKIE_NAME);
      return cookieData ? JSON.parse(cookieData) : null;
    } catch (error) {
      console.error('Error parsing cookie:', error);
      return null;
    }
  },

  clear: () => {
    try {
      Cookies.remove(COOKIE_NAME);
      return true;
    } catch (error) {
      console.error('Error clearing cookie:', error);
      return false;
    }
  }
};

export default function MultiStepForm() {
  const dispatch = useDispatch();
  const params = useParams();
  const encodedBranch = params.branch as string;
  const BRANCH = encodedBranch ? decodeBase64Twice(encodedBranch) : '';
  const [isLoading, setIsLoading] = useState(true);
  const [step, setStep] = useState(1);
  const [showOtpPopup, setShowOtpPopup] = useState(false);
  const [showQrPopup, setShowQrPopup] = useState(false);
  const [otp, setOtp] = useState('');
  const [qrCodeData, setQrCodeData] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isStepValid, setIsStepValid] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [timer, setTimer] = useState(OTP_TIMEOUT);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const timerRef = useRef<NodeJS.Timeout>();
  const [otpVerified, setOtpVerified] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [submissionTimestamp, setSubmissionTimestamp] = useState<number | null>(null);
  const [isMobileVerifying, setIsMobileVerifying] = useState(false);
  const [submissionAttempts, setSubmissionAttempts] = useState(0);
  const [lastSubmissionTime, setLastSubmissionTime] = useState<number | null>(null);
  const [mobileExists, setMobileExists] = useState(false);
  const [isPendingStatus, setIsPendingStatus] = useState(false);

  const otpInputRef = useRef<HTMLInputElement>(null);
  const formData = useSelector((state: RootState) => state.form);

  // Load persisted data on initial mount
  useEffect(() => {
    const loadPersistedData = () => {
      const storedData = cookieHelpers.get();

      if (storedData) {
        const { data, timestamp, formState, sessionId: storedSessionId } = storedData;
        const now = Date.now();

        // Check if data hasn't expired
        if (now - timestamp < EXPIRATION_TIME) {
          dispatch(setFormData(data));
          setStep(formState.currentStep);
          setOtpVerified(formState.otpVerified);
          setSubmissionTimestamp(formState.submissionTimestamp);
          setSessionId(storedSessionId || generateSessionId());

          // Show OTP popup if form was submitted and OTP is not verified
          if (formState.submissionTimestamp && !formState.otpVerified) {
            setShowOtpPopup(true);
            // Calculate remaining timer based on submission time
            const elapsed = Math.floor((now - formState.submissionTimestamp) / 1000);
            setTimer(Math.max(0, OTP_TIMEOUT - elapsed));
          }

          setShowQrPopup(formState.formSubmitted && formState.otpVerified);
        } else {
          // Clear expired data
          cookieHelpers.clear();
          setSessionId(generateSessionId());
        }
      } else {
        setSessionId(generateSessionId());
      }

      setIsLoading(false);
    };

    loadPersistedData();
  }, [dispatch]);

  // Persist form data whenever it changes
  useEffect(() => {
    if (!isLoading) {
      const formState: FormState = {
        currentStep: step,
        formSubmitted: showQrPopup,
        otpSent: showOtpPopup,
        otpVerified: otpVerified,
        submissionTimestamp: submissionTimestamp,
        submissionAttempts: 0
      };

      const dataToStore: StoredFormData = {
        data: formData,
        timestamp: Date.now(),
        formState
      };

      cookieHelpers.set(dataToStore);
    }
  }, [formData, step, showOtpPopup, showQrPopup, otpVerified, submissionTimestamp, isLoading]);

  useEffect(() => {
    if (showOtpPopup && timer > 0) {
      setIsTimerRunning(true);
      timerRef.current = setInterval(() => {
        setTimer((prevTimer) => {
          if (prevTimer <= 1) {
            setIsTimerRunning(false);
            clearInterval(timerRef.current);
            return 0;
          }
          return prevTimer - 1;
        });
      }, 1000);

      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      };
    }
  }, [showOtpPopup, timer]);
  useEffect(() => {
    // Validate branch parameter - must be exactly 5 letters after decoding
    if (!BRANCH) {
      addNotification('Unable to findout branch parameter. Please check the URL.', 'error');
    } else if (BRANCH && (BRANCH.length < 1 || BRANCH.length > 5 || !/^[a-zA-Z0-9]+$/.test(BRANCH))) {
      addNotification('Invalid branch code. Branch must be 5 letters or numbers.', 'error')
    }
  }, [BRANCH]);

  useEffect(() => {
    if (showOtpPopup && otpInputRef.current) {
      otpInputRef.current.focus();
    }
  }, [showOtpPopup]);


  const addNotification = (message: string, type: 'success' | 'error') => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

  // Modified handleSubmit function
  const handleSubmit = async () => {
    if (isSubmitting) return;
  
    const now = Date.now();
    if (lastSubmissionTime && now - lastSubmissionTime < 5000) {
      addNotification('Please wait a few seconds before trying again', 'error');
      return;
    }
  
    if (submissionAttempts >= MAX_SUBMISSION_ATTEMPTS) {
      addNotification('Maximum submission attempts reached. Please try again later.', 'error');
      return;
    }
  
    setIsSubmitting(true);
    setLastSubmissionTime(now);
    setSubmissionAttempts(prev => prev + 1);
  
    try {
      const formDataWithFiles = new FormData();
      for (const [key, value] of Object.entries(formData)) {
        formDataWithFiles.append(key, value);
      }
      formDataWithFiles.append('sessionId', sessionId);
      formDataWithFiles.append('branch', BRANCH);
      // Ensure files are defined before appending to FormData
      if (formData.photo1) {
        formDataWithFiles.append('images', formData.photo1);
      }
      if (formData.photo2) {
        formDataWithFiles.append('images', formData.photo2);
      }
  
      const response = await axios.post(`https://cust.spacetextiles.net/chit_customer`, formDataWithFiles, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
  
      if (response.status === 200) {
        addNotification('Form submitted successfully', 'success');
        setShowOtpPopup(true);
        setTimer(OTP_TIMEOUT);
        setIsTimerRunning(true);
        setSubmissionTimestamp(now);

        cookieHelpers.set({ data: formData, timestamp: now, formState: {
          currentStep: step,
          formSubmitted: true,
          otpSent: true,
          otpVerified: false,
          submissionTimestamp: now,
          submissionAttempts: submissionAttempts + 1,
          sessionId: sessionId,
        }});
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      console.error('Error submitting form:', error);
      addNotification(`Error submitting form: ${errorMessage}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resendOtp = async () => {
    if (isResending || isTimerRunning) return;

    setIsResending(true);
    try {
      await axios.get(`https://cust.spacetextiles.net/resend/${formData.mobileNo}?sessionId=${sessionId}`);
      addNotification('OTP resent successfully', 'success');
      setTimer(OTP_TIMEOUT);
      setIsTimerRunning(true);
      otpInputRef.current?.focus();
    } catch (error) {
      console.error('Error resending OTP:', error);
      addNotification('Failed to resend OTP', 'error');
    } finally {
      setIsResending(false);
    }
  };
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  // Update your component cleanup
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const generateQrCode = useCallback((mobileNo: string) => {
    setQrCodeData(`${mobileNo}`);
    setShowQrPopup(true);
    return (
      <SecureQRGenerator
        mobileNo={mobileNo}
        onError={(error: string) => addNotification(error, 'error')}
      />
    );
  }, []);

    // Enhanced OTP verification
    const verifyOtp = useCallback(async () => {
      // Clear validation checks
      if (isVerifying || !otp || otp.length !== 6) return;
    
      // Reset verification if already verified
      if (otpVerified) {
        setOtpVerified(false);
      }
    
      setIsVerifying(true);
    
      try {
        // First check if max attempts reached
        if (submissionAttempts >= MAX_SUBMISSION_ATTEMPTS) {
          addNotification('Maximum verification attempts reached. Please try again later.', 'error');
          setShowOtpPopup(false); // Close OTP popup
          return;
        }
    
        const response = await axios.post(`https://cust.spacetextiles.net/chit_verify_otp`, {
          OTP: otp,
          mobileNo: formData.mobileNo,
          sessionId: sessionId
        }, {
          timeout: 30000 // 30 second timeout
        });
    
        if (response.data.exists) {
          // Successfully verified
          setOtpVerified(true);
          setShowOtpPopup(false);
          addNotification('OTP verified successfully', 'success');
          
          // Generate QR code
          generateQrCode(formData.mobileNo);
    
          // Clear form data
          cookieHelpers.clear();
          localStorage.clear();
    
          // Reset form state
          setStep(1);
          setIsStepValid(false);
          setOtp('');
          setSubmissionAttempts(0);
          setLastSubmissionTime(null);
          setMobileExists(false);
          setIsPendingStatus(false);
          setTimer(OTP_TIMEOUT);
          setIsTimerRunning(false);
    
          // Reset form data
          dispatch(setFormData({
            customerTitle: '',
            customerName: '',
            mobileNo: '',
            relationship: '',
            CustomerType: '',
            doorNo: '',
            street: '',
            pinCode: '',
            purchase_with_sktm: 'No',
            purchase_with_tcs: 'No',
            scm_garments: 'No',
            chit_with_sktm: 'No',
            nomineeName: '',
            nomineeRelation: '',
            nomineeMobile: '',
            photo1: '',
            photo2: '',
            area: ''
          }));
    
          // Auto-hide QR code after 20 minutes
          setTimeout(() => {
            setShowQrPopup(false);
            setOtpVerified(false);
            if (timerRef.current) {
              clearInterval(timerRef.current);
            }
          }, 1200000);
    
        } else {
          throw new Error('Invalid OTP');
        }
      } catch (error: unknown) {
        console.error('Error verifying OTP:', error);
        // Increment attempt counter
        setSubmissionAttempts(prev => prev + 1);
        
        // Type guard for Error object
        if (error instanceof Error) {
          // Show appropriate error message
          if (error.message === 'timeout of 30000ms exceeded') {
            addNotification('Verification timed out. Please try again.', 'error');
          } else if (axios.isAxiosError(error)) {
            // Handle Axios specific errors
            const errorMessage = error.response?.data?.message || 'Invalid OTP. Please try again.';
            addNotification(errorMessage, 'error');
          } else {
            addNotification('Invalid OTP. Please try again.', 'error');
          }
        } else {
          // Handle non-Error objects
          addNotification('An unexpected error occurred. Please try again.', 'error');
        }
        
        setOtp('');
        if (otpInputRef.current) {
          otpInputRef.current.focus();
        }
      } finally {
        setIsVerifying(false);
      }
    }, [otp, formData.mobileNo, isVerifying, otpVerified, generateQrCode, dispatch, submissionAttempts,sessionId]);
    
    // Rest of the useEffect hooks remain the same
    useEffect(() => {
      let verificationTimer: NodeJS.Timeout;
      
      if (otp.length === 6 && !isVerifying) {
        verificationTimer = setTimeout(() => {
          verifyOtp();
        }, 800);
      }
      
      return () => {
        if (verificationTimer) {
          clearTimeout(verificationTimer);
        }
      };
    }, [otp, isVerifying, verifyOtp]);
    
    useEffect(() => {
      if (submissionAttempts > 0) {
        const resetTimer = setTimeout(() => {
          setSubmissionAttempts(0);
        }, 3600000);
        return () => clearTimeout(resetTimer);
      }
    }, [submissionAttempts]);
    
    useEffect(() => {
      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      };
    }, []);

  const validateStep = useCallback(() => {
    let isValid = false;
    switch (step) {
      case 1:
        isValid = Boolean(formData.customerTitle?.trim() && formData.customerName?.trim() && formData.mobileNo?.toString().length === 10 && formData.CustomerType?.trim() && formData.relationship?.trim() && !mobileExists);
        break;
      case 2:
        isValid = Boolean(formData.doorNo?.trim() && formData.street?.trim() && formData.pinCode?.trim() && formData.area?.trim());
        break;
      case 3:
        isValid = Boolean(
          formData.nomineeName?.trim() &&
          formData.nomineeMobile?.toString().length === 10 &&
          formData.photo1 &&
          formData.photo2
        );
        break;
      case 4:
        isValid = true; // Confirmation step is always valid
        break;
    }
    setIsStepValid(isValid);
    return isValid;
  }, [formData, step, mobileExists]);

  useEffect(() => {
    validateStep();
  });

  const checkAndPopulateMobileData = async (mobileNo: string) => {
    if (!mobileNo || mobileNo.length !== 10 || isMobileVerifying) return;

    setIsMobileVerifying(true);
    try {
      const response = await axios.get(`https://cust.spacetextiles.net/customer/${mobileNo}`);

      if (response.data && response.data.status === 'V'|| response.data.status === 'P') {
        // Populate form data with existing customer information
        const customerData = response.data;
        dispatch(setFormData({
          customerTitle: customerData.customerTitle || '',
          customerName: customerData.customerName || '',
          mobileNo: customerData.mobileNo || '',
          dateOfBirth: customerData.dateOfBirth || '',
          email: customerData.email || '',
          relationship: customerData.relationship || '',
          CustomerType: customerData.CustomerType || '',
          doorNo: customerData.doorNo || '',
          street: customerData.street || '',
          pinCode: customerData.pinCode || '',
          area: customerData.area || '',
          purchase_with_sktm: customerData.purchase_with_sktm || 'No',
          purchase_with_tcs: customerData.purchase_with_tcs || 'No',
          scm_garments: customerData.scm_garments || 'No',
          chit_with_sktm: customerData.chit_with_sktm || 'No',
          nomineeName: customerData.nomineeName || '',
          nomineeRelation: customerData.nomineeRelation || '',
          nomineeMobile: customerData.nomineeMobile || '',
          photo1: customerData.photo1 || '',
          photo2: customerData.photo2 || ''
        }));

        addNotification('Existing customer data loaded successfully', 'success');
        validateStep();
      }
    } catch (error) {
      console.error('Error checking mobile number:', error);
      // Don't show error notification as this is a silent check
    } finally {
      setIsMobileVerifying(false);
    }
  };

  const resetAllData = () => {
    // Clear all cookies
    Object.keys(Cookies.get()).forEach(cookieName => {
      Cookies.remove(cookieName);
    });

    // Clear localStorage
    localStorage.clear();

    // Reload the page
    window.location.reload();
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <Step1
            validateStep={validateStep}
            onMobileChange={(mobileNo) => {
              if (mobileNo.length === 10) {
                checkAndPopulateMobileData(mobileNo);
              }
            }}setMobileExists={setMobileExists} setPendingStatus={setIsPendingStatus}
          />
        );
      case 2:
        return <Step2 validateStep={validateStep} />;
      case 3:
        return <Step3 validateStep={validateStep} customerName={formData.customerName} mobileno={formData.mobileNo} relationship={formData.relationship}/>;
      case 4:
        return <Step4 />;
      default:
        return null;
    }
  };

  return (
    <div className="flex items-center min-h-screen bg-gradient-to-br from-blue-100 to-purple-100">
      <WifiStatus />
      <div className="flex-1 h-full max-w-4xl mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex flex-col md:flex-row">
          <LeftBanner />
          <div className="flex items-center justify-center p-6 sm:p-12 md:w-1/2">
            <div className="w-full">
              <div className="flex justify-center items-center">
                <h3 className="mb-4 text-xl font-bold text-blue-900">Customer Chit Enrollment</h3>
              </div>

              {/* Progress bar */}
              <div className="relative mb-8">
                <div className="w-full h-2 bg-gray-200 rounded-full">
                  <div
                    className="h-2 bg-blue-600 rounded-full transition-all duration-500 ease-in-out"
                    style={{ width: `${((step - 1) / 3) * 100}%` }}
                  />
                </div>
                <div className="flex justify-between mt-2">
                  {['Profile', 'Address', 'KYC', 'Confirm'].map((label, index) => (
                    <span
                      key={label}
                      className={`text-xs font-semibold ${
                        step >= index + 1 ? 'text-blue-600' : 'text-gray-400'
                      }`}
                    >
                      {label}
                    </span>
                  ))}
                </div>
              </div>

              {/* Form content */}
              <div className="space-y-4">
                <div className="min-h-[400px]">{renderStep()}</div>

                {/* Navigation buttons */}
                <div className="flex justify-between mt-6 space-x-4">
                  {step > 1 && (
                    <button
                      type="button"
                      onClick={() => setStep(prev => prev - 1)}
                      className="px-6 py-2 text-white bg-red-500 rounded-lg hover:bg-red-800 transition-colors"
                    >
                      Previous
                    </button>
                  )}
                  <div className="flex-1"></div>
                  {step < 4 ? (
                    <button
                      type="button"
                      onClick={() => setStep(prev => prev + 1)}
                      disabled={!isStepValid || (mobileExists && isPendingStatus)}
                      className={`icon flex justify-between items-center px-12 py-2 text-white rounded-lg transition-colors ${
                        (isStepValid && (!mobileExists || isPendingStatus))
                          ? 'bg-blue-600 hover:bg-blue-800'
                          : 'bg-gray-400 cursor-not-allowed'
                      }`}
                    >
                      Next
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={isSubmitting}
                      className={`px-6 py-2 text-white rounded-lg transition-colors ${
                        !isSubmitting
                          ? 'bg-green-500 hover:bg-green-600'
                          : 'bg-gray-400 cursor-not-allowed'
                      }`}
                    >
                      {isSubmitting ? 'Submitting...' : 'Submit'}
                    </button>
                  )}
                </div>
              </div>

              {/* Notifications */}
              <AnimatePresence>
                {notifications.map((notification) => (
                  <motion.div
                    key={notification.id}
                    initial={{ opacity: 0, y: 50, scale: 0.3 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
                    className={`fixed bottom-4 right-4 p-4 rounded-lg shadow-lg ${
                      notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'
                    } text-white`}
                  >
                    {notification.message}
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* OTP Popup */}
              <AnimatePresence>
      {showOtpPopup && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-md mx-4"
          >
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-2xl font-bold text-blue-600">Enter OTP</h4>
              <button
                onClick={() => setShowOtpPopup(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>
            
            <p className="mb-4 text-gray-600">
              An OTP has been sent to: <span className="font-semibold">{formData.mobileNo}</span>
            </p>
            
            <div className="flex justify-between items-center">
            <div className="flex items-center text-sm text-gray-600">
              <Clock size={16} className="mr-1" />
              <span>{formatTime(timer)}</span>
            </div>
            </div>
            
            <input
              ref={otpInputRef}
              type="tel"
              inputMode="numeric"
              pattern="[0-9]*"
              value={otp}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '');
                setOtp(value);
                if (value.length === 6) {
                  verifyOtp();
                }
              }}
              className="border-2 border-blue-300 rounded-lg px-4 py-2 mb-4 w-full text-center text-2xl tracking-widest focus:outline-none focus:border-blue-500"
              maxLength={6}
              placeholder="• • • • • •"
              style={{ fontSize: '24px' }}
            />
            
            <div className="flex space-x-4">
              <button
                onClick={resetAllData}
                className="flex-1 flex items-center justify-center bg-red-500 text-white px-6 py-2 rounded-lg hover:bg-red-600 transition-colors"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Reset
              </button>
              
              <button
                onClick={() => resendOtp()}
                disabled={isResending || timer > 0}
                className="flex-1 flex items-center justify-center bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors disabled:bg-gray-400"
              >
                <Send className="w-4 h-4 mr-2" />
                {isResending ? 'Resending...' : 'Resend OTP'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>

              {/* QR Code Popup */}
              <AnimatePresence>
                {showQrPopup && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
                  >
                    <motion.div
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.5 }}
                      className="bg-white p-8 rounded-lg shadow-2xl text-center relative m-4"
                    >
                      <button
                        onClick={() => setShowQrPopup(false)}
                        className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
                      >
                        <X size={24} />
                      </button>
                      <h4 className="text-xl font-bold mb-4 text-blue-600">Registration Successful</h4>
                      <p className="text-gray-600 mb-4">Thank you for registering with us!</p>
                      <div className="bg-white p-4 inline-block rounded-lg shadow-md">
                        <QRCode value={qrCodeData} size={200} />
                      </div>
                      <p className="mt-4 text-sm text-gray-500">Scan this QR code to access your account</p>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}