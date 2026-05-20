import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { exchangeMLCode, saveMLTokens } from "@/lib/afiliados/ml-auth";

function base() {
  return (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/+$/, "");
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(`${base()}/dashboard/afiliado?ml=error&reason=${encodeURIComponent(error)}`);
  }

  const cookieStore = await cookies();
  const expectedState = cookieStore.get("ml_oauth_state")?.value;
  cookieStore.delete("ml_oauth_state");

  if (!code || !state || !expectedState || state !== expectedState) {
    return NextResponse.redirect(`${base()}/dashboard/afiliado?ml=error&reason=state_invalid`);
  }

  try {
    const tokens = await exchangeMLCode(code);
    await saveMLTokens(tokens);
    return NextResponse.redirect(`${base()}/dashboard/afiliado?ml=connected`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[ML callback]", msg);
    return NextResponse.redirect(`${base()}/dashboard/afiliado?ml=error&reason=${encodeURIComponent(msg.slice(0, 120))}`);
  }
}
