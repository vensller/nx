import { Schema } from '@markdoc/markdoc';

export const disclosure: Schema = {
  render: 'Disclosure',
  children: ['paragraph', 'tag', 'list'],
  attributes: {
    title: {
      type: 'String',
      required: true,
    },
  },
};
