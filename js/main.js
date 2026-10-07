/**
 * HYDREX - Main Interactive Client Scripts
 * Handles mobile navigation, accessible FAQ accordions,
 * campaign / UTM parameter persistence, and header dynamics.
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Mobile Menu Toggle
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const mainNav = document.getElementById('mainNav');

  if (mobileMenuBtn && mainNav) {
    mobileMenuBtn.addEventListener('click', () => {
      const isExpanded = mobileMenuBtn.getAttribute('aria-expanded') === 'true';
      mobileMenuBtn.setAttribute('aria-expanded', !isExpanded);
      mainNav.classList.toggle('open');
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      if (!mainNav.contains(e.target) && !mobileMenuBtn.contains(e.target) && mainNav.classList.contains('open')) {
        mainNav.classList.remove('open');
        mobileMenuBtn.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // 2. Accessible FAQ Accordions
  const faqButtons = document.querySelectorAll('.faq-question');
  faqButtons.forEach(button => {
    button.addEventListener('click', () => {
      const parent = button.closest('.faq-item');
      if (!parent) return;

      const isOpen = parent.classList.contains('open');

      // Close other FAQs in the same container for clean accordion UX
      const siblingItems = parent.parentElement.querySelectorAll('.faq-item');
      siblingItems.forEach(item => {
        if (item !== parent) {
          item.classList.remove('open');
          const btn = item.querySelector('.faq-question');
          if (btn) btn.setAttribute('aria-expanded', 'false');
        }
      });

      parent.classList.toggle('open', !isOpen);
      button.setAttribute('aria-expanded', !isOpen);
    });
  });

  // 3. Campaign & Leaflet UTM Parameter Preservation
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'ref', 'qr'];
    const campaignData = {};
    let hasCampaign = false;

    utmKeys.forEach(key => {
      const val = urlParams.get(key);
      if (val) {
        campaignData[key] = val;
        hasCampaign = true;
      }
    });

    if (hasCampaign) {
      sessionStorage.setItem('hydrex_campaign', JSON.stringify(campaignData));
    }
  } catch (err) {
    // Graceful fallback if storage disabled
  }

  // 4. Smooth Anchor Scrolling for on-page targets
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const targetId = this.getAttribute('href');
      if (targetId === '#' || targetId === '') return;
      const targetEl = document.querySelector(targetId);
      if (targetEl) {
        e.preventDefault();
        targetEl.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });
});
