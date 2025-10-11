import React, { createContext, useContext, useReducer, useEffect } from 'react';

// Load saved data from localStorage or use default state
const loadSavedData = () => {
  try {
    const savedData = localStorage.getItem('pharmago_registration_data');
    if (savedData) {
      const parsedData = JSON.parse(savedData);
      console.log('=== LOADED SAVED REGISTRATION DATA ===');
      console.log('Saved data found:', parsedData);
      console.log('=====================================');
      return parsedData;
    }
  } catch (error) {
    console.error('Error loading saved registration data:', error);
  }
  return null;
};

// Initial state for registration data
const initialState = {
  // Step 1: User Account Information
  userAccount: {
    username: '',
    email: '',
    password: '',
    password_confirm: '',
    first_name: '',
    last_name: '',
    middle_name: '',
    phone: '',
    date_of_birth: '',
    gender: '',
    role: 'pharmacy',
    pharmacy_name: '',
    bir_form: ''
  },
  
  // Step 2: Business Information
  businessInfo: {
    pharmacy_name: '',
    business_type: '',
    business_category: '',
    business_permit_number: '',
    business_permit_expiry: '',
    pharmacy_license_number: '',
    pharmacy_license_expiry: '',
    business_phone: '',
    business_email: '',
    operating_hours: {},
    services_offered: [],
    payment_methods_accepted: []
  },
  
  // Step 3: Owner Information
  ownerInfo: {
    owner_first_name: '',
    owner_last_name: '',
    owner_middle_name: '',
    owner_date_of_birth: '',
    owner_gender: ''
  },
  
  // Step 4: Contact Information
  contactInfo: {
    business_phone: '',
    business_email: ''
  },
  
  // Step 5: Location Information
  locationInfo: {
    street_address: '',
    barangay: '',
    city: 'Iligan City',
    province: 'Lanao del Norte',
    postal_code: '',
    zip_code: '',
    latitude: '',
    longitude: ''
  },
  
  // Step 6: Business Operations
  businessOperations: {
    operating_hours: {
      monday: { is_open: true, open_time: '08:00', close_time: '20:00' },
      tuesday: { is_open: true, open_time: '08:00', close_time: '20:00' },
      wednesday: { is_open: true, open_time: '08:00', close_time: '20:00' },
      thursday: { is_open: true, open_time: '08:00', close_time: '20:00' },
      friday: { is_open: true, open_time: '08:00', close_time: '20:00' },
      saturday: { is_open: true, open_time: '09:00', close_time: '18:00' },
      sunday: { is_open: false, open_time: '09:00', close_time: '18:00' }
    },
    services_offered: [],
    payment_methods_accepted: []
  },
  
  // Step 7: Document Uploads
  documents: {
    pharmacy_license: {
      file: null,
      file_url: '',
      expiry_date: '',
      uploaded: false
    },
    business_permit: {
      file: null,
      file_url: '',
      expiry_date: '',
      uploaded: false
    },
    owner_primary_id: {
      file: null,
      file_url: '',
      expiry_date: '',
      uploaded: false
    },
    storefront_image: {
      file: null,
      file_url: '',
      uploaded: false
    }
  },
  
  // Current step tracking
  currentStep: 1,
  totalSteps: 7,
  
  // Form validation state
  validationErrors: {},
  isSubmitting: false
};

// Initialize state with saved data if available
const savedData = loadSavedData();
const initialStateWithSavedData = savedData ? { ...initialState, ...savedData } : initialState;

// Action types
const REGISTRATION_ACTIONS = {
  UPDATE_USER_ACCOUNT: 'UPDATE_USER_ACCOUNT',
  UPDATE_BUSINESS_INFO: 'UPDATE_BUSINESS_INFO',
  UPDATE_OWNER_INFO: 'UPDATE_OWNER_INFO',
  UPDATE_CONTACT_INFO: 'UPDATE_CONTACT_INFO',
  UPDATE_LOCATION_INFO: 'UPDATE_LOCATION_INFO',
  UPDATE_BUSINESS_OPERATIONS: 'UPDATE_BUSINESS_OPERATIONS',
  UPDATE_DOCUMENTS: 'UPDATE_DOCUMENTS',
  SET_CURRENT_STEP: 'SET_CURRENT_STEP',
  SET_VALIDATION_ERRORS: 'SET_VALIDATION_ERRORS',
  SET_SUBMITTING: 'SET_SUBMITTING',
  RESET_REGISTRATION: 'RESET_REGISTRATION'
};

