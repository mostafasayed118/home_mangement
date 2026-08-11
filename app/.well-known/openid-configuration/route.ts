import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = url.origin;

  return NextResponse.json({
    issuer: origin,
    jwks_uri: `${origin}/api/auth/jwks`,
    id_token_signing_alg_values_supported: ["RS256"],
    response_types_supported: ["id_token"],
    subject_types_supported: ["public"],
  });
}
