import { defineFunction, secret } from "@aws-amplify/backend";

export const sayHello = defineFunction({
  environment: {
    DATABASE_URL: secret("DATAVASE_URL"),
    GOOGLE_API_KEY: secret("GOOGLE_API_KEY"),
    IDENTITY_POOL_ID: secret("IDENTITY_POOL_ID"),
  },
});
