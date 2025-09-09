import React, { createContext, useContext, useReducer, useEffect } from "react";

// Load saved data from localStorage or use default state
const loadSavedData = () => {
  try {
    const savedData = localStorage.getItem("rider_registration_data");
    if (savedData) {
      const parsedData = JSON.parse(savedData);
      console.log("=== LOADED SAVED REGISTRATION DATA ===");
      console.log("Saved data found:", parsedData);
      console.log("=====================================");
      return parsedData;
    }
  } catch (error) {
    console.error("Error loading saved registration data:", error);
  }
  return null;
};

// Initial state for registration data
const initialState = {
  // Step 1: User Account Information
  userAccount: {
    username: "",
    email: "",
    password: "",
    password_confirm: "",
    first_name: "",
    last_name: "",
    middle_name: "",
    date_of_brith: "",
    gender: "",
    role: "rider",
  },

  // Step 2: Vehicle Information
  vehicleInfo: {
    vehicle_type: "",
    vehicle_brand: "",
    vehicle_model: "",
    vehicle_color: "",
    plate_number: "",
  },

  // Step 3: Document Uploads
  documents: {
    primary_id: {
      file: null,
      file_url: "",
      uploaded: false,
    },
    drivers_license: {
      file: null,
      file_url: "",
      expiry_date: "",
      uploaded: false,
    },
    psa_birth_certificate: {
      file: null,
      file_url: "",
      uploaded: false,
    },
  },

  contactInfo: {
    contact_name: "",
    contact_phone: "",
  },

  // Form validation state
  validationErros: {},
  isSubmitting: false,
};

// Initialize state with saved data if available
const savedData = loadSavedData();
const initialStateWithSavedData = savedData
  ? { ...initialState, ...savedData }
  : initialState;

// Action types
const REGISTRATION_ACTIONS = {
  UPDATE_USER_ACCOUNT: "UPDATE_USER_ACCOUNT",
  UPDATE_VEHICLE_INFO: "UPDATE_VEHICLE_INFO",
  UPDATE_DOCUMENTS: "UPDATE_DOCUMENTS",
  UPDATE_CONTACT_INFO: "UPDATE_CONTACT_INFO",
  SET_VALIDATION_ERRORS: "SET_VALIDATION_ERRORS",
  SET_SUBMITTING: "SET_SUBMITTING",
  RESET_REGISTRATION: "RESET_REGISTRATION",
};

// Reducer function
const registrationReducer = (state, action) => {
  switch (action.type) {
    case REGISTRATION_ACTIONS.UPDATE_USER_ACCOUNT:
      return {
        ...state,
        userAccount: {
          ...state.userAccount,
          ...action.payload,
        },
      };
    case REGISTRATION_ACTIONS.UPDATE_VEHICLE_INFO:
      return {
        ...state,
        userAccount: {
          ...state.vehicleInfo,
          ...action.payload,
        },
      };
    case REGISTRATION_ACTIONS.UPDATE_DOCUMENTS:
      return {
        ...state,
        userAccount: {
          ...state.documents,
          ...action.payload,
        },
      };
    case REGISTRATION_ACTIONS.UPDATE_CONTACT_INFO:
      return {
        ...state,
        userAccount: {
          ...state.contactInfo,
          ...action.payload,
        },
      };
    case REGISTRATION_ACTIONS.SET_VALIDATION_ERRORS:
      return {
        ...state,
        validationErrors: action.payload,
      };
    case REGISTRATION_ACTIONS.SET_SUBMITTING:
      return {
        ...state,
        isSubmitting: action.payload,
      };
    case REGISTRATION_ACTIONS.RESET_REGISTRATION:
      return initialState;

    default:
      return state;
  }
};

// Create Context
const RegistrationContext = createContext();

