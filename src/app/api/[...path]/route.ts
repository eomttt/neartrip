function notFound() {
  return Response.json(
    { error: '없는 API 경로입니다.' },
    { status: 404, headers: { 'Cache-Control': 'no-store' } },
  );
}
export {
  notFound as GET,
  notFound as POST,
  notFound as PUT,
  notFound as PATCH,
  notFound as DELETE,
};
