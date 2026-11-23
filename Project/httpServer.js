const http = require("http");
const app = require("./expressApp");

const PORT = process.env.PORT || 3000;

// Express app is a request handler, so it plugs straight into Node's http server
const server = http.createServer(app);

server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));