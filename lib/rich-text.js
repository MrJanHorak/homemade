import sanitizeHtml from 'sanitize-html';

const RICH_TEXT_ALLOWED_TAGS = [
  'a',
  'blockquote',
  'br',
  'code',
  'em',
  'h2',
  'h3',
  'li',
  'ol',
  'p',
  'pre',
  's',
  'strong',
  'table',
  'tbody',
  'td',
  'th',
  'thead',
  'tr',
  'ul',
];
const RICH_TEXT_ALLOWED_ATTRIBUTES = {
  a: ['href', 'target', 'rel'],
  code: ['class'],
  pre: ['class'],
  td: ['colspan', 'rowspan'],
  th: ['colspan', 'rowspan'],
};

export const sanitizeRichText = (value) =>
  sanitizeHtml(`${value || ''}`, {
    allowedTags: RICH_TEXT_ALLOWED_TAGS,
    allowedAttributes: RICH_TEXT_ALLOWED_ATTRIBUTES,
    allowedSchemes: ['http', 'https', 'mailto'],
    allowedSchemesAppliedToAttributes: ['href'],
  }).trim();
