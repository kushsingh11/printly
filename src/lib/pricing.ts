// Pure print-pricing logic — shared by the client configurator (live preview)
// and the server action (authoritative amount). All money in paise.

export type PrintOptions = {
  pageCount: number;
  copies: number;
  color: "BW" | "COLOR";
  sided: "SINGLE" | "DOUBLE";
  paperSize: "A4" | "A3";
  binding: "NONE" | "STAPLE" | "SPIRAL";
  coverPage: boolean;
  rush: boolean;
};

// The pricing fields we need (subset of PricingSettings).
export type PriceConfig = {
  bwPerPage: number;
  colorPerPage: number;
  doubleSidedSurcharge: number;
  a3Surcharge: number;
  stapleFee: number;
  spiralFee: number;
  coverPageFee: number;
  rushPercent: number;
  freeSpiralAbove: number;
};

export type PriceBreakdown = {
  perPage: number; // effective per-page rate (paise)
  units: number; // pageCount * copies
  printSubtotal: number;
  bindingFee: number;
  coverFee: number;
  rushFee: number;
  total: number;
  freeSpiralApplied: boolean;
};

export function computePrintPrice(cfg: PriceConfig, opts: PrintOptions): PriceBreakdown {
  const pages = Math.max(0, Math.floor(opts.pageCount));
  const copies = Math.max(1, Math.floor(opts.copies));

  let perPage = opts.color === "COLOR" ? cfg.colorPerPage : cfg.bwPerPage;
  if (opts.sided === "DOUBLE") perPage += cfg.doubleSidedSurcharge;
  if (opts.paperSize === "A3") perPage += cfg.a3Surcharge;

  const units = pages * copies;
  const printSubtotal = perPage * units;

  let bindingFee = 0;
  let freeSpiralApplied = false;
  if (opts.binding === "STAPLE") {
    bindingFee = cfg.stapleFee;
  } else if (opts.binding === "SPIRAL") {
    if (cfg.freeSpiralAbove > 0 && printSubtotal >= cfg.freeSpiralAbove) {
      bindingFee = 0;
      freeSpiralApplied = true;
    } else {
      bindingFee = cfg.spiralFee;
    }
  }

  const coverFee = opts.coverPage ? cfg.coverPageFee : 0;

  const beforeRush = printSubtotal + bindingFee + coverFee;
  const rushFee = opts.rush ? Math.round((beforeRush * cfg.rushPercent) / 100) : 0;

  return {
    perPage,
    units,
    printSubtotal,
    bindingFee,
    coverFee,
    rushFee,
    total: beforeRush + rushFee,
    freeSpiralApplied,
  };
}
