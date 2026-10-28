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
      totalSteps: 5,
      postcode: '',
      propertyId: '',
      frequency: '4w',
      extras: {
        conservatory: false,
        extension: false,
      },
      otherServices: [],
      notes: '',
      // Calculated
      calculation: null,
    };

    this.loadPersistedState();
    this.handleUrlParameters();
    this.state.step = Math.min(this.state.totalSteps, Math.max(1, Number(this.state.step) || 1));
    this.render();
  }

  loadPersistedState() {
    try {
      const saved = sessionStorage.getItem('hydrex_quote_draft');
      if (saved) {
        const parsed = JSON.parse(saved);
        const { email, name, phone, houseNumber, street, ...draft } = parsed;
        this.state = { ...this.state, ...draft };
        this.persistState();
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
    const progressPercent = Math.round((step / this.state.totalSteps) * 100);

    let stepHtml = '';
    switch (step) {
      case 1: stepHtml = this.renderStep1Postcode(); break;
      case 2: stepHtml = this.renderStep2Property(); break;
      case 3: stepHtml = this.renderStep3Frequency(); break;
      case 4: stepHtml = this.renderStep4Extras(); break;
      case 5: stepHtml = this.renderStep5Result(); break;
      default: stepHtml = this.renderStep1Postcode();
    }

    this.container.innerHTML = `
      <div class="quote-wizard" id="quoteWizard">
        <div class="quote-progress-bar-wrap" aria-hidden="true">
          <div class="quote-progress-bar" style="width: ${progressPercent}%;"></div>
        </div>
        <div class="quote-header">
          <span class="quote-step-indicator">Step ${step} of ${this.state.totalSteps} &bull; ${this.getStepTitle(step)}</span>
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
      case 5: return 'Your Instant Price';
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

    const whatsappUrl = buildWindowWhatsAppUrl({
      postcode: this.state.postcode,
      propertyTitle: calc.propertyTitle,
      frequency: calc.frequency,
      extrasBreakdown: calc.extrasBreakdown,
      totalPrice: calc.totalPrice,
      isManual: calc.isManual,
    });

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
          <a class="btn btn-whatsapp btn-lg" id="btnRequestClean" href="${whatsappUrl}" target="_blank" rel="noopener noreferrer">Ask about my quote on WhatsApp &rarr;</a>
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
        <a class="btn btn-whatsapp btn-lg" id="btnRequestClean" href="${whatsappUrl}" target="_blank" rel="noopener noreferrer">Ask about my quote on WhatsApp &rarr;</a>
      </div>
    `;
  }

  renderExteriorFlow() {
    const services = BUSINESS_CONFIG.exteriorServices;
    const selected = this.state.otherServices || [];

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
            Select a service and add your postcode. No email, account or contact form—send photos and any extra details in WhatsApp.
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

            <div class="form-group" style="max-width: 320px;">
              <label for="extPostcode" class="form-label">Postcode *</label>
              <input type="text" id="extPostcode" class="form-input" required value="${this.state.postcode || ''}" placeholder="e.g. DE22 1FL" autocomplete="postal-code">
              <div class="form-error-msg" id="extPostcodeError">Please enter a valid UK postcode.</div>
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
      btnBack.addEventListener('click', () => this.setStep(step - 1));
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
      const btnReset = document.getElementById('btnResetQuote');

      if (btnEdit) btnEdit.addEventListener('click', () => this.setStep(2));
      if (btnReset) btnReset.addEventListener('click', () => this.setStep(1));
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

    const handleExteriorSubmit = () => {
      const selected = Array.from(chks).filter(c => c.checked).map(c => c.value);
      const servicesError = document.getElementById('extServicesError');
      if (selected.length === 0) {
        servicesError.classList.add('visible');
        return;
      }
      servicesError.classList.remove('visible');

      const postcodeInput = document.getElementById('extPostcode');
      const postcodeError = document.getElementById('extPostcodeError');
      const postcode = postcodeInput.value.trim();
      if (!isValidUkPostcode(postcode)) {
        postcodeError.classList.add('visible');
        postcodeInput.classList.add('is-invalid');
        return;
      }
      postcodeError.classList.remove('visible');
      postcodeInput.classList.remove('is-invalid');

      const notes = document.getElementById('extNotes').value.trim();

      this.state.postcode = formatUkPostcode(postcode);
      this.state.notes = notes;
      this.state.otherServices = selected;
      this.persistState();

      const url = buildExteriorWhatsAppUrl({
        postcode: this.state.postcode,
        services: selected,
        notes,
      });

      window.open(url, '_blank', 'noopener,noreferrer');
    };

    if (form) form.addEventListener('submit', (e) => { e.preventDefault(); handleExteriorSubmit(); });
  }
}

// Auto-initialize if container present
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('quoteContainer')) {
    window.hydrexWizard = new HydrexQuoteWizard('quoteContainer');
  }
});
