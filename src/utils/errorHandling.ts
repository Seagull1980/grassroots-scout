// Error handling utilities
export interface ApiError {
  response?: {
    status: number;
    data?: {
      error?: string;
      message?: string;
      requiresVerification?: boolean;
      ageRestriction?: boolean;
    };
  };
  message?: string;
}

export const handleApiError = (error: unknown): string => {
  if (typeof error === 'object' && error !== null) {
    const apiError = error as ApiError;
    return apiError.response?.data?.error || 
           apiError.response?.data?.message || 
           apiError.message || 
           'An unexpected error occurred';
  }
  return 'An unexpected error occurred';
};

export const isApiError = (error: unknown): error is ApiError => {
  return typeof error === 'object' && error !== null && 'response' in error;
};
