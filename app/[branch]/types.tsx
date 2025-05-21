export interface FormData {
  customerTitle: "Mr." | "Ms." | "Mrs." | "";
  customerName: string;
  mobileNo: string;
  relationship: string;
  CustomerType: "NewCustomer" | "ExistingCustomer" | "";
  doorNo: string;
  street: string;
  pinCode: string;
  dateOfBirth?: string;
  email?: string;
  professional?: string;
  purchase_with_sktm: "Yes" | "No";
  purchase_with_tcs: "Yes" | "No";
  scm_garments: "Yes" | "No";
  chit_with_sktm: "Yes" | "No";
  adhaarNo?: string;
  panNo?: string;
  city?: string;
  state?: string;
  // New fields
  nomineeName: string;
  nomineeMobile: string;
  nomineeRelation: string;
  photo1?: File | string;
  photo2?: File | string;
  // For dynamic error fields
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}