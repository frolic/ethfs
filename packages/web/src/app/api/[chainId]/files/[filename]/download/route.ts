import { getFile } from "../getFile";

export async function GET(
  req: Request,
  { params }: { params: { chainId: string; filename: string } },
) {
  const chainId = parseInt(params.chainId) || 0;

  const file = await getFile(chainId, params.filename);

  // TODO: handle reverts (e.g. FileNotFound)
  // TODO: add cache headers

  if (!file) return new Response(null, { status: 404 });

  return new Response(null, {
    status: 302,
    headers: {
      Location: `data:${file.type}${
        file.encoding === "base64" ? ";base64" : ""
      },${file.contents}`,
    },
  });
}
