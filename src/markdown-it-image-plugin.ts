import MarkdownIt from 'markdown-it';
import type Token from 'markdown-it/lib/token';
import { trim } from 'lodash-es';


const tokenType = 'ob_img';

export interface MarkdownItImageActionParams {
  src: string;
  width?: string;
  height?: string;
}

interface MarkdownItImagePluginOptions {
  doWithImage: (img: MarkdownItImageActionParams) => void;
}

const pluginOptions: MarkdownItImagePluginOptions = {
  doWithImage: () => {},
}

export const MarkdownItImagePluginInstance = {
  plugin: plugin,
  doWithImage: (action: (img: MarkdownItImageActionParams) => void) => {
    pluginOptions.doWithImage = action;
  },
}

function plugin(md: MarkdownIt): void {
  const renderImage = md.renderer.rules.image!;
  md.renderer.rules.image = (tokens, index, options, env, renderer) => {
    const token = tokens[index];
    const size = token.content.match(/\|(\d+)(?:x(\d+))?$/);
    if (size) {
      token.attrSet('width', size[1]);
      if (size[2]) token.attrSet('height', size[2]);
      const alt = token.content.slice(0, size.index);
      token.content = alt;
      token.children = md.parseInline(alt, env)[0].children;
    }
    return renderImage(tokens, index, options, env, renderer);
  };
  md.inline.ruler.after('image', tokenType, (state, silent) => {
    const regex = /^!\[\[([^|\]\n]+)(\|([^\]\n]+))?\]\]/;
    const match = state.src.slice(state.pos).match(regex);
    if (match) {
      if (silent) {
        return true;
      }
      const token = state.push(tokenType, 'img', 0);
      const matched = match[0];
      const src = match[1];
      const size = match[3];
      let width: string | undefined;
      let height: string | undefined;
      if (size) {
        const sepIndex = size.indexOf('x'); // width x height
        if (sepIndex > 0) {
          width = trim(size.substring(0, sepIndex));
          height = trim(size.substring(sepIndex + 1));
          token.attrs = [
            [ 'src', src ],
            [ 'width', width ],
            [ 'height', height ],
          ];
        } else {
          width = trim(size);
          token.attrs = [
            [ 'src', src ],
            [ 'width', width ],
          ];
        }
      } else {
        token.attrs = [
          [ 'src', src ],
        ];
      }
      if (pluginOptions.doWithImage) {
        pluginOptions.doWithImage({
          src: token.attrs?.[0]?.[1],
          width: token.attrs?.[1]?.[1],
          height: token.attrs?.[2]?.[1],
        });
      }
      state.pos += matched.length;
      return true;
    } else {
      return false;
    }
  });
  md.renderer.rules.ob_img = (tokens: Token[], idx: number) => {
    return md.renderer.renderToken(tokens, idx, md.options);
  };
}
