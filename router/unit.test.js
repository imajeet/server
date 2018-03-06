// Unit - test the router on its own
const extend = require('extend');
const loadware = require('loadware');
const { get, error } = require('server/router');
const RouterError = require('./errors');

const test = require('server/test');

const createCtx = ({ url = '/', path = '/', method = 'GET' } = {}) => extend({
  url, path, method,
  res: { send: () => {} },
  options: {},
  utils: require('../utils')
});


const router = require('.');


describe('server/router definition', () => {
  it('loads the main router', () => {
    expect(router).toEqual(require('server').router);
    expect(router).toBe(require('server/router'));
  });

  it('has the right methods defined', () => {
    expect(router.get  ).toEqual(jasmine.any(Function));
    expect(router.get  ).toEqual(jasmine.any(Function));
    expect(router.post ).toEqual(jasmine.any(Function));
    expect(router.put  ).toEqual(jasmine.any(Function));
    expect(router.del  ).toEqual(jasmine.any(Function));
    expect(router.sub  ).toEqual(jasmine.any(Function));
    expect(router.error).toEqual(jasmine.any(Function));
  });

  it('can load all the methods manually', () => {
    expect(require('server/router/get'  )).toEqual(jasmine.any(Function));
    expect(require('server/router/get'  )).toEqual(jasmine.any(Function));
    expect(require('server/router/post' )).toEqual(jasmine.any(Function));
    expect(require('server/router/put'  )).toEqual(jasmine.any(Function));
    expect(require('server/router/del'  )).toEqual(jasmine.any(Function));
    expect(require('server/router/sub'  )).toEqual(jasmine.any(Function));
    expect(require('server/router/error')).toEqual(jasmine.any(Function));
  });
});

describe('server/router works', () => {
  it('works', async () => {
    const mid = [
      () => new Promise((resolve) => resolve()),
      get('/aaa', () => { throw new Error(); }),
      get('/', () => 'Hello 世界'),
      get('/sth', () => { throw new Error(); }),
      get('/', () => { throw new Error(); })
    ];

    const ctx = createCtx();
    await ctx.utils.join(mid)(ctx);
    expect(ctx.replied).toBe(true);
  });

  it('works even when wrapped with join() and loadware()', async () => {
    const middles = [
      () => new Promise((resolve) => resolve()),
      get('/aaa', () => { throw new Error(); }),
      ctx => ctx.utils.join(loadware(get('/', () => 'Hello 世界')))(ctx),
      get('/sth', () => { throw new Error(); }),
      get('/', () => { throw new Error(); })
    ];

    // Returns the promise to be handled async
    const ctx = createCtx();
    await ctx.utils.join(middles)(ctx);
    expect(ctx.replied).toBe(true);
  });


  it('works with parameters', async () => {
    const ctx = createCtx({ path: '/test/francisco/presencia/bla' });
    await get('/test/:name/:lastname/bla')(ctx);
    expect(ctx.replied).toBe(true);
    expect(ctx.params.name).toBe('francisco');
    expect(ctx.params.lastname).toBe('presencia');
  });
});



describe('Error routes', () => {
  it('can catch errors', async () => {
    const generate = () => { throw new Error('Should be caught'); };
    const handle = error(() => 'Error 世界');

    const res = await test([generate, handle]).get('/');
    expect(res.body).toBe('Error 世界');
  });

  it('can catch errors with full path', async () => {
    const generate = () => { throw new RouterError('router'); };
    const handle = error('/server/test/router', ctx => {
      return ctx.error.code;
    });
    const res = await test([generate, handle]).get('/');
    expect(res.body).toBe('/server/test/router');
  });

  it('can catch errors with partial path', async () => {
    const generate = () => { throw new RouterError('router'); };
    const handle = error('/server/test', ctx => {
      return ctx.error.code;
    });
    const res = await test([generate, handle]).get('/');
    expect(res.body).toBe('/server/test/router');
  });

  const errors = {
    'test:pre:1': new Error('Hi there 1'),
    'test:pre:a': new Error('Hi there a'),
    'test:pre:b': new Error('Hi there b'),
    'test:pre:build': opts => new Error(`Hi there ${opts.name}`)
  };

  it('can generate errors', async () => {
    const generate = () => {
      throw new RouterError('router');
    };
    const handle = error('/server/test/router', ctx => {
      return ctx.error.code;
    });

    const res = await test({ errors }, [generate, handle]).get('/');
    expect(res.body).toBe('/server/test/router');
  });

  it('can generate errors with options', async () => {
    const generate = () => {
      throw new RouterError('simplerouter', { text: 'ABC' });
    };
    const handle = error('/server/test/simplerouter', ctx => {
      return ctx.error.message;
    });

    const res = await test({ errors }, [generate, handle]).get('/');
    expect(res.body).toBe('Simple message: ABC');
  });
});
