import type { TextMatchTransformer } from '@lexical/markdown';
import {
  $createInlineEquationNode,
  $isInlineEquationNode,
  InlineEquationNode,
} from '../nodes/inline-equation';

export const EQUATION: TextMatchTransformer = {
  dependencies: [InlineEquationNode],
  export: (node) => {
    if (!$isInlineEquationNode(node)) {
      return null;
    }

    return `$${node.getEquation()}$`;
  },
  importRegExp: /\$([^$]+?)\$/,
  regExp: /\$([^$]+?)\$$/,
  replace: (textNode, match) => {
    const [, equation] = match;
    const equationNode = $createInlineEquationNode({ equation });
    textNode.replace(equationNode);
  },
  trigger: '$',
  type: 'text-match',
};
