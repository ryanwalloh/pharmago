import React, { createContext, useContext, useReducer } from 'react';

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
    role: 'pharmacy'
  },
  
  // Step 2: Business Information
  businessInfo: {
    pharmacy_name: '',
    business_permit_number: '',
    business_permit_expiry: '',
    pharmacy_license_number: '',
    pharmacy_license_expiry: ''
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
    owner_primary_id_uploaded: false,
    business_permit_uploaded: false,
    pharmacy_license_uploaded: false,
    storefront_image_uploaded: false
  },
  
  // Current step tracking
  currentStep: 1,
  totalSteps: 7,
  
  // Form validation state
  validationErrors: {},
  isSubmitting: false
};

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
  const [state, dispatch] = useReducer(registrationReducer, initialState);

  // Action creators
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

  const resetRegistration = () => {
    dispatch({ type: REGISTRATION_ACTIONS.RESET_REGISTRATION });
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
    logRegistrationData
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
