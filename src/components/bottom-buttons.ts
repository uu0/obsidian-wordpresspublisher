import { setIcon } from 'obsidian';
import { createModuleLogger } from '../utils/logger';

const log = createModuleLogger('BottomButtons');

/**
 * Bottom button configuration
 */
export interface BottomButtonConfig {
    aiGenerate?: {
        show: boolean;
        onClick: () => Promise<void> | void;
        disabled?: boolean;
        loading?: boolean;
    };
    cancel: {
        onClick: () => void;
    };
    save: {
        onClick: () => void;
        disabled?: boolean;
    };
}

/**
 * Create bottom buttons component
 * Layout: [🤖 AI Generate] [✕ Cancel] [💾 Save]
 */
export function createBottomButtons(
    container: HTMLElement,
    config: BottomButtonConfig,
    translate?: (key: string) => string
): HTMLElement {
    const buttonRow = container.createDiv('wp-bottom-buttons');
    const t = translate || ((key: string) => key);
    
    // AI Generate button (optional)
    if (config.aiGenerate?.show) {
        const aiBtn = buttonRow.createEl('button', {
            cls: 'wp-btn wp-btn-ai'
        });
        
        if (config.aiGenerate.loading) {
            aiBtn.innerHTML = '<span class="wp-btn-spinner"></span>';
            aiBtn.setAttr('disabled', 'true');
        } else {
            aiBtn.setText(`🤖 ${t('publishModal_aiGenerate') || 'AI Generate'}`);
        }
        
        if (config.aiGenerate.disabled) {
            aiBtn.addClass('disabled');
            aiBtn.setAttr('disabled', 'true');
        }
        
        const aiConfig = config.aiGenerate;
        aiBtn.onclick = async () => {
            if (aiConfig && !aiConfig.disabled && !aiConfig.loading) {
                await aiConfig.onClick();
            }
        };
    }
    
    // Cancel button
    const cancelBtn = buttonRow.createEl('button', {
        cls: 'wp-btn wp-btn-cancel',
        text: `✕ ${t('publishModal_cancelButton') || 'Cancel'}`
    });
    cancelBtn.onclick = () => config.cancel.onClick();
    
    // Save button
    const saveBtn = buttonRow.createEl('button', {
        cls: 'wp-btn wp-btn-save',
        text: `💾 ${t('publishModal_saveButton') || 'Save'}`
    });
    
    if (config.save.disabled) {
        saveBtn.addClass('disabled');
        saveBtn.setAttr('disabled', 'true');
    }
    
    saveBtn.onclick = () => config.save.onClick();
    
    return buttonRow;
}

/**
 * Create bottom buttons with retry option (for slug)
 */
export function createBottomButtonsWithRetry(
    container: HTMLElement,
    config: {
        retry?: {
            show: boolean;
            onClick: () => Promise<void> | void;
            disabled?: boolean;
            loading?: boolean;
        };
        cancel: {
            onClick: () => void;
        };
        save: {
            onClick: () => void;
            disabled?: boolean;
        };
    },
    translate?: (key: string) => string
): HTMLElement {
    const buttonRow = container.createDiv('wp-bottom-buttons');
    const t = translate || ((key: string) => key);
    
    // Retry button (optional - replaces AI Generate for slug)
    if (config.retry?.show) {
        const retryBtn = buttonRow.createEl('button', {
            cls: 'wp-btn wp-btn-retry'
        });
        
        if (config.retry.loading) {
            retryBtn.innerHTML = '<span class="wp-btn-spinner"></span>';
            retryBtn.setAttr('disabled', 'true');
        } else {
            retryBtn.setText(`🔄 ${t('publishModal_retryButton') || 'Retry'}`);
        }
        
        if (config.retry.disabled) {
            retryBtn.addClass('disabled');
            retryBtn.setAttr('disabled', 'true');
        }
        
        const retryConfig = config.retry;
        retryBtn.onclick = async () => {
            if (retryConfig && !retryConfig.disabled && !retryConfig.loading) {
                await retryConfig.onClick();
            }
        };
    }
    
    // Cancel button
    const cancelBtn = buttonRow.createEl('button', {
        cls: 'wp-btn wp-btn-cancel',
        text: `✕ ${t('publishModal_cancelButton') || 'Cancel'}`
    });
    cancelBtn.onclick = () => config.cancel.onClick();
    
    // Save button
    const saveBtn = buttonRow.createEl('button', {
        cls: 'wp-btn wp-btn-save',
        text: `💾 ${t('publishModal_saveButton') || 'Save'}`
    });
    
    if (config.save.disabled) {
        saveBtn.addClass('disabled');
        saveBtn.setAttr('disabled', 'true');
    }
    
    saveBtn.onclick = () => config.save.onClick();
    
    return buttonRow;
}

/**
 * Create edit icon button
 */
export function createEditIcon(container: HTMLElement, onClick: () => void): HTMLElement {
    const editBtn = container.createEl('button', {
        cls: 'wp-edit-icon',
        attr: { 'aria-label': 'Edit' }
    });
    setIcon(editBtn, 'pencil');
    editBtn.onclick = (e) => {
        e.stopPropagation();
        onClick();
    };
    return editBtn;
}
