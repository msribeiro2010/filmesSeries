const fs = require('fs');
const path = require('path');

describe('toggleMenu', () => {
  beforeEach(() => {
    const html = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
    document.documentElement.innerHTML = html;
    jest.resetModules();
    global.fetch = jest.fn(() => Promise.resolve({ json: () => Promise.resolve({ genres: [], results: [] }) }));
    require('../script.js');
    document.dispatchEvent(new Event('DOMContentLoaded'));
  });

  test('hamburger click toggles nav hidden and show class', () => {
    const button = document.querySelector('.hamburger');
    const nav = document.querySelector('.main-nav');

    // initial state
    expect(nav.hidden).toBe(true);
    expect(nav.classList.contains('show')).toBe(false);

    // first click - show
    button.click();
    expect(nav.hidden).toBe(false);
    expect(nav.classList.contains('show')).toBe(true);

    // second click - hide again
    button.click();
    expect(nav.hidden).toBe(true);
    expect(nav.classList.contains('show')).toBe(false);
  });
});
