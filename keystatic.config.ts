import { config, collection, fields } from '@keystatic/core';

export default config({
  storage: {
    kind: 'local',
  },

  ui: {
    brand: { name: 'Kherin CMS' },
    navigation: {
      Blog: ['blog'],
    },
  },

  collections: {
    blog: collection({
      label: 'Blog Posts',
      slugField: 'title',
      path: 'src/content/blog/*',
      format: { contentField: 'content' },
      entryLayout: 'content',
      schema: {
        title: fields.slug({
          name: { label: 'Title' },
          slug: { label: 'URL Slug' },
        }),
        description: fields.text({
          label: 'Description',
          description: 'Short summary for SEO and card previews (≤160 chars)',
          multiline: true,
          validation: { isRequired: true },
        }),
        publishedAt: fields.date({
          label: 'Published Date',
          defaultValue: { kind: 'today' },
          validation: { isRequired: true },
        }),
        tags: fields.array(
          fields.text({ label: 'Tag' }),
          {
            label: 'Tags',
            itemLabel: (props) => props.value ?? 'Tag',
          }
        ),
        image: fields.image({
          label: 'Cover Image',
          directory: 'public/images/blog',
          publicPath: '/images/blog/',
        }),
        draft: fields.checkbox({
          label: 'Draft',
          description: 'Draft posts will not be shown publicly',
          defaultValue: false,
        }),
        content: fields.markdoc({
          label: 'Content',
          options: {
            image: {
              directory: 'public/images/blog',
              publicPath: '/images/blog/',
            },
          },
        }),
      },
    }),
  },
});
