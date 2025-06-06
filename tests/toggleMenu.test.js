const fs = require('fs');
const path = require('path');
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
const { JSDOM } = require('jsdom');

describe('toggleMenu', () => {

  beforeEach(() => {
    document.body.innerHTML = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf-8');
    global.fetch = jest.fn(() =>
      Promise.resolve({ json: () => Promise.resolve({ genres: [], results: [] }) })
    );
    window.fetch = global.fetch;

    const scriptContent = fs.readFileSync(path.join(__dirname, '../script.js'), 'utf-8');
    const scriptEl = document.createElement('script');
    scriptEl.textContent = scriptContent;
    document.body.appendChild(scriptEl);
    document.dispatchEvent(new Event('DOMContentLoaded'));
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete global.fetch;
  });

  test('body overflow and overlay class toggle correctly', () => {
    const overlay = document.querySelector('.nav-overlay');

    expect(document.body.style.overflow).toBe('');
    expect(overlay.classList.contains('active')).toBe(false);

    window.toggleMenu();

    expect(document.body.style.overflow).toBe('hidden');
    expect(overlay.classList.contains('active')).toBe(true);

    window.toggleMenu();

    expect(document.body.style.overflow).toBe('');
    expect(overlay.classList.contains('active')).toBe(false);
  });
});
