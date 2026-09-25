import redis from 'k6/x/redis';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    redis_demo: {
      executor: 'per-vu-iterations',
      vus: 1,
      iterations: 1,
      maxDuration: '10s',
      exec: 'redis_demo',
    },
  },
};

const client = new redis.Client({
  addrs: ['127.0.0.1:6379'],
  password: '',
  db: 0,
});

export function redis_demo() {
  const key = `k6:demo:${__VU}:${__ITER}`;

  const setOk = client.set(key, 'hello from k6');
  const value = client.get(key);
  const delOk = client.del(key);
  const pingOk = client.ping();

  check(setOk, {
    'set returns OK': (v) => v === 'OK',
  });

  check(value, {
    'get returns value': (v) => v === 'hello from k6',
  });

  check(delOk, {
    'del returns 1': (v) => v === 1,
  });

  check(pingOk, {
    'ping returns PONG': (v) => v === 'PONG',
  });

  sleep(1);
}

export function teardown() {
  client.close();
}
