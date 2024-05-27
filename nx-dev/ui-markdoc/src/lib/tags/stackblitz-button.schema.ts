import { Schema } from '@markdoc/markdoc';

export const stackblitzButton: Schema = {
  render: 'StackblitzButton',
  attributes: {
    url: {
      type: 'String',
      required: true,
    },
    title: {
      type: 'String',
      required: false,
    },
  },
};
