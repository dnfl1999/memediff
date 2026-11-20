export default async function* unitQaReporter(source) {
  for await (const event of source) {
    if (event.type !== 'test:summary' || event.data.file !== undefined) continue;
    const { counts, success, duration_ms } = event.data;
    const completedAt = new Date();
    const startedAt = new Date(completedAt.getTime() - duration_ms);
    yield JSON.stringify({ counts, success, startedAt, completedAt }) + '\n';
  }
}
