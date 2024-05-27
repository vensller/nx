import { Schema } from '@markdoc/markdoc';

export const githubRepository: Schema = {
  render: 'GithubRepository',
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
