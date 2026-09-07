/** Small DOM helpers. Deliberately thin — this is not a framework. */

export const qs = (selector, root = document) => root.querySelector(selector);
export const qsa = (selector, root = document) => [...root.querySelectorAll(selector)];

/**
 * Create an element.
 * @param {string} tag
 * @param {object} [props]  className, text, html, dataset, aria/other attributes
 * @param {Array<Node|string>} [children]
 */
export function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);

  for (const [key, value] of Object.entries(props)) {
    if (value == null || value === false) continue;

    if (key === 'className') node.className = value;
    else if (key === 'text') node.textContent = value;
    else if (key === 'html') node.innerHTML = value;
    else if (key === 'dataset') Object.assign(node.dataset, value);
    else if (key === 'style') setStyle(node, value);
    else if (key.startsWith('on') && typeof value === 'function') {
      node.addEventListener(key.slice(2).toLowerCase(), value);
    } else node.setAttribute(key, value === true ? '' : value);
  }

  for (const child of [].concat(children)) {
    if (child == null) continue;
    node.append(child);
  }

  return node;
}

/**
 * Apply a style object, routing custom properties through setProperty.
 *
 * Object.assign onto a CSSStyleDeclaration silently drops anything starting
 * with `--`: it writes a plain JS property on the declaration object and the
 * element's inline style never hears about it. Every staggered bar animation
 * and every bar positioned by a custom property depends on these landing.
 */
function setStyle(node, styles) {
  for (const [property, value] of Object.entries(styles)) {
    if (property.startsWith('--')) node.style.setProperty(property, value);
    else node.style[property] = value;
  }
}

/** Replace all children in one go. */
export function replace(parent, ...children) {
  parent.replaceChildren(...children.flat().filter(Boolean));
}

/**
 * Trailing debounce. Used by the search box so we issue one request per pause,
 * not one per keystroke.
 */
export function debounce(fn, wait = 250) {
  let timer;
  const debounced = (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
  debounced.cancel = () => clearTimeout(timer);
  return debounced;
}
