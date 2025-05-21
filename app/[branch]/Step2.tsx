/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from './store/store';
import { updateField } from './store/formSlice';
import { FormData } from './types';
import axios from 'axios';

interface PostOffice {
  Name: string;
  District: string;
  State: string;
  Block: string;
}

interface PostalResponse {
  Status: string;
  PostOffice: PostOffice[];
}

interface Step2Props {
  validateStep: () => boolean;
}

const Step2: React.FC<Step2Props> = ({ validateStep }) => {
  const formData = useSelector((state: RootState) => state.form);
  const dispatch = useDispatch();

  const [areas, setAreas] = useState<string[]>([]);
  const [isLoadingPincode, setIsLoadingPincode] = useState(false);
  const [pincodeError, setPincodeError] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [touched, setTouched] = useState<{ [key: string]: boolean }>({});
  const previousPincode = useRef(formData.pinCode);
  const isSubmitAttempted = useRef(false);

  const refs = {
    doorNo: useRef<HTMLInputElement>(null),
    street: useRef<HTMLInputElement>(null),
    pinCode: useRef<HTMLInputElement>(null),
    area: useRef<HTMLSelectElement>(null),
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const validateField = (field: keyof FormData, value: any) => {
    try {
      switch (field) {
        case 'doorNo':
          if (!value.trim()) throw new Error('Door number is required');
          break;
        case 'street':
          if (!value.trim()) throw new Error('Street is required');
          if (value.length > 30) throw new Error('Street name must be 30 characters or less');
          break;
        case 'pinCode':
          if (!value) throw new Error('Pin code is required');
          if (!/^\d{6}$/.test(value)) throw new Error('Pin code must be 6 digits');
          break;
        case 'area':
          if (!value) throw new Error('Area is required');
          break;
      }
      return '';
    } catch (error) {
      return error instanceof Error ? error.message : 'Invalid input';
    }
  };

  const handleInputChange = useCallback(
    (field: keyof FormData, value: string) => {
      if (field === 'pinCode' && value !== previousPincode.current) {
        dispatch(updateField({ field: 'area', value: '' }));
        dispatch(updateField({ field: 'city', value: '' }));
        dispatch(updateField({ field: 'state', value: '' }));
        dispatch(updateField({ field: 'taluk', value: '' }));
        setAreas([]);
        previousPincode.current = value;
      }

      dispatch(updateField({ field, value }));
      
      // Only validate if the field has been touched or form submission was attempted
      if (touched[field] || isSubmitAttempted.current) {
        const error = validateField(field, value);
        setErrors(prev => ({ ...prev, [field]: error }));
      }
    },
    [dispatch, touched]
  );

  const handleBlur = (field: keyof FormData) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    const error = validateField(field, formData[field]);
    setErrors(prev => ({ ...prev, [field]: error }));
  };

  const fetchPostalData = useCallback(async () => {
    if (formData.pinCode && formData.pinCode.length === 6) {
      setIsLoadingPincode(true);
      setPincodeError(null);
      try {
        // Use the backend endpoint instead of calling the postal API directly
        const response = await axios.post(`https://cust.spacetextiles.net/get-pincode-data`, {
          pinCode: formData.pinCode
        });
  
        if (response.data.Status === 'Success') {
          const postOffice = response.data.PostOffice[0];
          handleInputChange('city', postOffice.District);
          handleInputChange('state', postOffice.State);
          handleInputChange('taluk', postOffice.Block);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setAreas(response.data.PostOffice.map((po: { Name: any; }) => po.Name));
        } else {
          setPincodeError('Invalid pincode');
          setAreas([]);
          handleInputChange('area', '');
          handleInputChange('city', '');
          handleInputChange('state', '');
          handleInputChange('taluk', '');
        }
      } catch (error) {
        setPincodeError('Error fetching pincode data');
        setAreas([]);
        handleInputChange('area', '');
        handleInputChange('city', '');
        handleInputChange('state', '');
        handleInputChange('taluk', '');
      } finally {
        setIsLoadingPincode(false);
      }
    }
  }, [formData.pinCode, handleInputChange]);

  const validateAllFields = useCallback(() => {
    const allFields: (keyof FormData)[] = ['doorNo', 'street', 'pinCode', 'area'];
    const newErrors: { [key: string]: string } = {};
    let isValid = true;

    // Only validate all fields when submission is attempted
    if (isSubmitAttempted.current) {
      allFields.forEach((field) => {
        const error = validateField(field, formData[field]);
        if (error) {
          isValid = false;
          newErrors[field] = error;
        }
      });
      setErrors(newErrors);
    }

    return isValid;
  }, [formData]);

  useEffect(() => {
    fetchPostalData();
  }, [formData.pinCode, fetchPostalData]);

  useEffect(() => {
    if (typeof validateStep === 'function') {
      isSubmitAttempted.current = true;
      validateAllFields();
      validateStep();
    }
  }, [formData, validateStep, validateAllFields]);

  const getInputClassName = (field: keyof FormData) => {
    const hasError = touched[field] && errors[field];
    return `h-10 border mt-1 rounded px-4 w-full bg-gray-50 ${
      hasError ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
      : 'border-gray-300'
    }`;
  };

  return (
    <div className="grid gap-4 gap-y-2 text-sm grid-cols-1 md:grid-cols-2">
      <div className="md:col-span-1">
        <label htmlFor="doorNo" className="block text-left after:content-['*'] after:ml-0.5 after:text-red-500 text-sm font-bold text-slate-700">
          Door Number
        </label>
        <input
          id="doorNo"
          ref={refs.doorNo}
          type="text"
          value={formData.doorNo}
          onChange={(e) => handleInputChange('doorNo', e.target.value)}
          onBlur={() => handleBlur('doorNo')}
          className={getInputClassName('doorNo')}
        />
        {touched.doorNo && errors.doorNo && <p className="text-red-500 text-xs mt-1">{errors.doorNo}</p>}
      </div>

      <div className="md:col-span-1">
        <label htmlFor="street" className="block text-left after:content-['*'] after:ml-0.5 after:text-red-500 text-sm font-bold text-slate-700">
          Street
        </label>
        <input
          id="street"
          ref={refs.street}
          type="text"
          value={formData.street}
          onChange={(e) => handleInputChange('street', e.target.value)}
          onBlur={() => handleBlur('street')}
          className={getInputClassName('street')}
          maxLength={30}
        />
        {touched.street && errors.street && <p className="text-red-500 text-xs mt-1">{errors.street}</p>}
      </div>

      <div className="md:col-span-1">
        <label htmlFor="pinCode" className="block text-left after:content-['*'] after:ml-0.5 after:text-red-500 text-sm font-bold text-slate-700">
          Pin Code
        </label>
        <input
          id="pinCode"
          ref={refs.pinCode}
          type="text"
          pattern="[0-9]*"
          inputMode="numeric"
          value={formData.pinCode}
          onChange={(e) => handleInputChange('pinCode', e.target.value.replace(/\D/g, ''))}
          onBlur={() => handleBlur('pinCode')}
          className={getInputClassName('pinCode')}
          maxLength={6}
        />
        {touched.pinCode && errors.pinCode && <p className="text-red-500 text-xs mt-1">{errors.pinCode}</p>}
        {pincodeError && <p className="text-red-500 text-xs mt-1">{pincodeError}</p>}
        {isLoadingPincode && <p className="text-gray-500 text-xs mt-1">Loading...</p>}
      </div>

      <div className="md:col-span-1">
        <label htmlFor="area" className="block text-left after:content-['*'] after:ml-0.5 after:text-red-500 text-sm font-bold text-slate-700">Area</label>
        <select
          id="area"
          ref={refs.area}
          value={formData.area}
          onChange={(e) => handleInputChange('area', e.target.value)}
          onBlur={() => handleBlur('area')}
          className={getInputClassName('area')}
        >
          <option value="">Select Area</option>
          {areas.map((area) => (
            <option key={area} value={area}>{area}</option>
          ))}
        </select>
        {touched.area && errors.area && <p className="text-red-500 text-xs mt-1">{errors.area}</p>}
      </div>

      <div className="md:col-span-1">
        <label htmlFor="taluk" className="block text-left text-sm font-bold text-slate-700">Taluk</label>
        <input
          id="taluk"
          type="text"
          value={formData.taluk}
          className="h-10 border mt-1 rounded px-4 w-full bg-gray-50"
          readOnly
        />
      </div>

      <div className="md:col-span-1">
        <label htmlFor="city" className="block text-left text-sm font-bold text-slate-700">City</label>
        <input
          id="city"
          type="text"
          value={formData.city}
          className="h-10 border mt-1 rounded px-4 w-full bg-gray-50"
          readOnly
        />
      </div>

      <div className="md:col-span-1">
        <label htmlFor="state" className="block text-left text-sm font-bold text-slate-700">State</label>
        <input
          id="state"
          type="text"
          value={formData.state}
          className="h-10 border mt-1 rounded px-4 w-full bg-gray-50"
          readOnly
        />
      </div>
    </div>
  );
};

export default Step2;