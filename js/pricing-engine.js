/**
 * HYDREX - Authoritative Pricing & Calculation Engine
 * Pure logic module for calculating window cleaning prices, validating postcodes,
 * and generating WhatsApp enquiry messages.
 */

import { BUSINESS_CONFIG } from './config.js';

/**
 * Validates UK postcode format (supports standard UK patterns, spaces optional)
 * @param {string} postcode 
 * @returns {boolean}
 */
export function isValidUkPostcode(postcode) {
  if (!postcode || typeof postcode !== 'string') return false;
  const cleaned = postcode.trim().toUpperCase();
  // Standard UK postcode regex pattern
  const ukPostcodeRegex = /^([A-Z]{1,2}[0-9][A-Z0-9]?)\s*([0-9][A-Z]{2})$/i;
  return ukPostcodeRegex.test(cleaned);
}

/**
 * Formats a valid UK postcode with proper spacing (e.g. "DE1 2AB")
 * @param {string} postcode 
 * @returns {string}
 */
export function formatUkPostcode(postcode) {
  if (!postcode) return '';
  const cleaned = postcode.trim().toUpperCase().replace(/\s+/g, '');
  if (cleaned.length < 5) return cleaned;
  const outward = cleaned.slice(0, cleaned.length - 3);
  const inward = cleaned.slice(cleaned.length - 3);
  return `${outward} ${inward}`;
}

/**
 * Normalises frequency input to '4w' or '8w'
 * @param {string} freq 
 * @returns {'4w' | '8w' | null}
 */
export function normaliseFrequency(freq) {
  if (!freq) return null;
  const lower = String(freq).toLowerCase().trim();
  if (lower === '4w' || lower === '4' || lower === 'every-4-weeks' || lower === '4 weekly' || lower === 'every 4 weeks') {
    return '4w';
  }
  if (lower === '8w' || lower === '8' || lower === 'every-8-weeks' || lower === '8 weekly' || lower === 'every 8 weeks') {
    return '8w';
  }
  return null;
}

/**
 * Calculates authoritative window cleaning price.
 * 
 * @param {string} propertyId - Property key matching BUSINESS_CONFIG.windowPricing
 * @param {string} frequency - '4w' or '8w'
 * @param {Object|Array<string>} extras - Selected extras (e.g. { conservatory: true, extension: false } or ['conservatory'])
 * @returns {Object} Result payload
 */
export function calculateWindowPrice(propertyId, frequency, extras = {}) {
  const propConfig = BUSINESS_CONFIG.windowPricing[propertyId];

  if (!propConfig) {
    return {
      isValid: false,
      isManual: false,
      error: 'Invalid or missing property type',
      propertyId: null,
      totalPrice: null,
    };
  }

  // Handle manual quote option
  if (propConfig.isManualQuote) {
    return {
      isValid: true,
      isManual: true,
      propertyId: 'other',
      propertyTitle: propConfig.title,
      frequency: normaliseFrequency(frequency) || '4w',
      frequencyLabel: normaliseFrequency(frequency) === '8w' ? 'Every 8 weeks' : 'Every 4 weeks',
      basePrice: null,
      extrasPrice: 0,
      extrasBreakdown: [],
      totalPrice: null,
      formattedPrice: 'Quote required',
      notes: 'Bespoke pricing required for this property layout.',
    };
  }

  const normFreq = normaliseFrequency(frequency);
  if (!normFreq) {
    return {
      isValid: false,
      isManual: false,
      error: 'Frequency must be every 4 weeks or every 8 weeks',
      propertyId,
      totalPrice: null,
    };
  }

  // Determine base price from authoritative matrix
  const basePrice = normFreq === '4w' ? propConfig.fourWeekly : propConfig.eightWeekly;

  // Process extras
  let hasConservatory = false;
  let hasExtension = false;

  if (Array.isArray(extras)) {
    hasConservatory = extras.includes('conservatory');
    hasExtension = extras.includes('extension');
  } else if (extras && typeof extras === 'object') {
    hasConservatory = Boolean(extras.conservatory);
    hasExtension = Boolean(extras.extension);
  }

  let extrasPrice = 0;
  const extrasBreakdown = [];

  if (hasConservatory) {
    extrasPrice += BUSINESS_CONFIG.windowExtras.conservatory.surcharge;
    extrasBreakdown.push({
      id: 'conservatory',
      title: 'Conservatory glass (+£5)',
      surcharge: 5,
    });
  }

  if (hasExtension) {
    extrasPrice += BUSINESS_CONFIG.windowExtras.extension.surcharge;
    extrasBreakdown.push({
      id: 'extension',
      title: 'Extension windows (+£5)',
      surcharge: 5,
    });
  }

  const totalPrice = basePrice + extrasPrice;

  return {
    isValid: true,
    isManual: false,
    propertyId,
    propertyTitle: propConfig.title,
    frequency: normFreq,
    frequencyLabel: normFreq === '4w' ? 'Every 4 weeks' : 'Every 8 weeks',
    frequencyCode: normFreq === '4w' ? '4 WEEKLY' : '8 WEEKLY',
    basePrice,
    extrasPrice,
    hasConservatory,
    hasExtension,
    extrasBreakdown,
    extrasSummaryText: extrasBreakdown.length > 0 
      ? extrasBreakdown.map(e => e.title).join(', ') 
      : 'None',
    totalPrice,
    currencySymbol: '£',
    formattedPrice: `£${totalPrice}`,
    standardInclusions: BUSINESS_CONFIG.windowCleaningStandardInclusions,
  };
}

