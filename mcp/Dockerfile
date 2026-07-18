# packkit-mcp — a stdio MCP server. Glama (and any MCP host) runs the container
# and speaks the protocol over stdin/stdout.
FROM node:24-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
ENTRYPOINT ["node", "server.js"]
