const authConfig = {
  providers: [
    {
      // IMPORTANT: must be the Convex site URL (publicly accessible from Convex Cloud)
      // NOT localhost — Convex Cloud servers cannot reach localhost.
      domain: process.env.CONVEX_SITE_URL,
      applicationID: "convex",
    },
  ],
};

export default authConfig;