/**
 * Builds the prefilled WhatsApp URL and text for window cleaning enquiries
 * @param {Object} data - Quote details
 * @returns {string} WhatsApp URL
 */
export function buildWindowWhatsAppUrl(data) {
  const lines = [
    "Hi HYDREX, I'd like to request my first regular window clean.",
    "",
    "Name:",
    data.name ? data.name.trim() : "[Not provided]",
    "",
    "Address:",
    [data.houseNumber, data.street].filter(Boolean).join(" ") || "[Not provided]",
    "",
    "Postcode:",
    data.postcode ? formatUkPostcode(data.postcode) : "[Not provided]",
    "",
    "Property:",
    data.propertyTitle || data.propertyId || "[Not provided]",
    "",
    "Frequency:",
    data.frequency === '8w' ? '8 WEEKLY' : '4 WEEKLY',
  ];

  // Window extras
  const extrasText = data.extrasSummaryText || 
    (data.extrasBreakdown && data.extrasBreakdown.length > 0 
      ? data.extrasBreakdown.map(e => e.title).join(', ') 
      : 'None');
  
  lines.push("", "Window extras:", extrasText);

  // Price
  if (data.isManual) {
    lines.push("", "Website regular-clean price:", "Manual quote required");
  } else if (data.totalPrice) {
    lines.push("", "Website regular-clean price:", `£${data.totalPrice} (${data.frequency === '8w' ? '8 weekly' : '4 weekly'})`);
  }

  // Other services requested
  if (data.otherServices && data.otherServices.length > 0) {
    const validServices = data.otherServices
      .map(id => {
        const s = BUSINESS_CONFIG.exteriorServices.find(item => item.id === id);
        return s ? s.name : id;
      })
      .filter(Boolean);
    
    if (validServices.length > 0) {
      lines.push("", "Other services I'm interested in:", validServices.join(", "));
    }
  }

  // Notes
  if (data.notes && data.notes.trim()) {
    lines.push("", "Notes:", data.notes.trim());
  }

  lines.push("", "Please confirm the property/details and availability.");

  const message = lines.join("\n");
  const phone = BUSINESS_CONFIG.contact.whatsappInternational;
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

/**
 * Builds the prefilled WhatsApp URL and text for exterior-only enquiries
 * @param {Object} data 
 * @returns {string} WhatsApp URL
 */
export function buildExteriorWhatsAppUrl(data) {
  const lines = [
    "Hi HYDREX, I'd like to request an exterior cleaning quote.",
    "",
    "Name:",
    data.name ? data.name.trim() : "[Not provided]",
    "",
    "Address:",
    [data.houseNumber, data.street].filter(Boolean).join(" ") || "[Not provided]",
    "",
    "Postcode:",
    data.postcode ? formatUkPostcode(data.postcode) : "[Not provided]",
  ];

  if (data.services && data.services.length > 0) {
    const validServices = data.services
      .map(id => {
        const s = BUSINESS_CONFIG.exteriorServices.find(item => item.id === id);
        return s ? s.name : id;
      })
      .filter(Boolean);
    
    lines.push("", "Services requested:", validServices.join(", "));
  }

  if (data.propertyType) {
    lines.push("", "Property type:", data.propertyType);
  }

  if (data.notes && data.notes.trim()) {
    lines.push("", "Notes / Property details:", data.notes.trim());
  }

  lines.push(
    "",
    "I can provide photos of the property through WhatsApp to help with the quote. Please let me know your availability."
  );

  const message = lines.join("\n");
  const phone = BUSINESS_CONFIG.contact.whatsappInternational;
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

// Make accessible in browser scripts
if (typeof window !== 'undefined') {
  window.HYDREX_PRICING = {
    isValidUkPostcode,
    formatUkPostcode,
    normaliseFrequency,
    calculateWindowPrice,
    buildWindowWhatsAppUrl,
    buildExteriorWhatsAppUrl,
  };
}