// Provider component
export const RiderRegistrationProvider = ({ children }) => {
  const [state, dispatch] = useReducer(
    registrationReducer,
    initialStateWithSavedData
  );

  useEffect(() => {
    try {
      localStorage.setItem("pharmago_registration_data", JSON.stringify(state));
      console.log("=== AUTO-SAVED REGISTRATION DATA TO LOCALSTORAGE ===");
      console.log("Current step:", state.currentStep);
      console.log("Data saved successfully");
      console.log("===================================================");
    } catch (error) {
      console.error(
        "Error auto-saving registration data to localStorage:",
        error
      );
    }
  }, [state]);

  // Action creators (simplified - auto-saving handled by useEffect)
  const updateUserAccount = (data) => {
    dispatch({ type: REGISTRATION_ACTIONS.UPDATE_USER_ACCOUNT, payload: data });
  };

  const updateVehicleInfo = (data) => {
    dispatch({ type: REGISTRATION_ACTIONS.UPDATE_VEHICLE_INFO, payload: data });
  };

  const updateDocuments = (data) => {
    dispatch({ type: REGISTRATION_ACTIONS.UPDATE_DOCUMENTS, payload: data });
  };

  const updateContactInfo = (data) => {
    dispatch({ type: REGISTRATION_ACTIONS.UPDATE_CONTACT_INFO, payload: data });
  };

  const setValidationErrors = (error) => {
    dispatch({
      type: REGISTRATION_ACTIONS.SET_VALIDATION_ERRORS,
      payload: error,
    });
  };

  const setSubmitting = (isSubmitting) => {
    dispatch({
      type: REGISTRATION_ACTIONS.SET_SUBMITTING,
      payload: isSubmitting,
    });
  };

  // Save data to localStorage
  const saveToLocalStorage = (data) => {
    try {
      localStorage.setItem("rider_registration_data", JSON.stringify(data));
      console.log("=== SAVED REGISTRATION DATA TO LOCALSTORAGE ===");
      console.log("Data saved:", data);
      console.log("===============================================");
    } catch (error) {
      console.error("Error saving registration data to localStorage:", error);
    }
  };

  const resetRegistration = () => {
    dispatch({ type: REGISTRATION_ACTIONS.RESET_REGISTRATION });
    // Clear localStorage when resetting
    localStorage.removeItem("rider_registration_data");
    console.log("=== CLEARED REGISTRATION DATA FROM LOCALSTORAGE ===");
  };

  // Get all registration data
  const getAllRegistrationData = () => {
    return {
      userAccount: state.userAccount,
      vehicleInfo: state.vehicleInfo,
      documents: state.documents,
      contactInfo: state.contactInfo,
    };
  };

  // Log all collected data (for debugging)
  const logRegistrationData = () => {
    console.log("=== RIDER REGISTRATION DATA ===");
    console.log("User Account:", state.userAccount);
    console.log("Vehicle Info:", state.vehicleInfo);
    console.log("Documents:", state.documents);
    console.log("Contact Info:", state.contactInfo);
    console.log("===================================");
  };

  const prepareFinalSubmissionData = () => {
    // They will be created during first-time login process
    const submissionData = {
      email: state.userAccount.email,
      first_name: state.userAccount.first_name,
      last_name: state.userAccount.last_name,
      middle_name: state.userAccount.middle_name,
      gender: state.userAccount.gender,
      date_of_birth: state.userAccount.date_of_birth,

      // Vechile fields
      vehicle_type: state.vehicleInfo.vehicle_type,
      vehicle_brand: state.vehicleInfo.vehicle_brand,
      vehicle_color: state.vehicleInfo.vehicle_color,
      vehicle_model: state.vehicleInfo.vehicle_model,
      plate_number: state.vehicleInfo.plate_number,

      // Documents Fields
      primary_id_uploaded: state.documents.primary_id?.uploaded || false,
      drivers_license_uploaded:
        state.documents.drivers_license?.uploaded || false,
      psa_birth_certificate_uploaded:
        state.documents.psa_birth_certificate?.uploaded || false,

      // Driver license expiry field
      drivers_license_expiry:
        state.documents.drivers_license?.expiry_date || "",

      // Contact Fields
      emergency_contact_name: state.contactInfo.contact_name,
      emergency_contact_phone: state.contactInfo.contact_phone,

      // Document files (for upload) - only include if they exist
      ...(state.documents.primary_id?.file && {
        primary_id_files: state.documents.primary_id.file,
      }),

      ...(state.documents.drivers_license?.file && {
        drivers_license_files: state.documents.drivers_license.file,
      }),

      ...(state.documents.psa_birth_certificate?.file && {
        psa_birth_certificate_files: state.documents.psa_birth_certificate.file,
      }),
    };

    console.log("=== FINAL SUBMISSION DATA PREPARED ===");
    console.log("Submission Data:", submissionData);
    console.log("=====================================");

    return submissionData;
  };

  const value = {
    // State
    ...state,

    // Actions
    updateUserAccount,
    updateVehicleInfo,
    updateDocuments,
    updateContactInfo,

    // Utilities
    getAllRegistrationData,
    logRegistrationData,
    prepareFinalSubmissionData,
  };
  return (
    <RegistrationContext.Provider value={value}>
      {children}
    </RegistrationContext.Provider>
  );
};

export const useRegistration = () => {
  const context = useContext(RegistrationContext);

  if (!context) {
    throw new Error(
      "useRegistration must be used within a RegistrationProvider"
    );
  }
  return context;
};

export default RegistrationContext;
