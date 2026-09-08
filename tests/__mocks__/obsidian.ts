/**
 * Mock Obsidian API for testing
 * Provides minimal implementation needed for tests
 */

export class App {
  workspace = {
    getActiveFile: jest.fn(),
    getLeaf: jest.fn()
  };
  
  vault = {
    adapter: {
      read: jest.fn(),
      write: jest.fn(),
      exists: jest.fn(),
      list: jest.fn(),
      remove: jest.fn(),
      stat: jest.fn()
    }
  };
  
  metadataCache = {
    getFileCache: jest.fn()
  };
}

export class Plugin {
  app: App;
  
  constructor() {
    this.app = new App();
  }
  
  addCommand = jest.fn();
  addRibbonIcon = jest.fn();
  addSettingTab = jest.fn();
  loadData = jest.fn();
  saveData = jest.fn();
  registerObsidianProtocolHandler = jest.fn();
}

export class Modal {
  contentEl: HTMLElement;
  
  constructor() {
    this.contentEl = document.createElement('div');
  }
  
  open = jest.fn();
  close = jest.fn();
}

export class Setting {
  constructor(_containerEl: HTMLElement) {}
  
  setName = jest.fn().mockReturnThis();
  setDesc = jest.fn().mockReturnThis();
  addText = jest.fn().mockReturnThis();
  addToggle = jest.fn().mockReturnThis();
  addDropdown = jest.fn().mockReturnThis();
  addButton = jest.fn().mockReturnThis();
}

export class Notice {
  constructor(_message: string, _timeout?: number) {}
}

/**
 * Minimal Events implementation (Obsidian's event emitter base class).
 * Mirrors the public surface used across the app: on/off/trigger/tryTrigger.
 */
export class Events {
  private handlers: Map<string, Array<(...args: any[]) => any>> = new Map();

  on(name: string, callback: (...args: any[]) => any): () => void {
    const list = this.handlers.get(name) ?? [];
    list.push(callback);
    this.handlers.set(name, list);
    return () => this.off(name, callback);
  }

  off(name: string, callback: (...args: any[]) => any): void {
    const list = this.handlers.get(name);
    if (!list) return;
    this.handlers.set(
      name,
      list.filter((cb) => cb !== callback)
    );
  }

  trigger(name: string, ...args: any[]): void {
    (this.handlers.get(name) ?? []).forEach((cb) => cb(...args));
  }

  tryTrigger(name: string, ...args: any[]): void {
    try {
      this.trigger(name, ...args);
    } catch {
      // Swallow handler errors, matching Obsidian's best-effort semantics.
    }
  }
}

export class TFile {
  path: string;
  basename: string;
  extension: string;
  
  constructor(path: string = 'test.md') {
    this.path = path;
    this.basename = path.replace('.md', '');
    this.extension = 'md';
  }
}

export function requestUrl(_params: any): Promise<any> {
  return Promise.resolve({
    status: 200,
    json: {},
    text: '',
    arrayBuffer: new ArrayBuffer(0)
  });
}

export function setIcon(_parent: HTMLElement, _iconId: string): void {
  // Mock implementation
}

export function parseYaml(text: string): unknown { return jest.requireActual('js-yaml').load(text); }
export function stringifyYaml(value: unknown): string { return jest.requireActual('js-yaml').dump(value); }
