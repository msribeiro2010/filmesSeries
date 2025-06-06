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

const { JSDOM } = require('jsdom');

const html = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');

describe('toggleMenu', () => {
  let dom;
  let document;
  beforeEach(() => {
    dom = new JSDOM(html, { runScripts: 'dangerously' });
    document = dom.window.document;
    global.window = dom.window;
    global.document = document;
    global.localStorage = {
      getItem: jest.fn(),
      setItem: jest.fn()
    };
    // simulate DOMContentLoaded and load script
    dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));
    require('../script.js');
  });

  test('should toggle nav visibility and class', () => {
    const { window } = dom;
    const btn = document.querySelector('.hamburger');
    const nav = document.querySelector('.main-nav');
    const overlay = document.querySelector('.nav-overlay');

    expect(nav.hasAttribute('hidden')).toBe(true);
    expect(nav.classList.contains('show')).toBe(false);

    // call toggleMenu
    window.toggleMenu();

    expect(nav.hasAttribute('hidden')).toBe(false);
    expect(nav.classList.contains('show')).toBe(true);

    window.toggleMenu();

    expect(nav.hasAttribute('hidden')).toBe(true);
    expect(nav.classList.contains('show')).toBe(false);
  });
});
