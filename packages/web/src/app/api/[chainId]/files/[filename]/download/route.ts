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

  return new Response(
    Buffer.from(file.contents, file.encoding === "base64" ? "base64" : "utf-8"),
    {
      headers: {
        "Content-Disposition": `attachment; filename=${encodeURIComponent(file.filename)}`,
        ...(file.type ? { "Content-Type": file.type } : null),
      },
    },
  );
}
