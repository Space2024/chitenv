import React, { useState, useRef, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from './store/store';
import { updateField } from './store/formSlice';
import { FormData } from './types';

interface Step1Props {
  validateStep: () => boolean;
  onMobileChange?: (mobileNo: string) => void;
  setMobileExists: (exists: boolean) => void;
  setPendingStatus: (isPending: boolean) => void;
}

const Step1: React.FC<Step1Props> = ({ validateStep, onMobileChange,setMobileExists, setPendingStatus }) => {
  const formData = useSelector((state: RootState) => state.form);
  const dispatch = useDispatch();
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isCheckingMobile, setIsCheckingMobile] = useState(false);
  const [touched, setTouched] = useState<{ [key: string]: boolean }>({});
  const [lastCheckedValues, setLastCheckedValues] = useState({
    mobileNo: '',
    relationship: ''
  });

  // Refs for focusing error fields
  const refs = {
    customerTitle: useRef<HTMLSelectElement>(null),
    customerName: useRef<HTMLInputElement>(null),
    mobileNo: useRef<HTMLInputElement>(null),
    email: useRef<HTMLInputElement>(null),
    CustomerType: useRef<HTMLSelectElement>(null),
    relationship: useRef<HTMLSelectElement>(null),
  };
  // Get today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split('T')[0];
  const shouldSkipValidation = (relationship: string) => {
    return relationship.toLowerCase() === 'son' || relationship.toLowerCase() === 'daughter';
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const validateField = (field: keyof FormData, value: any) => {
    try {
      switch (field) {
        case 'customerTitle':
          if (!value) throw new Error('Title is required');
          break;
        case 'customerName':
          if (!value.trim()) throw new Error('Customer name is required');
          if (value.length < 2) throw new Error('Name must be at least 2 characters');
          break;
        case 'mobileNo':
          if (!value) throw new Error('Mobile number is required');
          if (!/^\d{10}$/.test(value)) throw new Error('Mobile number must be 10 digits');
          break;
          case 'email':
            if (!value) throw new Error('Email ID is required');
            if (value && !/^[^\s@]+@[^\s@]+(\.[^.\s@]+)*\.(com|net|co|co\.in|in|org)$/.test(value)) {
              throw new Error('Invalid email format');
            }
          break;
        case 'CustomerType':
          if (!value) throw new Error('Customer type is required');
          break;
        case 'relationship':
          if (!value) throw new Error('Relationship is required');
          break;
      }
      return '';
    } catch (error) {
      return error instanceof Error ? error.message : 'Invalid input';
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleInputChange = (field: keyof FormData, value: any) => {
    dispatch(updateField({ field, value }));
    setTouched(prev => ({ ...prev, [field]: true }));
    const error = validateField(field, value);
    setErrors(prev => ({ ...prev, [field]: error }));

    // Call onMobileChange when mobile number changes
    if (field === 'mobileNo' && onMobileChange) {
      onMobileChange(value);
    }

    // Check chit status when either mobile or relationship changes
    // Only if relationship is not son or daughter
    if ((field === 'mobileNo' || field === 'relationship') &&
        formData.mobileNo.length === 10 &&
        formData.relationship &&
        !shouldSkipValidation(formData.relationship)) {
      validateChitStatus(formData.mobileNo, formData.relationship);
    }
  };

  const handleBlur = (field: keyof FormData) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    const error = validateField(field, formData[field]);
    setErrors(prev => ({ ...prev, [field]: error }));

    // Check chit status on blur of mobile or relationship fields
    // Only if relationship is not son or daughter
    if ((field === 'mobileNo' || field === 'relationship') && 
        formData.mobileNo.length === 10 &&
        formData.relationship &&
        !shouldSkipValidation(formData.relationship)) {
      validateChitStatus(formData.mobileNo, formData.relationship);
    }
  };

  const handleRelationshipChange = (value: string) => {
    // Normalize the relationship value to lowercase
    const normalizedValue = value.toLowerCase();
    
    // Update the form data with the normalized value
    dispatch(updateField({ field: 'relationship', value: normalizedValue }));
    
    setTouched(prev => ({ ...prev, relationship: true }));
    const error = validateField('relationship', normalizedValue);
    setErrors(prev => ({ ...prev, relationship: error }));

    // If we have both mobile and relationship, validate chit status
    // Only if relationship is not son or daughter
    if (formData.mobileNo.length === 10 && 
        normalizedValue && 
        !shouldSkipValidation(normalizedValue)) {
      validateChitStatus(formData.mobileNo, normalizedValue);
    }
  };

React.useEffect(() => {
  validateStep();
}, [formData, validateStep]);


const validateChitStatus = useCallback(async (mobileNo: string, relationship: string) => {
  if (!mobileNo || !relationship || mobileNo.length !== 10) {
    setMobileExists(false);
    setPendingStatus(false);
    return;
  }

  // Don't recheck if values haven't changed
  if (lastCheckedValues.mobileNo === mobileNo && 
      lastCheckedValues.relationship === relationship) {
    return;
  }

  setIsCheckingMobile(true);
  setPendingStatus(false); // Reset pending status before check

  try {
    // First check existing user
    const userCheckUrl = `https://cust.spacetextiles.net/check_users/${mobileNo}`;
    const userResponse = await fetch(userCheckUrl);
    const userData = await userResponse.json();
    
    // Set mobile exists based on user check
    setMobileExists(userData.exists || false);

    // Then check chit status
    const encodedRelationship = encodeURIComponent(relationship.toLowerCase());
    const chitUrl = `https://cust.spacetextiles.net/chit_user/${mobileNo}/${encodedRelationship}`;

    console.log('Checking chit status:', chitUrl);

    const chitResponse = await fetch(chitUrl);
    const chitData = await chitResponse.json();

    console.log('Chit status response:', chitData);

    // Clear any existing errors first
    setErrors(prev => ({ ...prev, mobileNo: '' }));

    // Check if user exists with chit status
    if (chitData.exists && chitData.data) {
      const chitStatus = chitData.data.chit_status;
      
      if (chitStatus === 'V') {
        setMobileExists(true);
        setPendingStatus(false);
        setErrors(prev => ({
          ...prev,
          mobileNo: 'This mobile number and relationship combination already has an active chit.'
        }));
      } else if (chitStatus === 'P') {
        setMobileExists(true);
        setPendingStatus(true);
        setErrors(prev => ({
          ...prev,
          mobileNo: 'There is a pending chit application for this mobile number and relationship.'
        }));
      } else {
        setMobileExists(false);
        setPendingStatus(false);
      }
    } else {
      setMobileExists(false);
      setPendingStatus(false);
    }

    // Update last checked values
    setLastCheckedValues({
      mobileNo,
      relationship
    });

  } catch (error) {
    console.error('Error checking chit status:', error);
    setErrors(prev => ({
      ...prev,
      mobileNo: 'Error checking chit status. Please try again.'
    }));
    setMobileExists(false);
    setPendingStatus(false);
  } finally {
    setIsCheckingMobile(false);
  }
}, [lastCheckedValues, setMobileExists, setPendingStatus]);

  React.useEffect(() => {
    if (formData.CustomerType === 'ExistingCustomer') {
      const checkboxFields = [
        'purchase_with_sktm',
        'purchase_with_tcs',
        'scm_carments',
        'chit_with_sktm'
      ];

      checkboxFields.forEach(field => {
        if (!formData[field]) {
          dispatch(updateField({ field, value: 'No' }));
        }
      });
    }
  }, [formData.CustomerType, dispatch, formData]);

  // Handle individual checkbox changes
  const handleCheckboxChange = (field: keyof FormData) => {
    const newValue = formData[field] === 'Yes' ? 'No' : 'Yes';
    dispatch(updateField({ field, value: newValue }));
  };


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
        <label htmlFor="mobileNo" className="block text-left after:content-['*'] after:ml-0.5 after:text-red-500 text-sm font-bold text-slate-700">
          Primary Mobile Number
        </label>
        <input
          ref={refs.mobileNo}
          type="text"
          value={formData.mobileNo}
          onChange={(e) => handleInputChange('mobileNo', e.target.value)}
          onBlur={() => handleBlur('mobileNo')}
          className={getInputClassName('mobileNo')}
          maxLength={10}
        />
        {isCheckingMobile && (
          <p className="text-blue-500 text-xs mt-1">Checking mobile number...</p>
        )}
        {touched.mobileNo && errors.mobileNo && (
          <p className="text-red-500 text-xs mt-1">{errors.mobileNo}</p>
        )}
      </div>

      <div className="md:col-span-1">
        <label htmlFor="relationship" className="block text-left after:content-['*'] after:ml-0.5 after:text-red-500 text-sm font-bold text-slate-700">
          Relationship
        </label>
        <select
          ref={refs.relationship}
          value={formData.relationship || ''}
          onChange={(e) => handleRelationshipChange(e.target.value)}
          onBlur={() => handleBlur('relationship')}
          className={getInputClassName('relationship')}
        >
          <option value="">Select Relationship</option>
          <option value="myself">Myself</option>
          <option value="father">Father</option>
          <option value="mother">Mother</option>
          <option value="brother">Brother</option>
          <option value="sister">Sister</option>
          <option value="spouse">Spouse</option>
          <option value="son">Son</option>
          <option value="daughter">Daughter</option>
        </select>
        {touched.relationship && errors.relationship && (
          <p className="text-red-500 text-xs mt-1">{errors.relationship}</p>
        )}
      </div>

      <div className="md:col-span-2">
        <label htmlFor="customerName" className="block text-left after:content-['*'] after:ml-0.5 after:text-red-500 text-sm font-bold text-slate-700">
          Customer Name
        </label>
        <div className="flex">
          <select
            ref={refs.customerTitle}
            className={`h-10 border mt-1 rounded-l px-2 bg-gray-50 ${
              touched.customerTitle && errors.customerTitle ? 'border-red-500' : 'border-gray-300'
            }`}
            style={{ width: '60px' }}
            value={formData.customerTitle}
            onChange={(e) => handleInputChange('customerTitle', e.target.value)}
            onBlur={() => handleBlur('customerTitle')}
          >
            <option value=""></option>
            <option value="Mr.">Mr.</option>
            <option value="Ms.">Ms.</option>
            <option value="Mrs.">Mrs.</option>
          </select>
          <input
            ref={refs.customerName}
            type="text"
            value={formData.customerName}
            onChange={(e) => handleInputChange('customerName', e.target.value)}
            onBlur={() => handleBlur('customerName')}
            className={`${getInputClassName('customerName')} rounded-l-none`}
          />
        </div>
        {touched.customerTitle && errors.customerTitle && (
          <p className="text-red-500 text-xs mt-1">{errors.customerTitle}</p>
        )}
        {touched.customerName && errors.customerName && (
          <p className="text-red-500 text-xs mt-1">{errors.customerName}</p>
        )}
      </div>

      <div className="md:col-span-1">
        <label htmlFor="dateOfBirth" className="block text-left text-sm font-bold text-slate-700">
          Date Of Birth
        </label>
        <input
          type="date"
          value={formData.dateOfBirth || ''}
          max={today}
          onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
          className="h-10 border mt-1 rounded px-4 w-full bg-gray-50"
        />
      </div>

      <div className="md:col-span-1">
        <label htmlFor="email" className="block text-left text-sm font-bold text-slate-700">
          Email
        </label>
        <input
          ref={refs.email}
          type="email"
          value={formData.email || ''}
          onChange={(e) => handleInputChange('email', e.target.value)}
          onBlur={() => handleBlur('email')}
          className={getInputClassName('email')}
        />
        {touched.email && errors.email && (
          <p className="text-red-500 text-xs mt-1">{errors.email}</p>
        )}
      </div>

      <div className="md:col-span-2">
        <label htmlFor="professional" className="block text-left text-sm font-bold text-slate-700">
          Professional
        </label>
        <select
          value={formData.professional || ''}
          onChange={(e) => handleInputChange('professional', e.target.value)}
          className="h-10 border mt-1 rounded px-4 w-full bg-gray-50"
        >
          <option value="">Select Professional Type</option>
          <option value="Architects">Architects</option>
          <option value="Govt Employee">Govt Employee</option>
          <option value="Private Employee">Private Employee</option>
          <option value="Marketing careers">Marketing careers</option>
          <option value="Doctor">Doctor</option>
          <option value="Engineer">Engineer</option>
          <option value="Lawyer">Lawyer</option>
          <option value="Business">Business</option>
          <option value="Agriculture">Agriculture</option>
          <option value="Accountant">Accountant</option>
          <option value="Others">Others</option>
        </select>
      </div>

      <div className="md:col-span-2">
        <label htmlFor="CustomerType" className="block text-left after:content-['*'] after:ml-0.5 after:text-red-500 text-sm font-bold text-slate-700">
          Customer Type
        </label>
        <select
          ref={refs.CustomerType}
          value={formData.CustomerType}
          onChange={(e) => handleInputChange('CustomerType', e.target.value)}
          onBlur={() => handleBlur('CustomerType')}
          className={getInputClassName('CustomerType')}
        >
          <option value="">Select Customer Type</option>
          <option value="NewCustomer">New Customer</option>
          <option value="ExistingCustomer">Existing Customer</option>
        </select>
        {touched.CustomerType && errors.CustomerType && (
          <p className="text-red-500 text-xs mt-1">{errors.CustomerType}</p>
        )}
      </div>

      {formData.CustomerType === 'ExistingCustomer' && (
        <div className="md:col-span-2">
          <label className="block text-left text-sm font-medium text-slate-700">
            Existing Customer Options
          </label>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {[
              { field: 'purchase_with_sktm', label: 'Jewellery Purchased' },
              { field: 'purchase_with_tcs', label: 'TCS Silks Purchased' },
              { field: 'scm_garments', label: 'SCM Garments' },
              { field: 'chit_with_sktm', label: 'Scheme Joined' }
            ].map(({ field, label }) => (
              <div key={field} className="flex items-center">
                <input
                  type="checkbox"
                  id={field}
                  checked={formData[field] === 'Yes'}
                  onChange={() => handleCheckboxChange(field as keyof FormData)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor={field} className="ml-2 block text-sm text-gray-900">
                  {label}
                </label>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Step1;