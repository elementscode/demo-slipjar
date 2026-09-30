import { Request, Response, sql, NotFoundError } from "@elements/app";
import { requireUser } from "#app/shared/services/auth";
import { RECEIPT_TYPES } from "#app/shared/services/workflow";

interface ReceiptBytes {
  userId: string;
  contentType: string;
  hash: string;
  data: Buffer;
}

const YEAR = 31536000;

/**
 * Serves a receipt image to its owner or an approver. The hash in the URL
 * names the bytes, so the browser can keep them for good.
 */
export default function serveReceipt(req: Request, res: Response) {
  let user = requireUser();

  let receipt = sql<ReceiptBytes>(`
    select userId, contentType, hash, data from receipts where id = ${req.params.id}
  `).first();

  if (!receipt || receipt.hash !== req.params.hash || (receipt.userId !== user.id && user.role !== "approver")) {
    throw new NotFoundError("receipt not found");
  }

  if (RECEIPT_TYPES.has(receipt.contentType) || receipt.contentType === "image/svg+xml") {
    res.setHeader("Content-Type", receipt.contentType);
  } else {
    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader("Content-Disposition", "attachment");
  }

  // Seeded receipts are svg. Opened directly, an svg is a document that could
  // run script, so it gets no script and no network.
  res.setHeader("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'; sandbox");
  res.setHeader("Cache-Control", `private, max-age=${YEAR}, immutable`);

  return receipt.data;
}
