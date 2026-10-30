const menuToggle = document.getElementById('menuToggle');
const nav = document.getElementById('nav');
menuToggle?.addEventListener('click', () => {
  const isOpen = nav.classList.toggle('open');
  menuToggle.setAttribute('aria-expanded', String(isOpen));
  menuToggle.setAttribute('aria-label', isOpen ? 'Close navigation' : 'Open navigation');
});
nav?.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
  nav.classList.remove('open'); menuToggle?.setAttribute('aria-expanded', 'false');
}));

document.getElementById('themeToggle')?.addEventListener('click', () => {
  document.body.classList.toggle('light-mode');
  const light = document.body.classList.contains('light-mode');
  document.getElementById('themeToggle').textContent = light ? '☀' : '☾';
  document.getElementById('themeToggle').setAttribute('aria-label', light ? 'Switch to dark theme' : 'Switch to light theme');
});
document.getElementById('year').textContent = new Date().getFullYear();

// Leaflet interactive map. Uses OpenStreetMap tiles and a marker in Bengaluru.
if (window.L && document.getElementById('map')) {
  const map = L.map('map', { scrollWheelZoom: false }).setView([12.9716, 77.5946], 10);
  const street = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>'
  });
  const satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 19, attribution: 'Tiles &copy; Esri'
  });
  street.addTo(map);
  L.control.layers({ 'Street map': street, 'Satellite imagery': satellite }, null, { collapsed: false }).addTo(map);
  const marker = L.marker([12.9716, 77.5946]).addTo(map).bindPopup('<strong>Bengaluru, Karnataka</strong><br><small>Switch to satellite imagery using the layer control.</small>');
  marker.openPopup();
  map.on('mousemove', event => {
    const lat = event.latlng.lat.toFixed(4), lng = event.latlng.lng.toFixed(4);
    document.getElementById('mapCoords').textContent = `${lat}°, ${lng}°`;
  });
  setTimeout(() => map.invalidateSize(), 250);
} else {
  const mapElement = document.getElementById('map');
  if (mapElement) mapElement.innerHTML = '<p style="padding:20px;color:#234">The map library could not load. Check your internet connection and reload the page.</p>';
}

// Contact form: sends the message through Formspree.
// Paste your own Formspree link below (it looks like https://formspree.io/f/abcdwxyz).
const FORMSPREE_URL = 'https://formspree.io/f/YOUR_FORM_ID';

document.getElementById('contactForm')?.addEventListener('submit', async event => {
  event.preventDefault();
  const form = event.currentTarget;
  const hint = document.getElementById('formHint');
  const button = form.querySelector('button[type="submit"]');
  const data = new FormData(form);
  const name = String(data.get('name') || '').trim();
  const senderEmail = String(data.get('email') || '').trim();
  const message = String(data.get('message') || '').trim();

  // Fallback: if the Formspree link has not been added yet, open the visitor's email app instead.
  if (FORMSPREE_URL.includes('YOUR_FORM_ID')) {
    const subject = encodeURIComponent(`Portfolio enquiry from ${name}`);
    const body = encodeURIComponent(`Hi Arshiya,\n\n${message}\n\nFrom: ${name}\nReply email: ${senderEmail}`);
    hint.textContent = 'Your email app should open with the message prepared. Please review and send it there.';
    window.location.href = `mailto:arshiyanaaz7798@gmail.com?subject=${subject}&body=${body}`;
    return;
  }

  button.disabled = true;
  hint.textContent = 'Sending...';
  try {
    const response = await fetch(FORMSPREE_URL, {
      method: 'POST',
      headers: { 'Accept': 'application/json' },
      body: data
    });
    if (response.ok) {
      form.reset();
      hint.textContent = 'Thank you! Your message has been sent. I will reply to you soon.';
    } else {
      hint.textContent = 'Sorry, the message could not be sent. Please email me directly at arshiyanaaz7798@gmail.com.';
    }
  } catch (error) {
    hint.textContent = 'Sorry, something went wrong. Please email me directly at arshiyanaaz7798@gmail.com.';
  }
  button.disabled = false;
});
