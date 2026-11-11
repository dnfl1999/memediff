import test from 'node:test';
import assert from 'node:assert/strict';

// Unit-level DOM doubles only: this does not test real rendering or PNG encoding.
test('deferred PNG export retains the original filename after another query fails', async t => {
  const originals = Object.fromEntries(['document', 'localStorage', 'fetch', 'setTimeout', 'clearTimeout'].map(k => [k, globalThis[k]]));
  t.after(() => { for (const [k, value] of Object.entries(originals)) { if (value === undefined) delete globalThis[k]; else globalThis[k] = value; } });
  const downloads = [], pending = [];
  class Element {
    constructor(tag) { this.tag = tag; this.listeners = {}; this.children = []; this.dataset = {}; this.style = { setProperty() {} }; this.classList = { toggle() {} }; }
    addEventListener(name, handler) { this.listeners[name] = handler; }
    append(...children) { this.children.push(...children); }
    replaceChildren(...children) { this.children = children; }
    setAttribute() {}
    remove() {}
    click() { if (this.tag === 'a' && this.download) downloads.push(this.download); }
    getContext() { return { fillRect() {}, fillText() {} }; }
    toBlob(callback) { pending.push(callback); }
  }
  const nodes = new Map();
  const node = id => { if (!nodes.has(id)) nodes.set(id, new Element('div')); return nodes.get(id); };
  globalThis.document = { getElementById: node, querySelectorAll: () => [], createElement: tag => new Element(tag), body: new Element('body') };
  globalThis.localStorage = { getItem: () => null };
  globalThis.setTimeout = () => 1;
  globalThis.clearTimeout = () => {};
  globalThis.fetch = async url => {
    if (url === 'https://api.github.com/repos/a/b') return new Response(JSON.stringify({ full_name: 'a/b', default_branch: 'main' }));
    if (url.includes('/repos/a/b/')) return new Response('[]');
    return new Response('{}', { status: 404 });
  };
  await import('../src/app.js');
  node('repo').value = 'a/b'; node('token').value = '';
  await node('query').listeners.submit({ preventDefault() {} });
  assert.equal(node('report').hidden, false);
  node('png').listeners.click();
  assert.equal(pending.length, 1);
  node('repo').value = 'missing/repo';
  await node('query').listeners.submit({ preventDefault() {} });
  assert.match(node('status').textContent, /404/);
  pending[0](new Blob(['unit-test placeholder'], { type: 'image/png' }));
  assert.equal(downloads.length, 1);
  assert.match(downloads[0], /^memediff-a-b-\d{4}-\d{2}-\d{2}\.png$/);
});
