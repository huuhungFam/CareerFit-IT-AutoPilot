import http from 'node:http';

const targetHost = '127.0.0.1';
const targetPort = 18080;

const server = http.createServer((request, response) => {
  const upstream = http.request(
    {
      hostname: targetHost,
      port: targetPort,
      path: request.url,
      method: request.method,
      headers: request.headers,
    },
    (upstreamResponse) => {
      response.writeHead(upstreamResponse.statusCode ?? 502, upstreamResponse.headers);
      upstreamResponse.pipe(response);
    },
  );

  upstream.on('error', (error) => {
    if (!response.headersSent) {
      response.writeHead(502, { 'content-type': 'text/plain; charset=utf-8' });
    }
    response.end(`Temporary E2E proxy could not reach ${targetHost}:${targetPort}: ${error.message}`);
  });

  request.pipe(upstream);
});

server.listen(8080, '::', () => {
  console.log('Temporary E2E proxy listening on http://localhost:8080 -> http://127.0.0.1:18080');
});

