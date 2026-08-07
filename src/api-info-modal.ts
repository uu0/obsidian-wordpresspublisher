import { App } from 'obsidian';
import { ApiType } from './plugin-settings';
import { getApiCapabilities, getApiLimitations, getApiRecommendation } from './api-capability';

/**
 * Show a lightweight, read-only modal describing the capabilities,
 * limitations and recommendation for the selected WordPress API type.
 *
 * Rendered as an overlay anchored to the active leaf (matches the previous
 * inline implementation); kept here so the publish modal stays focused on
 * its core flow.
 */
export function showApiInfoModal(app: App, apiType: ApiType): void {
  const capabilities = getApiCapabilities(apiType);
  const limitations = getApiLimitations(apiType);
  const recommendation = getApiRecommendation(apiType);

  const message = `
# API Capabilities: ${apiType}

## Supported Features
${capabilities.supportsCategoryCreation ? '✅ Category Creation' : '❌ Category Creation'}
${capabilities.supportsTagCreation ? '✅ Tag Creation' : '❌ Tag Creation'}
${capabilities.supportsRichCategoryProperties ? '✅ Rich Category Properties' : '❌ Rich Category Properties'}
${capabilities.supportsBatchOperations ? '✅ Batch Operations' : '❌ Batch Operations'}
${capabilities.supportsCustomPostTypes ? '✅ Custom Post Types' : '❌ Custom Post Types'}

## Limitations
${limitations.map(l => `• ${l}`).join('\n')}

## Recommendation
${recommendation}

## Security Note
XML-RPC uses basic authentication which may be less secure than REST API with Application Passwords.
Consider migrating to REST API for better security and feature support.
  `;

  // 使用内置的confirm modal显示信息
  const modal = app.workspace.activeLeaf?.view.containerEl.createEl('div');
  if (modal) {
    modal.innerHTML = `
      <div class="modal-bg" style="position:fixed;top:0;left:0;width:100%;height:100%;background:var(--wp-modal-overlay);z-index:9999;">
        <div class="modal" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);background:var(--background-primary);padding:20px;border-radius:8px;max-width:600px;max-height:80vh;overflow:auto;">
          <div class="modal-header" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:15px;">
            <h3 style="margin:0;">API Information</h3>
            <button class="modal-close" style="background:none;border:none;font-size:20px;cursor:pointer;">×</button>
          </div>
          <div class="modal-content">${message}</div>
          <div class="modal-footer" style="margin-top:15px;text-align:right;">
            <button class="mod-cta" style="padding:5px 15px;">Close</button>
          </div>
        </div>
      </div>
    `;

    // 添加关闭事件
    modal.querySelector('.modal-close')?.addEventListener('click', () => modal.remove());
    modal.querySelector('.mod-cta')?.addEventListener('click', () => modal.remove());
    modal.querySelector('.modal-bg')?.addEventListener('click', (e) => {
      if (e.target === modal.querySelector('.modal-bg')) {
        modal.remove();
      }
    });
  }
}
