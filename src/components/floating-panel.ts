import { setIcon } from 'obsidian';
import { createModuleLogger } from '../utils/logger';

const log = createModuleLogger('FloatingPanel');

/**
 * Floating panel state
 */
export interface FloatingPanelState {
    isExpanded: boolean;
}

/**
 * Floating panel configuration
 */
export interface FloatingPanelConfig {
    title: string;
    icon: string;
    defaultExpanded: boolean; // Desktop default
    mobileDefaultExpanded: boolean; // Mobile default (usually false)
    content: (container: HTMLElement) => void;
    onToggle?: (expanded: boolean) => void;
}

/**
 * Create floating panel component
 * Desktop: Collapsible sidebar panel
 * Mobile: Full-screen modal (when expanded)
 */
export class FloatingPanel {
    private container: HTMLElement;
    private headerEl!: HTMLElement;
    private contentEl!: HTMLElement;
    private state: FloatingPanelState;
    private config: FloatingPanelConfig;
    private isMobile: boolean;
    
    constructor(
        parent: HTMLElement,
        config: FloatingPanelConfig
    ) {
        this.config = config;
        this.isMobile = window.innerWidth < 768;
        
        // Determine initial state based on device
        this.state = {
            isExpanded: this.isMobile ? config.mobileDefaultExpanded : config.defaultExpanded
        };
        
        this.container = parent.createDiv('wp-floating-panel');
        this.render();
        
        // Listen for resize
        window.addEventListener('resize', () => {
            const wasMobile = this.isMobile;
            this.isMobile = window.innerWidth < 768;
            
            if (wasMobile !== this.isMobile) {
                // Device type changed, reset to default
                this.state.isExpanded = this.isMobile 
                    ? this.config.mobileDefaultExpanded 
                    : this.config.defaultExpanded;
                this.updateVisibility();
            }
        });
    }
    
    private render(): void {
        // Panel header (always visible)
        this.headerEl = this.container.createDiv('wp-floating-panel-header');
        this.renderHeader();
        
        // Panel content (collapsible)
        this.contentEl = this.container.createDiv('wp-floating-panel-content');
        if (this.state.isExpanded) {
            this.config.content(this.contentEl);
        }
        
        this.updateVisibility();
    }
    
    private renderHeader(): void {
        this.headerEl.empty();
        
        // Icon
        const iconEl = this.headerEl.createEl('span', { cls: 'wp-floating-panel-icon' });
        setIcon(iconEl, this.config.icon);
        
        // Title
        this.headerEl.createEl('span', {
            cls: 'wp-floating-panel-title',
            text: this.config.title
        });
        
        // Expand/Collapse indicator
        const indicator = this.headerEl.createEl('span', { cls: 'wp-floating-panel-indicator' });
        setIcon(indicator, this.state.isExpanded ? 'chevron-down' : 'chevron-right');
        
        // Click to toggle
        this.headerEl.onclick = () => this.toggle();
    }
    
    private toggle(): void {
        this.state.isExpanded = !this.state.isExpanded;
        
        if (this.state.isExpanded) {
            // Expand: render content
            this.contentEl.empty();
            this.config.content(this.contentEl);
        } else {
            // Collapse: clear content
            this.contentEl.empty();
        }
        
        this.updateVisibility();
        this.renderHeader(); // Update indicator
        
        if (this.config.onToggle) {
            this.config.onToggle(this.state.isExpanded);
        }
    }
    
    private updateVisibility(): void {
        if (this.state.isExpanded) {
            this.container.addClass('expanded');
            this.contentEl.style.display = 'block';
        } else {
            this.container.removeClass('expanded');
            this.contentEl.style.display = 'none';
        }
    }
    
    /**
     * Expand the panel
     */
    expand(): void {
        if (!this.state.isExpanded) {
            this.toggle();
        }
    }
    
    /**
     * Collapse the panel
     */
    collapse(): void {
        if (this.state.isExpanded) {
            this.toggle();
        }
    }
    
    /**
     * Refresh panel content
     */
    refresh(): void {
        if (this.state.isExpanded) {
            this.contentEl.empty();
            this.config.content(this.contentEl);
        }
    }
    
    /**
     * Get current state
     */
    getState(): FloatingPanelState {
        return { ...this.state };
    }
}

/**
 * Create panel container for vertical stacking
 */
export function createPanelContainer(parent: HTMLElement): HTMLElement {
    return parent.createDiv('wp-floating-panels-container');
}
