import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// Routes that require a logged-in user. Anything under these paths gets
// checked before the request is allowed through.
const PROTECTED_PAGE_PREFIXES = ['/dashboard'];
const PROTECTED_API_PREFIXES = ['/api/chat', '/api/analyze', '/api/transcript', '/api/streak'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtectedPage = PROTECTED_PAGE_PREFIXES.some((p) => pathname.startsWith(p));
  const isProtectedApi = PROTECTED_API_PREFIXES.some((p) => pathname.startsWith(p));

  if (!isProtectedPage && !isProtectedApi) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  // This mirrors lib/supabase/server.ts's pattern, but middleware can't use
  // next/headers cookies() — it reads/writes cookies directly off the
  // request/response instead. Two different Supabase client constructions
  // for two different Next.js contexts; this is expected, not a duplicate
  // mistake.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    if (isProtectedApi) {
      // APIs get a clean 401 JSON response, not a redirect — a fetch()
      // call from the frontend can't follow an HTML redirect meaningfully.
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    // Page routes get redirected to login instead, since a human is
    // looking at this, not a fetch() call.
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}


export const config = {
  matcher: ['/dashboard/:path*', '/api/chat/:path*', '/api/analyze/:path*', '/api/transcript/:path*', '/api/streak/:path*'],
};
