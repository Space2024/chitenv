"use client";

import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from './store/store';
import { setEditField } from './store/formSlice'; // Update action to store changes in Redux
import { Pencil, Save } from 'lucide-react';

interface FieldProps {
  label: string;
  value: string | number | undefined;
  field: string; // Field name for Redux update
}

const Step4: React.FC = () => {
  const formData = useSelector((state: RootState) => state.form);
  const dispatch = useDispatch();

  const Field: React.FC<FieldProps> = ({ label, value, field }) => {
    const [isEditing, setIsEditing] = useState(false); // Toggle edit mode
    const [fieldValue, setFieldValue] = useState(value); // Local state for input field

    const handleEditClick = () => {
      setIsEditing(true); // Enable edit mode
    };

    const handleSaveClick = () => {
      dispatch(setEditField({ field, value: fieldValue })); // Dispatch new value to Redux
      setIsEditing(false); // Exit edit mode
    };

    return (
      <div className="flex items-center justify-between mb-4">
        <div className="flex-grow">
          <span className="font-bold text-sm lg:text-base">{label}:</span>
          {isEditing ? (
            <input
              type="text"
              value={fieldValue}
              onChange={(e) => setFieldValue(e.target.value)}
              className="border border-gray-300 rounded p-1 ml-2 text-sm lg:text-base w-full"
            />
          ) : (
            <span className="text-sm lg:text-base ml-2">{value || 'Not provided'}</span>
          )}
        </div>
        {isEditing ? (
          <button
            onClick={handleSaveClick}
            className="text-green-500 hover:text-green-700 text-sm ml-2 mt-5"
          >
            <Save size={24} />
          </button>
        ) : (
          <button
            onClick={handleEditClick}
            className="text-blue-500 hover:text-blue-700 ml-2"
          >
            <Pencil size={16} />
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-md w-full p-6 mx-auto">
      {/* <h4 className="text-xl font-semibold mb-4 text-center">Confirmation</h4> */}
      <p className="text-lg text-center font-bold mb-6 text-blue-800">
        Please Review Your Information Before Submitting.
      </p>
      <div className="space-y-3">
        <Field label="Customer Name" value={formData.customerName} field="customerName" />
        <Field label="Mobile No" value={formData.mobileNo} field="mobileNo" />
        <Field label="Email" value={formData.email} field="email" />
        <Field label="Address" value={formData.doorNo} field="doorNo" />
        <Field label="Street" value={formData.street} field="street" />
        <Field label="Area" value={formData.area} field="area" />
        <Field label="Taluk" value={formData.taluk} field="taluk" />
        <Field label="City" value={formData.city} field="city" />
        <Field label="State" value={formData.state} field="state" />
        {/* <Field label="Pincode" value={formData.pinCode} field="pinCode" /> */}
      </div>
    </div>
  );
};

export default Step4;
