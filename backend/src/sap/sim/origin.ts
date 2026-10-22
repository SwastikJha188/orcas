/** Where the SAP simulator answers: a connection to this origin never leaves the server. */
export const SIM_ORIGIN = "https://s4hana.ultron.internal";
export const SIM_TOKEN_PATH = "/sap/bc/sec/oauth2/token";

export const isSimUrl = (url: string) => {
  try {
    return new URL(url).origin === SIM_ORIGIN;
  } catch {
    return false;
  }
};
