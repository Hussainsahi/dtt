/* Karmic Waves — single configuration object.
 * Everything a non-developer may need to change lives here.
 * Nothing in this file is secret: it ships to the browser.
 */
window.KW = window.KW || {};
window.KW.freeBirthSound = {
  brand: 'Karmic Waves',

  // Business WhatsApp number in international format WITHOUT "+" (e.g. "919876543210").
  // PENDING: replace the placeholder before launch. The app refuses to open wa.me while it is a placeholder.
  businessWhatsApp: '91XXXXXXXXXX',

  // Meta Pixel ID. Empty string = Pixel disabled (no base code injected, no events).
  metaPixelId: '',

  // Backend endpoint that stores the lead. Same-origin Vercel function by default.
  leadEndpoint: '/api/lead',

  // Set to true to let the page open WhatsApp even when the lead endpoint is unreachable
  // (e.g. a pure static host with manual delivery). The Pixel Lead still does NOT fire then.
  allowWhatsAppWithoutBackend: false,

  site: {
    url: 'https://karmicwaves.example.com', // PENDING: production domain
    title: 'Karmic Waves — Your Birth Date Has a Sound. Hear Yours, Free.',
    description:
      'Select your Date of Birth and explore your 3 free Birth-Month Sound Tracks, inspired by traditional Vedic Naad practice. Delivered on WhatsApp.',
    ogImage: 'https://karmicwaves.example.com/og-image.jpg', // PENDING: 1200×630 image
    locale: 'en_IN'
  },

  // Trust strip. Rendered only when verified === true for an item. No invented numbers.
  trust: [
    { label: 'Listeners who received their kit', value: '', verified: false },
    { label: 'Average rating', value: '', verified: false },
    { label: 'Free kits sent', value: '', verified: false }
  ],

  // Reviews: only entries with approved === true render. Section hides when none are approved.
  reviews: [
    // { id: 'r1', name: 'First name', city: 'City', month: 'November', text: '…', time: '11:04 PM', approved: false }
  ],

  // Legal / contact placeholders. Keep [CLIENT TO CONFIRM] until the business answers.
  legal: {
    entityName: '[CLIENT TO CONFIRM] legal entity name',
    contactEmail: '[CLIENT TO CONFIRM] contact email',
    address: '[CLIENT TO CONFIRM] registered address',
    retentionDays: '[CLIENT TO CONFIRM] (default proposed: 365 days)',
    grievanceOfficer: '[CLIENT TO CONFIRM] grievance officer name',
    consentTextVersion: 'v1-2026-11'
  },

  // Allowed birth years in the selector.
  years: { min: 1955, max: 2008 },

  // Track slots: the same three titles for every month.
  trackTitles: ['Morning Aura Igniter', 'Daytime Focus Shield', '11:00 PM Deep Night Ritual'],

  /* Month map — the ONLY place that decides which audio a visitor receives.
   * Selection uses birth MONTH only; day and year never influence it.
   * This is a traditional-inspired creative mapping, not an astronomical or validated system.
   * `format` and `sizeBytes` are displayed only when `verified: true` (set after the real file is checked).
   */
  months: {
    1:  { name: 'January',   element: 'Prithvi', hz: 396,   tattva: 'Earth', tracks: [
          { id: 'jan-morning', title: 'Morning Aura Igniter',      file: '01-jan_morning.mp3', format: '', sizeBytes: 0, verified: false },
          { id: 'jan-day',     title: 'Daytime Focus Shield',      file: '01-jan_day.mp3',     format: '', sizeBytes: 0, verified: false },
          { id: 'jan-night',   title: '11:00 PM Deep Night Ritual', file: '01-jan_night.mp3',   format: '', sizeBytes: 0, verified: false } ] },
    2:  { name: 'February',  element: 'Jala',    hz: 417,   tattva: 'Water', tracks: [
          { id: 'feb-morning', title: 'Morning Aura Igniter',      file: '02-feb_morning.mp3', format: '', sizeBytes: 0, verified: false },
          { id: 'feb-day',     title: 'Daytime Focus Shield',      file: '02-feb_day.mp3',     format: '', sizeBytes: 0, verified: false },
          { id: 'feb-night',   title: '11:00 PM Deep Night Ritual', file: '02-feb_night.mp3',   format: '', sizeBytes: 0, verified: false } ] },
    3:  { name: 'March',     element: 'Agni',    hz: 432.8, tattva: 'Fire',  tracks: [
          { id: 'mar-morning', title: 'Morning Aura Igniter',      file: '03-mar_morning.mp3', format: '', sizeBytes: 0, verified: false },
          { id: 'mar-day',     title: 'Daytime Focus Shield',      file: '03-mar_day.mp3',     format: '', sizeBytes: 0, verified: false },
          { id: 'mar-night',   title: '11:00 PM Deep Night Ritual', file: '03-mar_night.mp3',   format: '', sizeBytes: 0, verified: false } ] },
    4:  { name: 'April',     element: 'Vayu',    hz: 528,   tattva: 'Air',   tracks: [
          { id: 'apr-morning', title: 'Morning Aura Igniter',      file: '04-apr_morning.mp3', format: '', sizeBytes: 0, verified: false },
          { id: 'apr-day',     title: 'Daytime Focus Shield',      file: '04-apr_day.mp3',     format: '', sizeBytes: 0, verified: false },
          { id: 'apr-night',   title: '11:00 PM Deep Night Ritual', file: '04-apr_night.mp3',   format: '', sizeBytes: 0, verified: false } ] },
    5:  { name: 'May',       element: 'Akasha',  hz: 639,   tattva: 'Space', tracks: [
          { id: 'may-morning', title: 'Morning Aura Igniter',      file: '05-may_morning.mp3', format: '', sizeBytes: 0, verified: false },
          { id: 'may-day',     title: 'Daytime Focus Shield',      file: '05-may_day.mp3',     format: '', sizeBytes: 0, verified: false },
          { id: 'may-night',   title: '11:00 PM Deep Night Ritual', file: '05-may_night.mp3',   format: '', sizeBytes: 0, verified: false } ] },
    6:  { name: 'June',      element: 'Jala',    hz: 417,   tattva: 'Water', tracks: [
          { id: 'jun-morning', title: 'Morning Aura Igniter',      file: '06-jun_morning.mp3', format: '', sizeBytes: 0, verified: false },
          { id: 'jun-day',     title: 'Daytime Focus Shield',      file: '06-jun_day.mp3',     format: '', sizeBytes: 0, verified: false },
          { id: 'jun-night',   title: '11:00 PM Deep Night Ritual', file: '06-jun_night.mp3',   format: '', sizeBytes: 0, verified: false } ] },
    7:  { name: 'July',      element: 'Agni',    hz: 432.8, tattva: 'Fire',  tracks: [
          { id: 'jul-morning', title: 'Morning Aura Igniter',      file: '07-jul_morning.mp3', format: '', sizeBytes: 0, verified: false },
          { id: 'jul-day',     title: 'Daytime Focus Shield',      file: '07-jul_day.mp3',     format: '', sizeBytes: 0, verified: false },
          { id: 'jul-night',   title: '11:00 PM Deep Night Ritual', file: '07-jul_night.mp3',   format: '', sizeBytes: 0, verified: false } ] },
    8:  { name: 'August',    element: 'Prithvi', hz: 396,   tattva: 'Earth', tracks: [
          { id: 'aug-morning', title: 'Morning Aura Igniter',      file: '08-aug_morning.mp3', format: '', sizeBytes: 0, verified: false },
          { id: 'aug-day',     title: 'Daytime Focus Shield',      file: '08-aug_day.mp3',     format: '', sizeBytes: 0, verified: false },
          { id: 'aug-night',   title: '11:00 PM Deep Night Ritual', file: '08-aug_night.mp3',   format: '', sizeBytes: 0, verified: false } ] },
    9:  { name: 'September', element: 'Vayu',    hz: 528,   tattva: 'Air',   tracks: [
          { id: 'sep-morning', title: 'Morning Aura Igniter',      file: '09-sep_morning.mp3', format: '', sizeBytes: 0, verified: false },
          { id: 'sep-day',     title: 'Daytime Focus Shield',      file: '09-sep_day.mp3',     format: '', sizeBytes: 0, verified: false },
          { id: 'sep-night',   title: '11:00 PM Deep Night Ritual', file: '09-sep_night.mp3',   format: '', sizeBytes: 0, verified: false } ] },
    10: { name: 'October',   element: 'Akasha',  hz: 741,   tattva: 'Space', tracks: [
          { id: 'oct-morning', title: 'Morning Aura Igniter',      file: '10-oct_morning.mp3', format: '', sizeBytes: 0, verified: false },
          { id: 'oct-day',     title: 'Daytime Focus Shield',      file: '10-oct_day.mp3',     format: '', sizeBytes: 0, verified: false },
          { id: 'oct-night',   title: '11:00 PM Deep Night Ritual', file: '10-oct_night.mp3',   format: '', sizeBytes: 0, verified: false } ] },
    11: { name: 'November',  element: 'Jala',    hz: 417,   tattva: 'Water', tracks: [
          { id: 'nov-morning', title: 'Morning Aura Igniter',      file: '11-nov_morning.mp3', format: '', sizeBytes: 0, verified: false },
          { id: 'nov-day',     title: 'Daytime Focus Shield',      file: '11-nov_day.mp3',     format: '', sizeBytes: 0, verified: false },
          { id: 'nov-night',   title: '11:00 PM Deep Night Ritual', file: '11-nov_night.mp3',   format: '', sizeBytes: 0, verified: false } ] },
    12: { name: 'December',  element: 'Akasha',  hz: 852,   tattva: 'Space', tracks: [
          { id: 'dec-morning', title: 'Morning Aura Igniter',      file: '12-dec_morning.mp3', format: '', sizeBytes: 0, verified: false },
          { id: 'dec-day',     title: 'Daytime Focus Shield',      file: '12-dec_day.mp3',     format: '', sizeBytes: 0, verified: false },
          { id: 'dec-night',   title: '11:00 PM Deep Night Ritual', file: '12-dec_night.mp3',   format: '', sizeBytes: 0, verified: false } ] }
  }
};
