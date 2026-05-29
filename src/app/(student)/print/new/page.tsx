import Link from "next/link";
import { getSettings } from "@/lib/sheets";
import { requireRole } from "@/lib/session";
import { PrintConfigurator } from "@/components/student/PrintConfigurator";

export default async function NewPrintPage() {
  await requireRole("STUDENT");
  const s = await getSettings();

  const priceConfig = {
    bwPerPage: s.bwPerPage,
    colorPerPage: s.colorPerPage,
    doubleSidedSurcharge: s.doubleSidedSurcharge,
    a3Surcharge: s.a3Surcharge,
    stapleFee: s.stapleFee,
    spiralFee: s.spiralFee,
    coverPageFee: s.coverPageFee,
    rushPercent: s.rushPercent,
    freeSpiralAbove: s.freeSpiralAbove,
  };

  return (
    <div>
      <div className="mb-4">
        <Link href="/print" className="text-sm text-neutral-500 hover:underline">
          ← Back
        </Link>
        <h1 className="mt-1 text-xl font-semibold">New print job</h1>
      </div>
      <PrintConfigurator priceConfig={priceConfig} acceptingJobs={s.acceptingJobs} />
    </div>
  );
}
