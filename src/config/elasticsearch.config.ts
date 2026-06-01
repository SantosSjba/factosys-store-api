import { registerAs } from '@nestjs/config';

export const elasticsearchConfig = registerAs('elasticsearch', () => ({
  node: process.env.ELASTICSEARCH_NODE ?? 'http://localhost:9200',
}));
