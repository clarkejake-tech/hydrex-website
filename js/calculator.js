/**
 * HYDREX - Interactive Multi-Step Quote Calculator
 * Powers the "GET MY PRICE" customer journey from postcode to instant price & WhatsApp handoff.
 */

import { BUSINESS_CONFIG } from './config.js';
import { calculateWindowPrice, isValidUkPostcode, formatUkPostcode, buildWindowWhatsAppUrl, buildExteriorWhatsAppUrl } from './pricing-engine.js';

export class HydrexQuoteWizard {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) return;

    this.state = {
      mode: 'window', // 'window' or 'exterior-only'
      step: 1,
      totalSteps: 8,
      postcode: '',
      propertyId: '',
      frequency: '4w',
      extras: {
        conservatory: false,
        extension: false,
      },
      otherServices: [],
      // Contact
      name: '',
      phone: '',
      houseNumber: '',
      street: '',
      email: '',
      notes: '',
      // Calculated
      calculation: null,
    };

    this.loadPersistedState();
    this.handleUrlParameters();
    this.render();
  }

  loadPersistedState() {
    try {
      const saved = sessionStorage.getItem('hydrex_quote_draft');
      if (saved) {
        const parsed = JSON.parse(saved);
        this.state = { ...this.state, ...parsed };
      }
    } catch (e) {
      // storage unavailable
    }
  }

  persistState() {
    try {
      sessionStorage.setItem('hydrex_quote_draft', JSON.stringify(this.state));
    } catch (e) {
      // storage unavailable
    }
  }

  handleUrlParameters() {
    try {
      const params = new URLSearchParams(window.location.search);
      const post = params.get('postcode');
      const prop = params.get('property');
      const freq = params.get('freq');
      const mode = params.get('mode');

      if (post && isValidUkPostcode(post)) this.state.postcode = formatUkPostcode(post);
      if (prop && BUSINESS_CONFIG.windowPricing[prop]) this.state.propertyId = prop;
      if (freq && (freq === '4w' || freq === '8w')) this.state.frequency = freq;
      if (mode === 'exterior') this.state.mode = 'exterior-only';
    } catch (e) {}
  }

  setStep(step) {
    this.state.step = Math.max(1, Math.min(step, this.state.totalSteps));
    this.persistState();
    this.render();
    window.scrollTo({ top: this.container.offsetTop - 90, behavior: 'smooth' });
  }

  recalculate() {
    if (!this.state.propertyId) return;
    this.state.calculation = calculateWindowPrice(
      this.state.propertyId,
      this.state.frequency,
      this.state.extras
    );
  }

  render() {
    if (this.state.mode === 'exterior-only') {
      this.renderExteriorFlow();
      return;
    }

    this.recalculate();
    const { step } = this.state;
    const progressPercent = Math.round((step / 8) * 100);

    let stepHtml = '';
    switch (step) {
      case 1: stepHtml = this.renderStep1Postcode(); break;
      case 2: stepHtml = this.renderStep2Property(); break;
      case 3: stepHtml = this.renderStep3Frequency(); break;
      case 4: stepHtml = this.renderStep4Extras(); break;
      case 5: stepHtml = this.renderStep5Result(); break;
      case 6: stepHtml = this.renderStep6OtherServices(); break;
      case 7: stepHtml = this.renderStep7Details(); break;
      case 8: stepHtml = this.renderStep8Summary(); break;
      default: stepHtml = this.renderStep1Postcode();
    }

    this.container.innerHTML = `
      <div class="quote-wizard" id="quoteWizard">
        <div class="quote-progress-bar-wrap" aria-hidden="true">
          <div class="quote-progress-bar" style="width: ${progressPercent}%;"></div>
        </div>
        <div class="quote-header">
          <span class="quote-step-indicator">Step ${step} of 8 &bull; ${this.getStepTitle(step)}</span>
          ${step > 1 ? `
            <button type="button" class="quote-back-btn" id="btnBackStep">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
              Back
            </button>
          ` : `
            <button type="button" class="quote-back-btn" id="btnSwitchToExterior" style="color:var(--accent-cyan);">
              Exterior Only Quote &rarr;
            </button>
          `}
        </div>
        <div class="quote-step-content">
          ${stepHtml}
        </div>
      </div>
    `;

    this.attachEvents();
  }

  getStepTitle(step) {
    switch (step) {
      case 1: return 'Your Postcode';
      case 2: return 'Property Type';
      case 3: return 'Cleaning Schedule';
      case 4: return 'Window Extras';
      case 5: return 'Your Regular Price';
      case 6: return 'Additional Services';
      case 7: return 'Your Details';
      case 8: return 'Confirm & WhatsApp';
      default: return '';
    }
  }

  renderStep1Postcode() {
    return `
      <h2 class="step-question-title">What's your postcode?</h2>
      <p class="step-question-desc">We clean residential properties across Derby and surrounding areas. Enter your postcode to begin your instant regular price.</p>

      <form id="step1Form" onsubmit="return false;">
        <div class="form-group" style="max-width: 360px; margin: 0 auto 24px auto;">
          <label for="inputPostcode" class="form-label" style="text-align:center;">UK Postcode</label>
          <input 
            type="text" 
            id="inputPostcode" 
            class="form-input form-input-lg" 
            placeholder="e.g. DE22 3NE" 
            value="${this.state.postcode || ''}" 
            autocomplete="postal-code"
            autofocus
          >
          <div class="form-error-msg" id="postcodeError">Please enter a valid UK postcode (e.g. DE1 2AB).</div>
          <p class="form-hint" style="text-align:center;">Address details & schedule are confirmed before your first clean.</p>
        </div>

        <div style="text-align: center;">
          <button type="submit" class="btn btn-primary btn-lg" id="btnSubmitPostcode" style="min-width: 220px;">
            Continue &rarr;
          </button>
        </div>
      </form>
    `;
  }

  renderStep2Property() {
    const props = Object.entries(BUSINESS_CONFIG.windowPricing);
    return `
      <h2 class="step-question-title">What type of property is it?</h2>
      <p class="step-question-desc">Select the category that best describes your home. Prices reflect typical residential glazing sizes.</p>

      <div class="options-grid options-grid-props" role="radiogroup" aria-label="Select property type">
        ${props.map(([id, p]) => {
          const isSelected = this.state.propertyId === id;
          return `
            <div 
              class="option-card ${isSelected ? 'selected' : ''}" 
              data-prop-id="${id}" 
              role="radio" 
              aria-checked="${isSelected}"
              tabindex="0"
            >
              <div>
                <div class="option-card-label">${p.title}</div>
                <div class="option-card-sub">${p.subtitle || ''}</div>
              </div>
              ${p.fourWeekly ? `<div class="option-card-price-badge">From £${p.fourWeekly}</div>` : ''}
            </div>
          `;
        }).join('')}
      </div>

      <div style="margin-top: 24px; text-align: right;">
        <button type="button" class="btn btn-primary" id="btnNextProperty" ${!this.state.propertyId ? 'disabled style="opacity:0.5;cursor:not-allowed;"' : ''}>
          Continue &rarr;
        </button>
      </div>
    `;
  }

  renderStep3Frequency() {
    return `
      <h2 class="step-question-title">How often would you like us to clean?</h2>
      <p class="step-question-desc">Choose your regular window cleaning schedule. Glass, frames & sills are included on every clean.</p>

      <div class="freq-cards-grid" role="radiogroup" aria-label="Cleaning Frequency">
        <div 
          class="freq-card ${this.state.frequency === '4w' ? 'selected' : ''}" 
          data-freq="4w"
          role="radio"
          aria-checked="${this.state.frequency === '4w'}"
          tabindex="0"
        >
          <span class="freq-card-badge">Most Popular</span>
          <div class="freq-card-title">Every 4 Weeks</div>
          <p class="freq-card-desc">Consistent regular clean keeping your glazing, frames and sills crystal clear throughout the year.</p>
        </div>

        <div 
          class="freq-card ${this.state.frequency === '8w' ? 'selected' : ''}" 
          data-freq="8w"
          role="radio"
          aria-checked="${this.state.frequency === '8w'}"
          tabindex="0"
        >
          <span class="freq-card-badge">Alternate Schedule</span>
          <div class="freq-card-title">Every 8 Weeks</div>
          <p class="freq-card-desc">Scheduled every two months. Great low-maintenance option for residential properties.</p>
        </div>
      </div>

      <div style="margin-top: 32px; text-align: right;">
        <button type="button" class="btn btn-primary" id="btnNextFrequency">
          Continue &rarr;
        </button>
      </div>
    `;
  }

  renderStep4Extras() {
    const hasCons = this.state.extras.conservatory;
    const hasExt = this.state.extras.extension;

    return `
      <h2 class="step-question-title">Does the property have any extras?</h2>
      <p class="step-question-desc">Select any additional glazing areas to be cleaned as part of your regular visit.</p>

      <div class="options-grid">
        <label class="option-card ${hasCons ? 'selected' : ''}" style="cursor: pointer;">
          <div>
            <div class="option-card-label">Conservatory with additional glass</div>
            <div class="option-card-sub">Includes conservatory side window panes and doors. (Note: Conservatory roof cleaning is a separate exterior service).</div>
          </div>
          <div style="display:flex;align-items:center;gap:12px;">
            <span class="option-card-price-badge">+£5</span>
            <input type="checkbox" id="checkConservatory" ${hasCons ? 'checked' : ''} style="width:18px;height:18px;accent-color:var(--accent-cyan);">
          </div>
        </label>

        <label class="option-card ${hasExt ? 'selected' : ''}" style="cursor: pointer;">
          <div>
            <div class="option-card-label">Extension with additional windows</div>
            <div class="option-card-sub">Ground or first-floor extension with extra glazing/patio doors.</div>
          </div>
          <div style="display:flex;align-items:center;gap:12px;">
            <span class="option-card-price-badge">+£5</span>
            <input type="checkbox" id="checkExtension" ${hasExt ? 'checked' : ''} style="width:18px;height:18px;accent-color:var(--accent-cyan);">
          </div>
        </label>
      </div>

      <div style="margin-top: 32px; display: flex; justify-content: space-between; align-items: center;">
        <button type="button" class="btn btn-secondary" id="btnSkipExtras">Neither / No Extras</button>
        <button type="button" class="btn btn-primary" id="btnNextExtras">Calculate My Price &rarr;</button>
      </div>
    `;
  }

  renderStep5Result() {
    const calc = this.state.calculation;

    if (!calc || !calc.isValid) {
      return `
        <div style="text-align: center; padding: 24px;">
          <h2 class="step-question-title">Could not calculate price</h2>
          <p class="step-question-desc">Please check your property selections.</p>
          <button type="button" class="btn btn-primary" id="btnResetQuote">Start Over</button>
        </div>
      `;
    }

    if (calc.isManual) {
      return `
        <div class="price-display-card">
          <div class="price-display-tag">HYDREX BESPOKE ENQUIRY</div>
          <div class="price-display-amount" style="font-size: 2.8rem;">Manual Quote</div>
          <div class="price-display-freq">${calc.frequencyLabel}</div>
          <p style="color:var(--text-secondary);max-width:540px;margin:0 auto 20px auto;">
            Because you selected "Something different / not sure", we'll provide a straightforward bespoke price tailored specifically to your home.
          </p>
          <div class="price-display-includes">
            <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
            Glass, frames & sills included as standard
          </div>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
          <button type="button" class="btn btn-secondary" id="btnEditSelections">Change Property Details</button>
          <button type="button" class="btn btn-primary btn-lg" id="btnRequestClean">Continue to Request Quote &rarr;</button>
        </div>
      `;
    }

    return `
      <div class="price-display-card">
        <div class="price-display-tag">YOUR HYDREX PRICE</div>
        <div class="price-display-amount">${calc.formattedPrice}</div>
        <div class="price-display-freq">${calc.frequencyLabel}</div>
        <div class="price-display-includes">
          <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
          Glass, frames & sills included as standard
        </div>
        <p class="price-disclaimer">
          Your regular cleaning price. Standard residential glazing, frames and sills. Access and property details are checked before confirming your first clean.
        </p>
      </div>

      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
        <button type="button" class="btn btn-secondary" id="btnEditSelections">Edit Selections</button>
        <button type="button" class="btn btn-primary btn-lg" id="btnRequestClean">REQUEST MY FIRST CLEAN &rarr;</button>
      </div>
    `;
  }

  renderStep6OtherServices() {
    const services = BUSINESS_CONFIG.exteriorServices;
    const selected = this.state.otherServices || [];

    return `
      <h2 class="step-question-title">Anything else we can help with?</h2>
      <p class="step-question-desc">We also offer one-off exterior cleaning. Selecting additional services does not change your regular window price—they are quoted separately.</p>

      <div class="options-grid options-grid-2">
        ${services.map(s => {
          const isChecked = selected.includes(s.id);
          return `
            <label class="option-card ${isChecked ? 'selected' : ''}" style="cursor:pointer;">
              <div>
                <div class="option-card-label">${s.name}</div>
                <div class="option-card-sub">${s.shortDesc}</div>
              </div>
              <input type="checkbox" class="checkOtherService" value="${s.id}" ${isChecked ? 'checked' : ''} style="width:18px;height:18px;accent-color:var(--accent-cyan);">
            </label>
          `;
        }).join('')}
      </div>

      <div style="margin-top: 32px; display: flex; justify-content: space-between; align-items: center;">
        <button type="button" class="btn btn-secondary" id="btnSkipOtherServices">No other services</button>
        <button type="button" class="btn btn-primary" id="btnNextOtherServices">Continue to Details &rarr;</button>
      </div>
    `;
  }

  renderStep7Details() {
    return `
      <h2 class="step-question-title">Where should we carry out the clean?</h2>
      <p class="step-question-desc">Please supply your property address and contact details so HYDREX can verify availability and confirm your clean.</p>

      <form id="detailsForm" onsubmit="return false;">
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 16px;">
          <div class="form-group">
            <label for="inputName" class="form-label">Full Name *</label>
            <input type="text" id="inputName" class="form-input" required value="${this.state.name || ''}" placeholder="e.g. Sarah Jenkins" autocomplete="name">
            <div class="form-error-msg" id="nameError">Please enter your name.</div>
          </div>
          <div class="form-group">
            <label for="inputPhone" class="form-label">Mobile Number *</label>
            <input type="tel" id="inputPhone" class="form-input" required value="${this.state.phone || ''}" placeholder="e.g. 07123 456789" autocomplete="tel">
            <div class="form-error-msg" id="phoneError">Please enter a valid contact phone number.</div>
          </div>
        </div>

        <div style="display:grid; grid-template-columns: 1fr 2fr; gap: 16px;">
          <div class="form-group">
            <label for="inputHouse" class="form-label">House Number / Name *</label>
            <input type="text" id="inputHouse" class="form-input" required value="${this.state.houseNumber || ''}" placeholder="e.g. 42 or Rose Cottage" autocomplete="address-line1">
            <div class="form-error-msg" id="houseError">Required.</div>
          </div>
          <div class="form-group">
            <label for="inputStreet" class="form-label">Street Name *</label>
            <input type="text" id="inputStreet" class="form-input" required value="${this.state.street || ''}" placeholder="e.g. Ashbourne Road" autocomplete="address-line2">
            <div class="form-error-msg" id="streetError">Please enter your street.</div>
          </div>
        </div>

        <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 16px;">
          <div class="form-group">
            <label for="inputDetailPostcode" class="form-label">Postcode *</label>
            <input type="text" id="inputDetailPostcode" class="form-input" required value="${this.state.postcode || ''}" placeholder="e.g. DE22 3NE" autocomplete="postal-code">
            <div class="form-error-msg" id="postcodeDetailError">Valid postcode required.</div>
          </div>
          <div class="form-group">
            <label for="inputEmail" class="form-label">Email Address <span class="optional">(Optional)</span></label>
            <input type="email" id="inputEmail" class="form-input" value="${this.state.email || ''}" placeholder="e.g. sarah@example.co.uk" autocomplete="email">
          </div>
        </div>

        <div class="form-group">
          <label for="inputNotes" class="form-label">Access or Property Notes <span class="optional">(Optional)</span></label>
          <textarea id="inputNotes" class="form-textarea" rows="2" placeholder="e.g. Unlocked side gate, high level rear windows, dog in garden...">${this.state.notes || ''}</textarea>
        </div>

        <div style="text-align: right; margin-top: 24px;">
          <button type="submit" class="btn btn-primary btn-lg" id="btnSubmitDetails">
            Review & Send Request &rarr;
          </button>
        </div>
      </form>
    `;
  }

  renderStep8Summary() {
    const calc = this.state.calculation;
    const address = [this.state.houseNumber, this.state.street, this.state.postcode].filter(Boolean).join(', ');
    const extrasText = calc.extrasSummaryText || 'None';

    const selectedOther = (this.state.otherServices || [])
      .map(id => {
        const s = BUSINESS_CONFIG.exteriorServices.find(item => item.id === id);
        return s ? s.name : id;
      })
      .filter(Boolean);

    const whatsappUrl = buildWindowWhatsAppUrl({
      name: this.state.name,
      houseNumber: this.state.houseNumber,
      street: this.state.street,
      postcode: this.state.postcode,
      propertyTitle: calc.propertyTitle,
      frequency: calc.frequency,
      extrasBreakdown: calc.extrasBreakdown,
      totalPrice: calc.totalPrice,
      isManual: calc.isManual,
      otherServices: this.state.otherServices,
      notes: this.state.notes,
    });

    return `
      <h2 class="step-question-title">Summary of Your Request</h2>
      <p class="step-question-desc">Review your details below. When you tap "SEND MY REQUEST VIA WHATSAPP", a pre-filled enquiry message will open in WhatsApp so HYDREX can confirm availability.</p>

      <div class="quote-summary-box">
        <div class="summary-row">
          <span class="summary-label">Name</span>
          <span class="summary-value">${this.state.name || 'Not provided'}</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">Address</span>
          <span class="summary-value">${address || 'Not provided'}</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">Property</span>
          <span class="summary-value">${calc.propertyTitle || 'Not specified'}</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">Cleaning Frequency</span>
          <span class="summary-value">${calc.frequencyLabel || 'Every 4 weeks'}</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">Window Extras</span>
          <span class="summary-value">${extrasText}</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">Regular Window Price</span>
          <span class="summary-value summary-price-highlight">
            ${calc.isManual ? 'Manual Quote Required' : `${calc.formattedPrice} (${calc.frequencyLabel})`}
          </span>
        </div>
        ${selectedOther.length > 0 ? `
          <div class="summary-row">
            <span class="summary-label">Additional Services Requested</span>
            <span class="summary-value">${selectedOther.join(', ')}</span>
          </div>
        ` : ''}
        ${this.state.notes ? `
          <div class="summary-row">
            <span class="summary-label">Notes</span>
            <span class="summary-value">${this.state.notes}</span>
          </div>
        ` : ''}
      </div>

      <div style="background-color:rgba(21,159,232,0.06);border:1px solid var(--accent-cyan-border);border-radius:var(--radius-sm);padding:14px 18px;margin-bottom:24px;font-size:0.88rem;color:var(--text-secondary);">
        <strong>What happens next:</strong> Clicking below opens WhatsApp on your phone or computer with these details ready. You simply press send, and we confirm availability and your first clean date. No automatic appointments are made without your agreement.
      </div>

      <div style="display:flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
        <button type="button" class="btn btn-secondary" id="btnEditFromSummary">Edit Details</button>
        <a href="${whatsappUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-whatsapp btn-lg" id="btnSendWhatsApp">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-5.46-4.45-9.92-9.91-9.92zm5.74 14.12c-.24.67-1.39 1.29-1.93 1.34-.51.05-1.18.07-3.41-.85-2.86-1.19-4.7-4.1-4.84-4.29-.14-.19-1.16-1.54-1.16-2.94 0-1.4.73-2.09.99-2.37.26-.28.57-.35.77-.35.19 0 .39 0 .56.01.18.01.42-.07.66.5.24.58.83 2.02.9 2.17.07.15.12.33.02.53-.1.19-.15.31-.3.49-.15.17-.32.39-.46.52-.15.15-.31.31-.13.62.18.31.8 1.32 1.72 2.14 1.18 1.05 2.18 1.38 2.49 1.53.31.15.49.13.67-.08.19-.21.79-.92 1-1.24.21-.31.42-.26.71-.15.29.1 1.83.86 2.14 1.02.31.15.52.23.59.36.07.12.07.72-.17 1.39z"/></svg>
          SEND MY REQUEST VIA WHATSAPP
        </a>
      </div>
    `;
  }

  renderExteriorFlow() {
    const services = BUSINESS_CONFIG.exteriorServices;
    const selected = this.state.otherServices || [];

    const whatsappUrl = buildExteriorWhatsAppUrl({
      name: this.state.name,
      houseNumber: this.state.houseNumber,
      street: this.state.street,
      postcode: this.state.postcode,
      services: this.state.otherServices,
      notes: this.state.notes,
    });

    this.container.innerHTML = `
      <div class="quote-wizard" id="quoteWizard">
        <div class="quote-header">
          <span class="quote-step-indicator">EXTERIOR SERVICES QUOTE</span>
          <button type="button" class="quote-back-btn" id="btnSwitchToWindow" style="color:var(--accent-cyan);">
            &larr; Regular Window Cleaning Quote
          </button>
        </div>
        <div class="quote-step-content">
          <h2 class="step-question-title">Request an Exterior Cleaning Quote</h2>
          <p class="step-question-desc">
            Already have a window cleaner, or need a one-off exterior service? Select the services you need below. Photos sent via WhatsApp help us give you an exact fixed quote quickly.
          </p>

          <form id="exteriorForm" onsubmit="return false;">
            <div class="form-group">
              <label class="form-label">Services Required *</label>
              <div class="options-grid options-grid-2">
                ${services.map(s => {
                  const isChecked = selected.includes(s.id);
                  return `
                    <label class="option-card ${isChecked ? 'selected' : ''}" style="cursor:pointer;">
                      <div>
                        <div class="option-card-label">${s.name}</div>
                        <div class="option-card-sub">${s.shortDesc}</div>
                      </div>
                      <input type="checkbox" class="checkExtService" value="${s.id}" ${isChecked ? 'checked' : ''} style="width:18px;height:18px;accent-color:var(--accent-cyan);">
                    </label>
                  `;
                }).join('')}
              </div>
              <div class="form-error-msg" id="extServicesError">Please select at least one exterior service.</div>
            </div>

            <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 16px;">
              <div class="form-group">
                <label for="extName" class="form-label">Full Name *</label>
                <input type="text" id="extName" class="form-input" required value="${this.state.name || ''}" placeholder="e.g. Mark Taylor">
              </div>
              <div class="form-group">
                <label for="extPhone" class="form-label">Mobile Number *</label>
                <input type="tel" id="extPhone" class="form-input" required value="${this.state.phone || ''}" placeholder="e.g. 07123 456789">
              </div>
            </div>

            <div style="display:grid; grid-template-columns: 1fr 2fr; gap: 16px;">
              <div class="form-group">
                <label for="extHouse" class="form-label">House Number / Name *</label>
                <input type="text" id="extHouse" class="form-input" required value="${this.state.houseNumber || ''}" placeholder="e.g. 15">
              </div>
              <div class="form-group">
                <label for="extStreet" class="form-label">Street Name *</label>
                <input type="text" id="extStreet" class="form-input" required value="${this.state.street || ''}" placeholder="e.g. Kedleston Road">
              </div>
            </div>

            <div class="form-group" style="max-width: 320px;">
              <label for="extPostcode" class="form-label">Postcode *</label>
              <input type="text" id="extPostcode" class="form-input" required value="${this.state.postcode || ''}" placeholder="e.g. DE22 1FL">
            </div>

            <div class="form-group">
              <label for="extNotes" class="form-label">Property Details / Description <span class="optional">(Optional)</span></label>
              <textarea id="extNotes" class="form-textarea" rows="2" placeholder="e.g. North-facing roof pitch with moss build-up, block paved driveway approximately 40m2...">${this.state.notes || ''}</textarea>
            </div>

            <div style="background-color:rgba(21,159,232,0.06);border:1px solid var(--accent-cyan-border);border-radius:var(--radius-sm);padding:14px 18px;margin-bottom:24px;font-size:0.88rem;color:var(--text-secondary);">
              <strong>Photo Quotes:</strong> Because exterior jobs depend on access, area, and condition, sending photos via WhatsApp after submitting allows us to provide a fast, accurate price without delay.
            </div>

            <div style="text-align: right;">
              <button type="submit" class="btn btn-whatsapp btn-lg" id="btnSubmitExteriorQuote">
                SEND PHOTOS / REQUEST QUOTE ON WHATSAPP &rarr;
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    this.attachExteriorEvents();
  }

  attachEvents() {
    const { step } = this.state;

    // Back button
    const btnBack = document.getElementById('btnBackStep');
    if (btnBack) {
      btnBack.addEventListener('click', () => {
        if (step === 6) {
          this.setStep(5);
        } else {
          this.setStep(step - 1);
        }
      });
    }

    // Switch to exterior
    const btnSwitch = document.getElementById('btnSwitchToExterior');
    if (btnSwitch) {
      btnSwitch.addEventListener('click', () => {
        this.state.mode = 'exterior-only';
        this.render();
      });
    }

    // Step 1: Postcode
    if (step === 1) {
      const form = document.getElementById('step1Form');
      const input = document.getElementById('inputPostcode');
      const err = document.getElementById('postcodeError');

      const validateAndContinue = () => {
        const val = input.value.trim();
        if (!isValidUkPostcode(val)) {
          err.classList.add('visible');
          input.classList.add('is-invalid');
          return;
        }
        err.classList.remove('visible');
        input.classList.remove('is-invalid');
        this.state.postcode = formatUkPostcode(val);
        this.setStep(2);
      };

      if (form) form.addEventListener('submit', (e) => { e.preventDefault(); validateAndContinue(); });
      const btn = document.getElementById('btnSubmitPostcode');
      if (btn) btn.addEventListener('click', validateAndContinue);
    }

    // Step 2: Property Type
    if (step === 2) {
      const cards = this.container.querySelectorAll('.option-card[data-prop-id]');
      const btnNext = document.getElementById('btnNextProperty');

      cards.forEach(c => {
        c.addEventListener('click', () => {
          cards.forEach(item => item.classList.remove('selected'));
          c.classList.add('selected');
          this.state.propertyId = c.dataset.propId;
          this.recalculate();
          btnNext.removeAttribute('disabled');
          btnNext.style.opacity = '1';
          btnNext.style.cursor = 'pointer';
          // auto progress for slick experience
          setTimeout(() => this.setStep(3), 180);
        });
      });

      if (btnNext) {
        btnNext.addEventListener('click', () => {
          if (this.state.propertyId) this.setStep(3);
        });
      }
    }

    // Step 3: Frequency
    if (step === 3) {
      const cards = this.container.querySelectorAll('.freq-card[data-freq]');
      const btnNext = document.getElementById('btnNextFrequency');

      cards.forEach(c => {
        c.addEventListener('click', () => {
          cards.forEach(item => item.classList.remove('selected'));
          c.classList.add('selected');
          this.state.frequency = c.dataset.freq;
          this.recalculate();
          setTimeout(() => this.setStep(4), 180);
        });
      });

      if (btnNext) {
        btnNext.addEventListener('click', () => this.setStep(4));
      }
    }

    // Step 4: Extras
    if (step === 4) {
      const chkCons = document.getElementById('checkConservatory');
      const chkExt = document.getElementById('checkExtension');
      const btnSkip = document.getElementById('btnSkipExtras');
      const btnNext = document.getElementById('btnNextExtras');

      if (chkCons) {
        chkCons.addEventListener('change', () => {
          this.state.extras.conservatory = chkCons.checked;
          chkCons.closest('.option-card').classList.toggle('selected', chkCons.checked);
        });
      }

      if (chkExt) {
        chkExt.addEventListener('change', () => {
          this.state.extras.extension = chkExt.checked;
          chkExt.closest('.option-card').classList.toggle('selected', chkExt.checked);
        });
      }

      if (btnSkip) {
        btnSkip.addEventListener('click', () => {
          this.state.extras.conservatory = false;
          this.state.extras.extension = false;
          this.recalculate();
          this.setStep(5);
        });
      }

      if (btnNext) {
        btnNext.addEventListener('click', () => {
          this.recalculate();
          this.setStep(5);
        });
      }
    }

    // Step 5: Result
    if (step === 5) {
      const btnEdit = document.getElementById('btnEditSelections');
      const btnRequest = document.getElementById('btnRequestClean');
      const btnReset = document.getElementById('btnResetQuote');

      if (btnEdit) btnEdit.addEventListener('click', () => this.setStep(2));
      if (btnRequest) btnRequest.addEventListener('click', () => this.setStep(6));
      if (btnReset) btnReset.addEventListener('click', () => this.setStep(1));
    }

    // Step 6: Other Services
    if (step === 6) {
      const chks = this.container.querySelectorAll('.checkOtherService');
      const btnSkip = document.getElementById('btnSkipOtherServices');
      const btnNext = document.getElementById('btnNextOtherServices');

      chks.forEach(chk => {
        chk.addEventListener('change', () => {
          chk.closest('.option-card').classList.toggle('selected', chk.checked);
          const active = Array.from(chks).filter(c => c.checked).map(c => c.value);
          this.state.otherServices = active;
        });
      });

      if (btnSkip) {
        btnSkip.addEventListener('click', () => {
          this.state.otherServices = [];
          this.setStep(7);
        });
      }

      if (btnNext) {
        btnNext.addEventListener('click', () => this.setStep(7));
      }
    }

    // Step 7: Details Form
    if (step === 7) {
      const form = document.getElementById('detailsForm');
      const inputName = document.getElementById('inputName');
      const inputPhone = document.getElementById('inputPhone');
      const inputHouse = document.getElementById('inputHouse');
      const inputStreet = document.getElementById('inputStreet');
      const inputPost = document.getElementById('inputDetailPostcode');
      const inputEmail = document.getElementById('inputEmail');
      const inputNotes = document.getElementById('inputNotes');

      const validateAndContinue = () => {
        let valid = true;

        if (!inputName.value.trim()) {
          document.getElementById('nameError').classList.add('visible');
          inputName.classList.add('is-invalid');
          valid = false;
        } else {
          document.getElementById('nameError').classList.remove('visible');
          inputName.classList.remove('is-invalid');
        }

        if (!inputPhone.value.trim() || inputPhone.value.trim().length < 9) {
          document.getElementById('phoneError').classList.add('visible');
          inputPhone.classList.add('is-invalid');
          valid = false;
        } else {
          document.getElementById('phoneError').classList.remove('visible');
          inputPhone.classList.remove('is-invalid');
        }

        if (!inputHouse.value.trim()) {
          document.getElementById('houseError').classList.add('visible');
          inputHouse.classList.add('is-invalid');
          valid = false;
        } else {
          document.getElementById('houseError').classList.remove('visible');
          inputHouse.classList.remove('is-invalid');
        }

        if (!inputStreet.value.trim()) {
          document.getElementById('streetError').classList.add('visible');
          inputStreet.classList.add('is-invalid');
          valid = false;
        } else {
          document.getElementById('streetError').classList.remove('visible');
          inputStreet.classList.remove('is-invalid');
        }

        if (!isValidUkPostcode(inputPost.value.trim())) {
          document.getElementById('postcodeDetailError').classList.add('visible');
          inputPost.classList.add('is-invalid');
          valid = false;
        } else {
          document.getElementById('postcodeDetailError').classList.remove('visible');
          inputPost.classList.remove('is-invalid');
        }

        if (!valid) return;

        this.state.name = inputName.value.trim();
        this.state.phone = inputPhone.value.trim();
        this.state.houseNumber = inputHouse.value.trim();
        this.state.street = inputStreet.value.trim();
        this.state.postcode = formatUkPostcode(inputPost.value.trim());
        this.state.email = inputEmail ? inputEmail.value.trim() : '';
        this.state.notes = inputNotes ? inputNotes.value.trim() : '';

        this.setStep(8);
      };

      if (form) form.addEventListener('submit', (e) => { e.preventDefault(); validateAndContinue(); });
      const btnSubmit = document.getElementById('btnSubmitDetails');
      if (btnSubmit) btnSubmit.addEventListener('click', validateAndContinue);
    }

    // Step 8: Summary
    if (step === 8) {
      const btnEdit = document.getElementById('btnEditFromSummary');
      if (btnEdit) btnEdit.addEventListener('click', () => this.setStep(7));
    }
  }

  attachExteriorEvents() {
    const btnSwitch = document.getElementById('btnSwitchToWindow');
    if (btnSwitch) {
      btnSwitch.addEventListener('click', () => {
        this.state.mode = 'window';
        this.setStep(1);
      });
    }

    const chks = this.container.querySelectorAll('.checkExtService');
    chks.forEach(chk => {
      chk.addEventListener('change', () => {
        chk.closest('.option-card').classList.toggle('selected', chk.checked);
      });
    });

    const form = document.getElementById('exteriorForm');
    const submitBtn = document.getElementById('btnSubmitExteriorQuote');

    const handleExteriorSubmit = () => {
      const selected = Array.from(chks).filter(c => c.checked).map(c => c.value);
      const err = document.getElementById('extServicesError');
      if (selected.length === 0) {
        err.classList.add('visible');
        return;
      }
      err.classList.remove('visible');

      const name = document.getElementById('extName').value.trim();
      const phone = document.getElementById('extPhone').value.trim();
      const house = document.getElementById('extHouse').value.trim();
      const street = document.getElementById('extStreet').value.trim();
      const postcode = document.getElementById('extPostcode').value.trim();
      const notes = document.getElementById('extNotes').value.trim();

      if (!name || !phone || !house || !street || !postcode) {
        alert('Please complete all required fields (*)');
        return;
      }

      this.state.name = name;
      this.state.phone = phone;
      this.state.houseNumber = house;
      this.state.street = street;
      this.state.postcode = formatUkPostcode(postcode);
      this.state.notes = notes;
      this.state.otherServices = selected;

      const url = buildExteriorWhatsAppUrl({
        name,
        houseNumber: house,
        street,
        postcode: formatUkPostcode(postcode),
        services: selected,
        notes,
      });

      window.open(url, '_blank');
    };

    if (form) form.addEventListener('submit', (e) => { e.preventDefault(); handleExteriorSubmit(); });
    if (submitBtn) submitBtn.addEventListener('click', handleExteriorSubmit);
  }
}

// Auto-initialize if container present
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('quoteContainer')) {
    window.hydrexWizard = new HydrexQuoteWizard('quoteContainer');
  }
});
