import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";

const http = httpRouter();

// ─── OIDC Discovery Endpoint ────────────────────────────────────────────────
// Convex's auth.config.ts fetches this to discover the JWKS URI.
// Hosted here so Convex Cloud can reach it (localhost can't be reached from cloud).
http.route({
  path: "/.well-known/openid-configuration",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const siteUrl = process.env.CONVEX_SITE_URL;
    return new Response(
      JSON.stringify({
        issuer: siteUrl,
        jwks_uri: `${siteUrl}/api/auth/jwks`,
        id_token_signing_alg_values_supported: ["RS256"],
        response_types_supported: ["id_token"],
        subject_types_supported: ["public"],
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }),
});

// ─── JWKS Endpoint ──────────────────────────────────────────────────────────
// Serves the RSA public key so Convex can verify JWTs signed by Next.js.
http.route({
  path: "/api/auth/jwks",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    return new Response(
      JSON.stringify({
        keys: [
          {
            kty: "RSA",
            n: "uKPj9ijiYhrVeMgXpOc8EFYkVjDZttukjvQofmPDFdEueptNhw9JiQPl2xrbmceB2XMXHcFvj4Ic0EiIychEeS03eVCxi-H2RBv7xHmZp50UtIcj5I0BbG066th-5S74qYJv7hZbfIZb2rNMVyQ0Hc7ye7V1l55Ahb67jOvCbDSBzJocW8Ro7zc8Dl3bF5-JJ_r9QfyscCnnjMqWbhSbyy-eRWpqvDoLSTMskLGk2PkUoyCKCr3g6ur_aiMNXzbua_cZbOzzHZ7Es_WPqvijm-98bwzQ0E3sHc5PVrt2MIEnWW33724ucFKUKVsHbnsQOjvQP_Nr9fjR_PF8DRYXnQ",
            e: "AQAB",
            kid: "convex-auth-key",
            alg: "RS256",
            use: "sig",
          },
        ],
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }),
});

export default http;
