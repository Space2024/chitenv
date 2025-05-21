"use client"

import React, { useState, useEffect, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from './alert';

interface SecureQRGeneratorProps {
  mobileNo: string;
  onError?: (error: string) => void;
}

const SecureQRGenerator: React.FC<SecureQRGeneratorProps> = ({ mobileNo, onError }) => {
  const [qrData, setQrData] = useState<string>('');
  const [isVerified, setIsVerified] = useState<boolean>(false);
  const [isChecking, setIsChecking] = useState<boolean>(true);
  
  // Memoize the session ID generator using useCallback
  const generateSessionId = useCallback(() => {
    const randomString = Math.random().toString(36).substring(2, 11);
    return `${mobileNo}-${Date.now()}-${randomString}`;
  }, [mobileNo]); // Depends on mobileNo

  // Memoize the QR code verification using useCallback
  const verifyQRCode = useCallback((encodedData: string): boolean => {
    try {
      const url = new URL(encodedData);
      const decodedData = url.searchParams.get('mobile');
      return decodedData === mobileNo;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      return false;
    }
  }, [mobileNo]); // Depends on mobileNo

  // Memoize the secure QR generation using useCallback
  const generateSecureQR = useCallback(async () => {
    setIsChecking(true);
    try {
      // Generate unique session-based QR data
      const sessionId = generateSessionId();
      const secureQRData = `https://example.com/verify?mobile=${mobileNo}&session=${sessionId}`;

      // Verify the generated QR code
      if (verifyQRCode(secureQRData)) {
        setQrData(secureQRData);
        setIsVerified(true);
      } else {
        throw new Error('QR code verification failed');
      }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      setIsVerified(false);
      if (onError) {
        onError('Failed to generate secure QR code');
      }
    } finally {
      setIsChecking(false);
    }
  }, [mobileNo, onError, generateSessionId, verifyQRCode]); // Added dependencies

  // Call the memoized generateSecureQR in useEffect
  useEffect(() => {
    if (mobileNo) {
      generateSecureQR();
    }
  }, [mobileNo, generateSecureQR]);

  if (isChecking) {
    return (
      <div className="flex flex-col items-center justify-center p-4">
        <div className="animate-pulse w-48 h-48 bg-gray-200 rounded-lg" />
        <p className="mt-4 text-gray-600">Generating secure QR code...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center space-y-4">
      {isVerified ? (
        <>
          <div className="w-full">
            <Alert className="mb-4 border-green-500 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertTitle>Verified QR Code</AlertTitle>
              <AlertDescription>
                Mobile: {mobileNo}
              </AlertDescription>
            </Alert>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <QRCodeSVG 
              value={qrData}
              size={200}
              level="H"
              includeMargin={true}
            />
          </div>
          
          <p className="text-sm text-gray-600 mt-2">
            Scan to verify: {mobileNo}
          </p>
        </>
      ) : (
        <div className="w-full">
          <Alert className="border-red-500 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertTitle>Generation Failed</AlertTitle>
            <AlertDescription>
              Please try regenerating the QR code
            </AlertDescription>
          </Alert>
        </div>
      )}
    </div>
  );
};

export default SecureQRGenerator;