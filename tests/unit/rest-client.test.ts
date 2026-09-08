import { withRequestTimeout, RestClient, HttpError } from '../../src/rest-client';
import * as obsidian from 'obsidian';

afterEach(() => { jest.restoreAllMocks(); jest.useRealTimers(); });
it('clears the timeout after success', async () => {
  jest.useFakeTimers();
  await expect(withRequestTimeout(Promise.resolve('ok'), 100, 'GET')).resolves.toBe('ok');
  expect(jest.getTimerCount()).toBe(0);
});
it('marks POST timeout as uncertain without retrying', async () => {
  jest.useFakeTimers();
  const promise = withRequestTimeout(new Promise(() => {}), 10, 'POST');
  const check = expect(promise).rejects.toMatchObject({ uncertain: true });
  await jest.advanceTimersByTimeAsync(10);
  await check;
  expect(jest.getTimerCount()).toBe(0);
});
it('clears timers on network rejection', async () => {
  jest.useFakeTimers();
  await expect(withRequestTimeout(Promise.reject(new Error('offline')), 100, 'POST')).rejects.toThrow('offline');
  expect(jest.getTimerCount()).toBe(0);
});
it('rejects plaintext credentials to nonlocal servers', () => {
  expect(() => new RestClient({ url: new URL('http://example.com') })).toThrow('HTTPS');
  expect(() => new RestClient({ url: new URL('http://localhost:8080') })).not.toThrow();
});
it('keeps WordPress status and error code', async () => {
  jest.spyOn(obsidian, 'requestUrl').mockResolvedValue({ status: 403, json: { code: 'rest_forbidden', message: 'Denied' } } as obsidian.RequestUrlResponse);
  await expect(new RestClient({ url: new URL('https://example.com') }).httpGet('wp-json')).rejects.toMatchObject({ status: 403, code: 'rest_forbidden' });
  expect(new HttpError(400, null).message).toBe('HTTP 400');
});
