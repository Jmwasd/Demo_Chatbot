import { defineFunction, secret } from "@aws-amplify/backend";

export const accessSecret = defineFunction({
  environment: {
    DATABASE_URL: secret("DATABASE_URL"),
    AI_GATEWAY_API_KEY: secret("AI_GATEWAY_API_KEY"),
  },
});
