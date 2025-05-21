import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { FormData } from '../types';

const initialState: FormData = {
  customerTitle: "",
  customerName: "",
  mobileNo: "",
  relationship: "",
  CustomerType: "",
  doorNo: "",
  street: "",
  pinCode: "",
  dateOfBirth: "",
  email: "",
  professional: "",
  purchase_with_sktm: "No",
  purchase_with_tcs: "No",
  scm_garments: "No",
  chit_with_sktm: "No",
  nomineeName: "",
  nomineeRelation: "",
  nomineeMobile: "",
  photo1: "",
  photo2: "",
};

const formSlice = createSlice({
  name: 'form',
  initialState,
  reducers: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    updateField: (state, action: PayloadAction<{ field: keyof FormData; value: any }>) => {
      const { field, value } = action.payload;
      state[field] = value;
    },
    updateFormData: (state, action: PayloadAction<Partial<FormData>>) => {
      return { ...state, ...action.payload };
    },
    setFormData: (state, action: PayloadAction<FormData>) => {
      return action.payload;
    },
    resetForm: () => initialState,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setEditField: (state, action: PayloadAction<{ field: keyof FormData; value: any }>) => {
      const { field, value } = action.payload;
      state[field] = value;
    },
  },
});

export const { 
  updateField, 
  updateFormData, 
  setFormData, 
  resetForm, 
  setEditField 
} = formSlice.actions;

export default formSlice.reducer;