// Reducer function
const registrationReducer = (state, action) => {
  switch (action.type) {
    case REGISTRATION_ACTIONS.UPDATE_USER_ACCOUNT:
      return {
        ...state,
        userAccount: {
          ...state.userAccount,
          ...action.payload
        }
      };
      
    case REGISTRATION_ACTIONS.UPDATE_BUSINESS_INFO:
      return {
        ...state,
        businessInfo: {
          ...state.businessInfo,
          ...action.payload
        }
      };
      
    case REGISTRATION_ACTIONS.UPDATE_OWNER_INFO:
      return {
        ...state,
        ownerInfo: {
          ...state.ownerInfo,
          ...action.payload
        }
      };
      
    case REGISTRATION_ACTIONS.UPDATE_CONTACT_INFO:
      return {
        ...state,
        contactInfo: {
          ...state.contactInfo,
          ...action.payload
        }
      };
      
    case REGISTRATION_ACTIONS.UPDATE_LOCATION_INFO:
      return {
        ...state,
        locationInfo: {
          ...state.locationInfo,
          ...action.payload
        }
      };
      
    case REGISTRATION_ACTIONS.UPDATE_BUSINESS_OPERATIONS:
      return {
        ...state,
        businessOperations: {
          ...state.businessOperations,
          ...action.payload
        }
      };
      
    case REGISTRATION_ACTIONS.UPDATE_DOCUMENTS:
      return {
        ...state,
        documents: {
          ...state.documents,
          ...action.payload
        }
      };
      
    case REGISTRATION_ACTIONS.SET_CURRENT_STEP:
      return {
        ...state,
        currentStep: action.payload
      };
      
    case REGISTRATION_ACTIONS.SET_VALIDATION_ERRORS:
      return {
        ...state,
        validationErrors: action.payload
      };
      
    case REGISTRATION_ACTIONS.SET_SUBMITTING:
      return {
        ...state,
        isSubmitting: action.payload
      };
      
    case REGISTRATION_ACTIONS.RESET_REGISTRATION:
      return initialState;
      
    default:
      return state;
  }
};

// Create context
const RegistrationContext = createContext();

