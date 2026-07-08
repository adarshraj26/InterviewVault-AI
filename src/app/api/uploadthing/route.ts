import { createRouteHandler } from "uploadthing/next";
import { ourFileRouter } from "./core";

// Export route handler for GET and POST
export const { GET, POST } = createRouteHandler({
  router: ourFileRouter,
});
