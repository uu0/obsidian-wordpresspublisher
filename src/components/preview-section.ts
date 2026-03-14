import { setIcon } from 'obsidian';
import { createModuleLogger } from '../utils/logger';
import { createEditIcon } from './bottom-buttons';

const log = createModuleLogger('PreviewSection');

/**
 * Preview section state
 */
export interface PreviewSectionState {
    isEditing: boolean;
}

/**
 * Preview section configuration
 */
export interface PreviewSectionConfig {
    title: string;
    renderContent: (container: HTMLElement) => void;
    renderEditor?: (container: HTMLElement, onSave: () => void, onCancel: () => void) => void;
    sticky?: boolean; // For article preview
    onEdit?: () => void;
}

/**
 * Create preview section component
 * Each section has a title, edit icon, and content
 */
export class PreviewSection {
    private container: HTMLElement;
    private headerEl!: HTMLElement;
    private contentEl!: HTMLElement;
    private state: PreviewSectionState;
    private config: PreviewSectionConfig;
    
    constructor(
        parent: HTMLElement,
        config: PreviewSectionConfig
    ) {
        this.config = config;
        this.state = { isEditing: false };
        
        const sectionClass = config.sticky ? 'wp-preview-section wp-preview-section-sticky' : 'wp-preview-section';
        this.container = parent.createDiv(sectionClass);
        
        this.render();
    }
    
    private render(): void {
        // Section header with title and edit icon
        this.headerEl = this.container.createDiv('wp-preview-section-header');
        this.renderHeader();
        
        // Section content
        this.contentEl = this.container.createDiv('wp-preview-section-content');
        this.renderContent();
    }
    
    private renderHeader(): void {
        this.headerEl.empty();
        
        // Title
        this.headerEl.createEl('span', {
            cls: 'wp-preview-section-title',
            text: this.config.title
        });
        
        // Edit icon (always visible)
        if (this.config.renderEditor) {
            createEditIcon(this.headerEl, () => this.toggleEdit());
        }
    }
    
    private renderContent(): void {
        this.contentEl.empty();
        
        if (this.state.isEditing && this.config.renderEditor) {
            // Show editor
            this.config.renderEditor(
                this.contentEl,
                () => this.save(), // onSave
                () => this.cancel() // onCancel
            );
        } else {
            // Show preview
            this.config.renderContent(this.contentEl);
        }
    }
    
    private toggleEdit(): void {
        this.state.isEditing = !this.state.isEditing;
        this.renderContent();
        
        if (this.config.onEdit) {
            this.config.onEdit();
        }
    }
    
    private save(): void {
        this.state.isEditing = false;
        this.renderContent();
    }
    
    private cancel(): void {
        this.state.isEditing = false;
        this.renderContent();
    }
    
    /**
     * Refresh section content
     */
    refresh(): void {
        this.renderContent();
    }
    
    /**
     * Enter edit mode
     */
    enterEditMode(): void {
        if (!this.state.isEditing) {
            this.toggleEdit();
        }
    }
    
    /**
     * Exit edit mode
     */
    exitEditMode(): void {
        if (this.state.isEditing) {
            this.state.isEditing = false;
            this.renderContent();
        }
    }
    
    /**
     * Get container element
     */
    getContainer(): HTMLElement {
        return this.container;
    }
    
    /**
     * Get state
     */
    getState(): PreviewSectionState {
        return { ...this.state };
    }
}

/**
 * Create featured image section
 */
