/**
 * Automated Test Suite for HYDREX Pricing Engine
 * Verifies all 80 authoritative pricing combinations:
 * 10 property categories x 2 frequencies x 4 extra combinations = 80 test cases.
 * Plus manual quote behaviour, postcode validation, and WhatsApp message encoding.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateWindowPrice, isValidUkPostcode, formatUkPostcode, buildWindowWhatsAppUrl, buildExteriorWhatsAppUrl } from '../js/pricing-engine.js';
import { BUSINESS_CONFIG } from '../js/config.js';

// The authoritative baseline prices from specification
const AUTHORITATIVE_BASELINES = [
  { id: '1-2-bed-bungalow', name: '1–2 bed bungalow', fourWeekly: 14, eightWeekly: 18 },
  { id: '2-bed-terrace',     name: '2 bed terrace',     fourWeekly: 15, eightWeekly: 19 },
  { id: '3-bed-terrace',     name: '3 bed terrace',     fourWeekly: 16, eightWeekly: 20 },
  { id: '2-bed-semi',        name: '2 bed semi-detached', fourWeekly: 15, eightWeekly: 19 },
  { id: '3-bed-semi',        name: '3 bed semi-detached', fourWeekly: 16, eightWeekly: 20 },
  { id: '4-bed-semi',        name: '4 bed semi-detached', fourWeekly: 18, eightWeekly: 22 },
  { id: '2-bed-detached',    name: '2 bed detached',    fourWeekly: 17, eightWeekly: 21 },
  { id: '3-bed-detached',    name: '3 bed detached',    fourWeekly: 18, eightWeekly: 22 },
  { id: '4-bed-detached',    name: '4 bed detached',    fourWeekly: 20, eightWeekly: 24 },
  { id: '5-bed-detached',    name: '5 bed detached',    fourWeekly: 24, eightWeekly: 29 },
];

const EXTRA_COMBINATIONS = [
  { name: 'No extras', extras: {}, surcharge: 0 },
  { name: 'Conservatory (+£5)', extras: { conservatory: true }, surcharge: 5 },
  { name: 'Extension (+£5)', extras: { extension: true }, surcharge: 5 },
  { name: 'Both conservatory and extension (+£10)', extras: { conservatory: true, extension: true }, surcharge: 10 },
];

const FREQUENCIES = [
  { key: '4w', label: 'Every 4 weeks', baseProp: 'fourWeekly' },
  { key: '8w', label: 'Every 8 weeks', baseProp: 'eightWeekly' },
];

test('HYDREX Pricing Engine - All 80 Authoritative Combinations', async (t) => {
  let count = 0;

  for (const prop of AUTHORITATIVE_BASELINES) {
    for (const freq of FREQUENCIES) {
      for (const extraCombo of EXTRA_COMBINATIONS) {
        count++;
        const expectedBase = prop[freq.baseProp];
        const expectedTotal = expectedBase + extraCombo.surcharge;

        await t.test(`Combo #${count}: ${prop.name} | ${freq.label} | ${extraCombo.name} -> £${expectedTotal}`, () => {
          const res = calculateWindowPrice(prop.id, freq.key, extraCombo.extras);

          assert.strictEqual(res.isValid, true, 'Calculation should be valid');
          assert.strictEqual(res.isManual, false, 'Should not be manual quote');
          assert.strictEqual(res.basePrice, expectedBase, `Base price for ${prop.name} ${freq.key} should be £${expectedBase}`);
          assert.strictEqual(res.extrasPrice, extraCombo.surcharge, `Extras price should be £${extraCombo.surcharge}`);
          assert.strictEqual(res.totalPrice, expectedTotal, `Total price should be £${expectedTotal}`);
          assert.strictEqual(res.formattedPrice, `£${expectedTotal}`, `Formatted price should match £${expectedTotal}`);
        });
      }
    }
  }

  assert.strictEqual(count, 80, 'Must have verified exactly 80 distinct pricing combinations');
});

test('HYDREX Pricing Engine - Array format for extras', () => {
  const res1 = calculateWindowPrice('3-bed-semi', '4w', ['conservatory']);
  assert.strictEqual(res1.totalPrice, 16 + 5);

  const res2 = calculateWindowPrice('3-bed-semi', '4w', ['conservatory', 'extension']);
  assert.strictEqual(res2.totalPrice, 16 + 10);
});

test('HYDREX Pricing Engine - Manual quote option (Something different / not sure)', () => {
  const res = calculateWindowPrice('other', '4w', {});
  assert.strictEqual(res.isValid, true);
  assert.strictEqual(res.isManual, true);
  assert.strictEqual(res.totalPrice, null, 'Must NOT invent a price for bespoke properties');
  assert.strictEqual(res.formattedPrice, 'Quote required');
});

test('HYDREX Pricing Engine - Invalid inputs', () => {
  const invalidProp = calculateWindowPrice('mansion-10-bed', '4w');
  assert.strictEqual(invalidProp.isValid, false);

  const invalidFreq = calculateWindowPrice('3-bed-semi', 'weekly');
  assert.strictEqual(invalidFreq.isValid, false);
});

test('Postcode Validation & Formatting', () => {
  assert.strictEqual(isValidUkPostcode('DE1 1AA'), true);
  assert.strictEqual(isValidUkPostcode('de223ne'), true);
  assert.strictEqual(isValidUkPostcode('DE72 3SS'), true);
  assert.strictEqual(isValidUkPostcode('SW1A 1AA'), true);
  assert.strictEqual(isValidUkPostcode('12345'), false);
  assert.strictEqual(isValidUkPostcode(''), false);
  assert.strictEqual(isValidUkPostcode('INVALID'), false);

  assert.strictEqual(formatUkPostcode('de223ne'), 'DE22 3NE');
  assert.strictEqual(formatUkPostcode('DE11AA'), 'DE1 1AA');
});

test('WhatsApp Message Builder - Window Cleaning Format', () => {
  const url = buildWindowWhatsAppUrl({
    name: 'Sarah Jenkins',
    houseNumber: '42',
    street: 'Ashbourne Road',
    postcode: 'DE22 3AB',
    propertyTitle: '3 Bed Semi-Detached',
    frequency: '4w',
    extrasBreakdown: [{ id: 'conservatory', title: 'Conservatory glass (+£5)', surcharge: 5 }],
    totalPrice: 21,
    otherServices: ['gutter-clearing'],
    notes: 'Access via side gate which is unlocked',
  });

  assert.match(url, /^https:\/\/wa\.me\/447552907206\?text=/);
  const decoded = decodeURIComponent(url.replace('https://wa.me/447552907206?text=', ''));

  assert.match(decoded, /Hi HYDREX, I'd like to request my first regular window clean\./);
  assert.match(decoded, /Name:\s*Sarah Jenkins/);
  assert.match(decoded, /Address:\s*42 Ashbourne Road/);
  assert.match(decoded, /Postcode:\s*DE22 3AB/);
  assert.match(decoded, /Property:\s*3 Bed Semi-Detached/);
  assert.match(decoded, /Frequency:\s*4 WEEKLY/);
  assert.match(decoded, /Window extras:\s*Conservatory glass \(\+£5\)/);
  assert.match(decoded, /Website regular-clean price:\s*£21 \(4 weekly\)/);
  assert.match(decoded, /Other services I'm interested in:\s*Gutter Clearing/);
  assert.match(decoded, /Notes:\s*Access via side gate which is unlocked/);
  assert.match(decoded, /Please confirm the property\/details and availability\./);
});

test('WhatsApp Message Builder - Exterior Quote Format', () => {
  const url = buildExteriorWhatsAppUrl({
    name: 'Mark Taylor',
    houseNumber: '15',
    street: 'Kedleston Road',
    postcode: 'DE22 1FL',
    services: ['roof-cleaning', 'gutter-clearing'],
    propertyType: '4 Bed Detached',
    notes: 'Heavy moss on north facing roof pitch',
  });

  const decoded = decodeURIComponent(url.replace('https://wa.me/447552907206?text=', ''));
  assert.match(decoded, /Hi HYDREX, I'd like to request an exterior cleaning quote\./);
  assert.match(decoded, /Services requested:\s*Roof Cleaning & Moss Removal, Gutter Clearing/);
  assert.match(decoded, /I can provide photos of the property through WhatsApp/);
});
