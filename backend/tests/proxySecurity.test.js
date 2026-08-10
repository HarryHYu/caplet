const proxyRouter = require('../routes/proxy');

function responseFromChunks(chunks) {
  let index = 0;
  return {
    body: {
      getReader() {
        return {
          async read() {
            if (index >= chunks.length) return { done: true, value: undefined };
            return { done: false, value: chunks[index++] };
          },
          async cancel() {},
          releaseLock() {},
        };
      },
    },
  };
}

describe('image proxy response limits', () => {
  test('stops reading a chunked response as soon as it exceeds the cap', async () => {
    await expect(proxyRouter.readResponseBuffer(
      responseFromChunks([Buffer.alloc(6), Buffer.alloc(5)]),
      10,
    )).rejects.toMatchObject({ code: 'IMAGE_TOO_LARGE' });
  });

  test('returns a bounded buffer for a response within the cap', async () => {
    const result = await proxyRouter.readResponseBuffer(
      responseFromChunks([Buffer.from('hello'), Buffer.from(' world')]),
      20,
    );
    expect(result.toString()).toBe('hello world');
  });
});
