// ============================================
// IMOB360 - Shared Types
// ============================================

// Feature Flags
export const FEATURES = {
  GOOGLE_MAPS: 'GOOGLE_MAPS',
  WHATSAPP: 'WHATSAPP',
  AI_LEAD_SCORING: 'AI_LEAD_SCORING',
  AI_PRICING: 'AI_PRICING',
  AI_SEARCH: 'AI_SEARCH',
  DIGITAL_SIGNATURE: 'DIGITAL_SIGNATURE',
  PORTAL_INTEGRATION: 'PORTAL_INTEGRATION',
  VIRTUAL_TOUR: 'VIRTUAL_TOUR',
  CLIENT_PORTAL: 'CLIENT_PORTAL',
  CONDO_MANAGEMENT: 'CONDO_MANAGEMENT',
  PIX_PAYMENT: 'PIX_PAYMENT',
  BOLETO_PAYMENT: 'BOLETO_PAYMENT',
  ADVANCED_ANALYTICS: 'ADVANCED_ANALYTICS',
  API_ACCESS: 'API_ACCESS',
  MULTI_BRANCH: 'MULTI_BRANCH',
} as const;

export type FeatureCode = keyof typeof FEATURES;

// Plan Types
export const PLANS = {
  STARTER: {
    name: 'Starter',
    price: 149,
    maxUsers: 3,
    maxProperties: 100,
  },
  PROFESSIONAL: {
    name: 'Professional',
    price: 349,
    maxUsers: 10,
    maxProperties: 500,
  },
  ENTERPRISE: {
    name: 'Enterprise',
    price: 749,
    maxUsers: -1, // Unlimited
    maxProperties: -1, // Unlimited
  },
} as const;

export type PlanType = keyof typeof PLANS;

// API Response Types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

// Pagination
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Property Types
export interface PropertyFilter {
  type?: string[];
  purpose?: string;
  status?: string;
  city?: string;
  neighborhood?: string;
  minPrice?: number;
  maxPrice?: number;
  minArea?: number;
  maxArea?: number;
  bedrooms?: number;
  bathrooms?: number;
  parkingSpaces?: number;
  features?: string[];
  search?: string;
}

// Lead Types
export interface LeadFilter {
  stage?: string[];
  source?: string[];
  assignedToId?: string;
  propertyId?: string;
  temperature?: string;
  minScore?: number;
  maxScore?: number;
}

// Map Types (Google Maps)
export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface MapSearchParams {
  bounds?: MapBounds;
  center?: { lat: number; lng: number };
  radius?: number; // in meters
}

// WhatsApp Types
export interface WhatsAppMessage {
  to: string;
  type: 'text' | 'image' | 'document' | 'template';
  content: string;
  mediaUrl?: string;
  templateName?: string;
  templateParams?: Record<string, string>;
}

// Portal Integration Types
export interface PortalProperty {
  code: string;
  title: string;
  description: string;
  type: string;
  purpose: string;
  address: {
    street: string;
    number: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
  };
  price: number;
  area: number;
  bedrooms: number;
  bathrooms: number;
  parkingSpaces: number;
  images: string[];
  features: string[];
}

// AI Types
export interface LeadScoreResult {
  score: number;
  temperature: 'HOT' | 'WARM' | 'COLD';
  factors: {
    propertyViews: number;
    emailOpens: number;
    responseTime: number;
    budgetMatch: number;
    locationMatch: number;
    engagementLevel: number;
  };
  recommendation: string;
  nextAction: string;
}

export interface PriceSuggestion {
  suggestedPrice: number;
  minPrice: number;
  maxPrice: number;
  confidence: number;
  comparables: {
    id: string;
    price: number;
    similarity: number;
  }[];
  marketTrend: 'UP' | 'STABLE' | 'DOWN';
}

// Validation helpers
export const isValidCPF = (cpf: string): boolean => {
  const cleaned = cpf.replace(/\D/g, '');
  if (cleaned.length !== 11) return false;
  if (/^(\d)\1+$/.test(cleaned)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleaned[i]) * (10 - i);
  }
  let digit = (sum * 10) % 11;
  if (digit === 10) digit = 0;
  if (digit !== parseInt(cleaned[9])) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleaned[i]) * (11 - i);
  }
  digit = (sum * 10) % 11;
  if (digit === 10) digit = 0;
  return digit === parseInt(cleaned[10]);
};

export const isValidCNPJ = (cnpj: string): boolean => {
  const cleaned = cnpj.replace(/\D/g, '');
  if (cleaned.length !== 14) return false;
  if (/^(\d)\1+$/.test(cleaned)) return false;

  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(cleaned[i]) * weights1[i];
  }
  let digit = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (digit !== parseInt(cleaned[12])) return false;

  sum = 0;
  for (let i = 0; i < 13; i++) {
    sum += parseInt(cleaned[i]) * weights2[i];
  }
  digit = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  return digit === parseInt(cleaned[13]);
};

export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export const formatPhone = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 11) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
  }
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
};

export const slugify = (text: string): string => {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};
