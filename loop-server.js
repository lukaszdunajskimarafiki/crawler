const http = require('http');

const server = http.createServer((req, res) => {
    if (req.url === '/loop1') {
        res.writeHead(302, { 'Location': '/loop2' });
        res.end();
    } else if (req.url === '/loop2') {
        res.writeHead(302, { 'Location': '/loop1' });
        res.end();
    } else {
        res.writeHead(200);
        res.end('Hello');
    }
});

server.listen(3001, () => {
    console.log('Loop server running on port 3001');
});
