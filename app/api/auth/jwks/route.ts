import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    keys: [
      {
        "kty": "RSA",
        "n": "uKPj9ijiYhrVeMgXpOc8EFYkVjDZttukjvQofmPDFdEueptNhw9JiQPl2xrbmceB2XMXHcFvj4Ic0EiIychEeS03eVCxi-H2RBv7xHmZp50UtIcj5I0BbG066th-5S74qYJv7hZbfIZb2rNMVyQ0Hc7ye7V1l55Ahb67jOvCbDSBzJocW8Ro7zc8Dl3bF5-JJ_r9QfyscCnnjMqWbhSbyy-eRWpqvDoLSTMskLGk2PkUoyCKCr3g6ur_aiMNXzbua_cZbOzzHZ7Es_WPqvijm-98bwzQ0E3sHc5PVrt2MIEnWW33724ucFKUKVsHbnsQOjvQP_Nr9fjR_PF8DRYXnQ",
        "e": "AQAB",
        "kid": "convex-auth-key",
        "alg": "RS256",
        "use": "sig"
      }
    ]
  });
}