export function createFeaturedImageSection(
    parent: HTMLElement,
    config: {
        image: { content: ArrayBuffer; mimeType: string; fileName: string } | null;
        onEdit: () => void;
        title: string;
    }
): HTMLElement {
    const section = parent.createDiv('wp-preview-section');
    
    // Header
    const header = section.createDiv('wp-preview-section-header');
    header.createEl('span', { cls: 'wp-preview-section-title', text: config.title });
    createEditIcon(header, config.onEdit);
    
    // Content
    const content = section.createDiv('wp-preview-section-content');
    
    if (config.image) {
        const img = content.createEl('img', { cls: 'wp-preview-featured-image' });
        const base64 = arrayBufferToBase64(config.image.content);
        img.src = `data:${config.image.mimeType};base64,${base64}`;
        img.alt = config.image.fileName;
        
        // Image info
        const info = content.createDiv('wp-preview-image-info');
        info.setText(`${config.image.fileName} (${formatFileSize(config.image.content.byteLength)})`);
    } else {
        const placeholder = content.createDiv('wp-preview-placeholder');
        placeholder.setText('No image selected');
    }
    
    return section;
}

/**
 * Create excerpt section
 */
export function createExcerptSection(
    parent: HTMLElement,
    config: {
        excerpt: string;
        onEdit: () => void;
        title: string;
    }
): HTMLElement {
    const section = parent.createDiv('wp-preview-section');
    
    // Header
    const header = section.createDiv('wp-preview-section-header');
    header.createEl('span', { cls: 'wp-preview-section-title', text: config.title });
    createEditIcon(header, config.onEdit);
    
    // Content
    const content = section.createDiv('wp-preview-section-content');
    
    if (config.excerpt) {
        const text = content.createDiv('wp-preview-excerpt-text');
        text.setText(config.excerpt);
    } else {
        const placeholder = content.createDiv('wp-preview-placeholder');
        placeholder.setText('No excerpt');
    }
    
    return section;
}

/**
 * Create tags section
 */
export function createTagsSection(
    parent: HTMLElement,
    config: {
        tags: string[];
        onEdit: () => void;
        title: string;
    }
): HTMLElement {
    const section = parent.createDiv('wp-preview-section');
    
    // Header
    const header = section.createDiv('wp-preview-section-header');
    header.createEl('span', { cls: 'wp-preview-section-title', text: config.title });
    createEditIcon(header, config.onEdit);
    
    // Content
    const content = section.createDiv('wp-preview-section-content wp-preview-tags');
    
    if (config.tags.length > 0) {
        config.tags.forEach(tag => {
            const tagEl = content.createEl('span', { cls: 'wp-tag-item', text: tag });
            tagEl.style.backgroundColor = getTagColor(tag);
        });
    } else {
        const placeholder = content.createDiv('wp-preview-placeholder');
        placeholder.setText('No tags');
    }
    
    return section;
}

/**
 * Create article preview section (sticky)
 */
export function createArticlePreviewSection(
    parent: HTMLElement,
    config: {
        content: string;
        onEdit: () => void;
        title: string;
    }
): HTMLElement {
    const section = parent.createDiv('wp-preview-section wp-preview-section-sticky');
    
    // Header
    const header = section.createDiv('wp-preview-section-header');
    header.createEl('span', { cls: 'wp-preview-section-title', text: config.title });
    createEditIcon(header, config.onEdit);
    
    // Content
    const content = section.createDiv('wp-preview-section-content wp-preview-article');
    content.setText(config.content.substring(0, 200) + (config.content.length > 200 ? '...' : ''));
    
    return section;
}

// Helper functions

function arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

function formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

/**
 * Tag colors (same as in wp-publish-modal-v2.ts)
 */
const TAG_COLORS = [
    'var(--wp-tag-color-1)',
    'var(--wp-tag-color-2)',
    'var(--wp-tag-color-3)',
    'var(--wp-tag-color-4)',
    'var(--wp-tag-color-5)',
    'var(--wp-tag-color-6)',
    'var(--wp-tag-color-7)',
    'var(--wp-tag-color-8)',
    'var(--wp-tag-color-9)',
];

function getTagColor(tagName: string): string {
    const hash = tagName.split('').reduce((acc, char) =>
        acc + char.charCodeAt(0), 0);
    return TAG_COLORS[hash % TAG_COLORS.length];
}
