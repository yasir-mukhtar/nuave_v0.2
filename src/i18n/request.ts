import { getRequestConfig } from "next-intl/server";

export default getRequestConfig(async () => {
  return {
    locale: "id",
    messages: (await import("../messages/id.json")).default,
  };
});
