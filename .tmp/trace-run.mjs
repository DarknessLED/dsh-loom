import { runResearch } from '../src/research/run.js'
const res = await runResearch(
  { question: 'reward hacking detection', depth: 'quick' },
  {
    search: async () => ({ sources: [{ url: 'https://a.test/p', title: 'A', snippet: 'hello world' }] }),
    fetchPage: async () => ({ url: 'https://a.test/p', statusCode: 200, body: { kind: 'html', content: '<html><body><p>hello world reward hacking detection content here more words</p></body></html>' } }),
  },
)
console.log(JSON.stringify(res).slice(0, 300))
