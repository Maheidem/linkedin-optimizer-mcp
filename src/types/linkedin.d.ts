// LinkedIn API Type Definitions

export interface LinkedInProfile {
  id: string;
  firstName?: string;
  lastName?: string;
  headline?: string;
  summary?: string;
  profilePicture?: {
    displayImage: string;
  };
  location?: {
    country: string;
    geographicArea: string;
  };
}

export interface LinkedInPost {
  id: string;
  author: string;
  commentary?: string;
  content?: any;
  visibility: string;
  createdAt: number;
  lastModifiedAt: number;
}

export interface LinkedInCampaign {
  id: string;
  name: string;
  account: string;
  type: string;
  status: string;
  budget?: {
    currencyCode: string;
    amount: number;
  };
}

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: string;
  };
  rateLimitInfo?: {
    remaining: number;
    reset: number;
    limit: number;
  };
}