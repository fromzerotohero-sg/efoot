export async function GET(request: Request) {
  return Response.redirect(new URL('/logo.png', request.url), 302)
}
