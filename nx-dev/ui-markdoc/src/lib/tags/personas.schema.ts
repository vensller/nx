import { Schema } from '@markdoc/markdoc';

export const personas: Schema = {
  render: 'Personas',
};
export const persona: Schema = {
  render: 'Persona',
  children: ['paragraph', 'tag', 'list'],
  attributes: {
    title: {
      type: 'String',
    },
    type: {
      type: 'String',
      default: 'integrated',
      required: true,
      matches: [
        'cache',
        'distribute',
        'javascript',
        'lerna',
        'react',
        'angular',
        'integrated',
      ],
      errorLevel: 'critical',
    },
    url: {
      type: 'String',
      required: true,
      errorLevel: 'critical',
    },
  },
};
