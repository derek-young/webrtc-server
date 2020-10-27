import { Server } from "./server";

const server = new Server();

server.listen(port => {
  // tslint:disable-next-line:no-console
  console.log(`Server is listening on http://localhost:${port}`);
});
