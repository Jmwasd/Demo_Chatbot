import { defineFunction, secret } from "@aws-amplify/backend";

export const sayHello = defineFunction({
  environment: {
    DATABASE_URL: secret("DATAVASE_URL"),
  },
});
