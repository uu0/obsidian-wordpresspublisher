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
