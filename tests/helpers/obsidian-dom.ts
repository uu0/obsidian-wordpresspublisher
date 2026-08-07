// Polyfill Obsidian's HTMLElement extensions that the publish-modal section
// components rely on (createEl / createDiv / createSpan / empty / addClass /
// removeClass / hasClass) plus a jsdom gap (URL.createObjectURL).
//
// Import and call installObsidianDomPolyfill() at the top of any jsdom-based
// component test. The polyfill is idempotent so importing it from several
// files is safe.

type ElOpts = {
  cls?: string;
  text?: string;
  title?: string;
  type?: string;
  value?: string;
  href?: string;
  placeholder?: string;
  rows?: number;
  attr?: Record<string, string>;
};

export function installObsidianDomPolyfill(): void {
  const proto = HTMLElement.prototype as any;
  if (proto.createEl) return; // already installed

  proto.createEl = function (tag: string, opts: ElOpts = {}) {
    const el = document.createElement(tag);
    if (opts.cls) el.className = opts.cls;
    if (opts.text != null) el.textContent = opts.text;
    if (opts.title != null) el.setAttribute('title', opts.title);
    if (opts.type) el.setAttribute('type', opts.type);
    if (opts.value != null) (el as any).value = opts.value;
    if (opts.href) el.setAttribute('href', opts.href);
    if (opts.placeholder != null) (el as any).placeholder = opts.placeholder;
    if (opts.rows != null) (el as any).rows = opts.rows;
    if (opts.attr) {
      for (const k of Object.keys(opts.attr)) el.setAttribute(k, opts.attr[k]);
    }
    this.appendChild(el);
    return el;
  };

  proto.createDiv = function (cls?: string | { cls?: string; text?: string }) {
    let opts: { cls?: string; text?: string } = {};
    if (typeof cls === 'string') opts = { cls };
    else if (cls) opts = cls;
    const el = document.createElement('div');
    if (opts.cls) el.className = opts.cls;
    if (opts.text != null) el.textContent = opts.text;
    this.appendChild(el);
    return el;
  };

  proto.createSpan = function (opts: { text?: string; cls?: string } = {}) {
    const el = document.createElement('span');
    if (opts.cls) el.className = opts.cls;
    if (opts.text != null) el.textContent = opts.text;
    this.appendChild(el);
    return el;
  };

  proto.empty = function () {
    while (this.firstChild) this.removeChild(this.firstChild);
  };

  proto.addClass = function (cls: string) {
    cls
      .split(/\s+/)
      .filter(Boolean)
      .forEach((c: string) => this.classList.add(c));
  };

  proto.removeClass = function (cls: string) {
    cls
      .split(/\s+/)
      .filter(Boolean)
      .forEach((c: string) => this.classList.remove(c));
  };

  proto.hasClass = function (cls: string) {
    return this.classList.contains(cls);
  };

  proto.setAttr = function (attrs: Record<string, string>) {
    for (const k of Object.keys(attrs)) this.setAttribute(k, attrs[k]);
  };

  // jsdom does not implement URL.createObjectURL; the featured-image preview
  // calls it to build a blob URL for the selected image.
  if (typeof (URL as any).createObjectURL !== 'function') {
    (URL as any).createObjectURL = () => 'blob:mock';
  }
}