// Provider component
export const RegistrationProvider = ({ children }) => {
  const [state, dispatch] = useReducer(registrationReducer, initialStateWithSavedData);

  // Auto-save to localStorage whenever state changes
  useEffect(() => {
    try {
      localStorage.setItem('pharmago_registration_data', JSON.stringify(state));
      console.log('=== AUTO-SAVED REGISTRATION DATA TO LOCALSTORAGE ===');
      console.log('Current step:', state.currentStep);
      console.log('Data saved successfully');
      console.log('===================================================');
    } catch (error) {
      console.error('Error auto-saving registration data to localStorage:', error);
    }
  }, [state]);

  // Action creators (simplified - auto-saving handled by useEffect)
  const updateUserAccount = (data) => {
    dispatch({ type: REGISTRATION_ACTIONS.UPDATE_USER_ACCOUNT, payload: data });
  };

  const updateBusinessInfo = (data) => {
    dispatch({ type: REGISTRATION_ACTIONS.UPDATE_BUSINESS_INFO, payload: data });
  };

  const updateOwnerInfo = (data) => {
    dispatch({ type: REGISTRATION_ACTIONS.UPDATE_OWNER_INFO, payload: data });
  };

  const updateContactInfo = (data) => {
    dispatch({ type: REGISTRATION_ACTIONS.UPDATE_CONTACT_INFO, payload: data });
  };

  const updateLocationInfo = (data) => {
    dispatch({ type: REGISTRATION_ACTIONS.UPDATE_LOCATION_INFO, payload: data });
  };

  const updateBusinessOperations = (data) => {
    dispatch({ type: REGISTRATION_ACTIONS.UPDATE_BUSINESS_OPERATIONS, payload: data });
  };

  const updateDocuments = (data) => {
    dispatch({ type: REGISTRATION_ACTIONS.UPDATE_DOCUMENTS, payload: data });
  };

  const setCurrentStep = (step) => {
    dispatch({ type: REGISTRATION_ACTIONS.SET_CURRENT_STEP, payload: step });
  };

  const setValidationErrors = (errors) => {
    dispatch({ type: REGISTRATION_ACTIONS.SET_VALIDATION_ERRORS, payload: errors });
  };

  const setSubmitting = (isSubmitting) => {
    dispatch({ type: REGISTRATION_ACTIONS.SET_SUBMITTING, payload: isSubmitting });
  };

  // Save data to localStorage
  const saveToLocalStorage = (data) => {
    try {
      localStorage.setItem('pharmago_registration_data', JSON.stringify(data));
      console.log('=== SAVED REGISTRATION DATA TO LOCALSTORAGE ===');
      console.log('Data saved:', data);
      console.log('===============================================');
    } catch (error) {
      console.error('Error saving registration data to localStorage:', error);
    }
  };

  const resetRegistration = () => {
    dispatch({ type: REGISTRATION_ACTIONS.RESET_REGISTRATION });
    // Clear localStorage when resetting
    localStorage.removeItem('pharmago_registration_data');
    console.log('=== CLEARED REGISTRATION DATA FROM LOCALSTORAGE ===');
  };

  // Get all registration data
  const getAllRegistrationData = () => {
    return {
      userAccount: state.userAccount,
      businessInfo: state.businessInfo,
      ownerInfo: state.ownerInfo,
      contactInfo: state.contactInfo,
      locationInfo: state.locationInfo,
      businessOperations: state.businessOperations,
      documents: state.documents
    };
  };

  // Log all collected data (for debugging)
  const logRegistrationData = () => {
    console.log('=== PHARMACY REGISTRATION DATA ===');
    console.log('User Account:', state.userAccount);
    console.log('Business Info:', state.businessInfo);
    console.log('Owner Info:', state.ownerInfo);
    console.log('Contact Info:', state.contactInfo);
    console.log('Location Info:', state.locationInfo);
    console.log('Business Operations:', state.businessOperations);
    console.log('Documents:', state.documents);
    console.log('Current Step:', state.currentStep);
    console.log('===================================');
  };

  // Prepare data for final submission to backend
  const prepareFinalSubmissionData = () => {
    const submissionData = {
      // User account data (flattened for backend serializer)
      // Note: username and password are not required for registration
      // They will be created during first-time login process
      email: state.userAccount.email,
      first_name: state.userAccount.first_name,
      last_name: state.userAccount.last_name,
      middle_name: state.userAccount.middle_name || '',
      phone: state.userAccount.phone,
      date_of_birth: state.userAccount.date_of_birth,
      gender: state.userAccount.gender,
      
      // Pharmacy business fields
      pharmacy_name: state.userAccount.pharmacy_name || state.businessInfo.pharmacy_name,
      business_permit_number: state.businessInfo.business_permit_number,
      business_permit_expiry: state.businessInfo.business_permit_expiry || state.documents.business_permit?.expiry_date || '',
      pharmacy_license_number: state.businessInfo.pharmacy_license_number,
      pharmacy_license_expiry: state.businessInfo.pharmacy_license_expiry || state.documents.pharmacy_license?.expiry_date || '',
      
      // Contact information
      business_phone: state.businessInfo.business_phone || state.userAccount.phone,
      business_email: state.businessInfo.business_email || state.userAccount.email,
      
      // Location information
      street_address: state.locationInfo.street_address,
      barangay: state.locationInfo.barangay,
      city: state.locationInfo.city,
      province: state.locationInfo.province,
      postal_code: state.locationInfo.zip_code || state.locationInfo.postal_code,
      latitude: state.locationInfo.latitude ? parseFloat(state.locationInfo.latitude) : null,
      longitude: state.locationInfo.longitude ? parseFloat(state.locationInfo.longitude) : null,
      
      // Business operations
      operating_hours: state.businessOperations.operating_hours || {
        monday: { is_open: true, open_time: '08:00', close_time: '20:00' },
        tuesday: { is_open: true, open_time: '08:00', close_time: '20:00' },
        wednesday: { is_open: true, open_time: '08:00', close_time: '20:00' },
        thursday: { is_open: true, open_time: '08:00', close_time: '20:00' },
        friday: { is_open: true, open_time: '08:00', close_time: '20:00' },
        saturday: { is_open: true, open_time: '09:00', close_time: '18:00' },
        sunday: { is_open: false, open_time: '09:00', close_time: '18:00' }
      },
      services_offered: state.businessInfo.services_offered || state.businessOperations.services_offered || [],
      payment_methods_accepted: state.businessInfo.payment_methods_accepted || state.businessOperations.payment_methods_accepted || [],
      
      // Document verification flags
      owner_primary_id_uploaded: state.documents.owner_primary_id?.uploaded || false,
      business_permit_uploaded: state.documents.business_permit?.uploaded || false,
      pharmacy_license_uploaded: state.documents.pharmacy_license?.uploaded || false,
      storefront_image_uploaded: state.documents.storefront_image?.uploaded || false,
      
      // Document URLs from Cloudinary (instead of file uploads)
      ...(state.documents.pharmacy_license?.file_url && { pharmacy_license_url: state.documents.pharmacy_license.file_url }),
      ...(state.documents.business_permit?.file_url && { business_permit_url: state.documents.business_permit.file_url }),
      ...(state.documents.owner_primary_id?.file_url && { owner_primary_id_url: state.documents.owner_primary_id.file_url }),
      ...(state.documents.storefront_image?.file_url && { storefront_image_url: state.documents.storefront_image.file_url })
    };
    
    console.log('=== FINAL SUBMISSION DATA PREPARED ===');
    console.log('Submission Data:', submissionData);
    console.log('Services Offered:', submissionData.services_offered);
    console.log('Payment Methods:', submissionData.payment_methods_accepted);
    console.log('=====================================');
    
    return submissionData;
  };

  const value = {
    // State
    ...state,
    
    // Actions
    updateUserAccount,
    updateBusinessInfo,
    updateOwnerInfo,
    updateContactInfo,
    updateLocationInfo,
    updateBusinessOperations,
    updateDocuments,
    setCurrentStep,
    setValidationErrors,
    setSubmitting,
    resetRegistration,
    
    // Utilities
    getAllRegistrationData,
    logRegistrationData,
    prepareFinalSubmissionData
  };

  return (
    <RegistrationContext.Provider value={value}>
      {children}
    </RegistrationContext.Provider>
  );
};

// Custom hook to use the registration context
export const useRegistration = () => {
  const context = useContext(RegistrationContext);
  if (!context) {
    throw new Error('useRegistration must be used within a RegistrationProvider');
  }
  return context;
};

export default RegistrationContext;
