/**
 * HYDREX - Business Configuration & Master Data
 * Centralised configuration file for contact details, services, and pricing rules.
 */

export const BUSINESS_CONFIG = {
  brandName: 'HYDREX',
  brandDescriptor: 'WINDOW & EXTERIOR CLEANING',
  tagline: 'Professional exterior cleaning across Derby & surrounding areas',
  primaryLocation: 'Derby, England and surrounding areas',
  serviceAreaSummary: 'Derby & surrounding areas',
  
  contact: {
    phoneDisplay: '07552 907206',
    phoneHref: 'tel:07552907206',
    whatsappInternational: '447552907206',
    whatsappDisplay: '07552 907206',
    emailDisplay: 'enquiries@hydrexcleaning.co.uk', // for future optional use
  },

  windowCleaningStandardInclusions: [
    'Glass (all accessible external panes)',
    'Window frames',
    'Window sills',
  ],

  // Authoritative Window Cleaning Price Matrix
  // 10 categories, 4-weekly and 8-weekly schedules
  windowPricing: {
    '1-2-bed-bungalow': {
      id: '1-2-bed-bungalow',
      title: '1–2 Bed Bungalow',
      subtitle: 'Single storey dwelling',
      fourWeekly: 14,
      eightWeekly: 18,
    },
    '2-bed-terrace': {
      id: '2-bed-terrace',
      title: '2 Bed Terrace',
      subtitle: 'Mid or end-terrace property',
      fourWeekly: 15,
      eightWeekly: 19,
    },
    '3-bed-terrace': {
      id: '3-bed-terrace',
      title: '3 Bed Terrace',
      subtitle: 'Mid or end-terrace property',
      fourWeekly: 16,
      eightWeekly: 20,
    },
    '2-bed-semi': {
      id: '2-bed-semi',
      title: '2 Bed Semi-Detached',
      subtitle: 'Semi-detached home',
      fourWeekly: 15,
      eightWeekly: 19,
    },
    '3-bed-semi': {
      id: '3-bed-semi',
      title: '3 Bed Semi-Detached',
      subtitle: 'Semi-detached home',
      fourWeekly: 16,
      eightWeekly: 20,
    },
    '4-bed-semi': {
      id: '4-bed-semi',
      title: '4 Bed Semi-Detached',
      subtitle: 'Substantial semi-detached home',
      fourWeekly: 18,
      eightWeekly: 22,
    },
    '2-bed-detached': {
      id: '2-bed-detached',
      title: '2 Bed Detached',
      subtitle: 'Standalone detached home',
      fourWeekly: 17,
      eightWeekly: 21,
    },
    '3-bed-detached': {
      id: '3-bed-detached',
      title: '3 Bed Detached',
      subtitle: 'Standalone detached home',
      fourWeekly: 18,
      eightWeekly: 22,
    },
    '4-bed-detached': {
      id: '4-bed-detached',
      title: '4 Bed Detached',
      subtitle: 'Executive detached home',
      fourWeekly: 20,
      eightWeekly: 24,
    },
    '5-bed-detached': {
      id: '5-bed-detached',
      title: '5 Bed Detached',
      subtitle: 'Large detached residence',
      fourWeekly: 24,
      eightWeekly: 29,
    },
    'other': {
      id: 'other',
      title: 'Something different / not sure',
      subtitle: 'Townhouse, bespoke glazing, or unusual layout',
      isManualQuote: true,
    }
  },

  // Authoritative Window Extras
  windowExtras: {
    conservatory: {
      id: 'conservatory',
      title: 'Conservatory glass (+£5)',
      description: 'Additional conservatory window panes (excludes conservatory roof cleaning)',
      surcharge: 5,
    },
    extension: {
      id: 'extension',
      title: 'Extension windows (+£5)',
      description: 'Additional ground/first floor extension glazing',
      surcharge: 5,
    }
  },

  // Authoritative Exterior Services (Unpriced - bespoke quote)
  exteriorServices: [
    {
      id: 'gutter-clearing',
      slug: 'gutter-cleaning.html',
      name: 'Gutter Clearing',
      shortDesc: 'Debris removal & flow restoration using high-reach gutter vacuum.',
      requiresPhoto: true,
    },
    {
      id: 'fascia-soffit',
      slug: 'fascia-soffit-cleaning.html',
      name: 'Fascia & Soffit Cleaning',
      shortDesc: 'External wash of UPVC fascia boards, soffits, and outer guttering.',
      requiresPhoto: true,
    },
    {
      id: 'roof-cleaning',
      slug: 'roof-cleaning.html',
      name: 'Roof Cleaning & Moss Removal',
      shortDesc: 'Controlled manual moss clearing and tailored treatments without harsh damage.',
      requiresPhoto: true,
    },
    {
      id: 'pressure-washing',
      slug: 'pressure-washing.html',
      name: 'Pressure Washing',
      shortDesc: 'Deep surface cleaning for driveways, patios, paths, and exterior paving.',
      requiresPhoto: true,
    },
    {
      id: 'conservatory-cleaning',
      slug: 'conservatory-cleaning.html',
      name: 'Conservatory Cleaning',
      shortDesc: 'Comprehensive exterior valet including conservatory roof panels and finials.',
      requiresPhoto: true,
    },
    {
      id: 'solar-panel-cleaning',
      slug: 'solar-panel-cleaning.html',
      name: 'Solar Panel Cleaning',
      shortDesc: 'Gentle pure-water washing to clear dust, grime, and bird deposits.',
      requiresPhoto: true,
    }
  ]
};

if (typeof window !== 'undefined') {
  window.HYDREX_CONFIG = BUSINESS_CONFIG;
}
