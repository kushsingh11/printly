import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { PrintConfigurator } from "@/components/student/PrintConfigurator";

export default async function NewPrintPage() {
  await requireRole("STUDENT");
  const s = await prisma.pricingSettings.findUnique({ where: { id: 1 } });

  const priceConfig = {
    bwPerPage: s?.bwPerPage ?? 200,
    colorPerPage: s?.colorPerPage ?? 1000,
    doubleSidedSurcharge: s?.doubleSidedSurcharge ?? 0,
    a3Surcharge: s?.a3Surcharge ?? 300,
    stapleFee: s?.stapleFee ?? 500,
    spiralFee: s?.spiralFee ?? 3000,
    coverPageFee: s?.coverPageFee ?? 1000,
    rushPercent: s?.rushPercent ?? 20,
    freeSpiralAbove: s?.freeSpiralAbove ?? 0,
  };

  return (
    <div>
      <div className="mb-4">
        <Link href="/print" className="text-sm text-neutral-500 hover:underline">
          ← Back
        </Link>
        <h1 className="mt-1 text-xl font-semibold">New print job</h1>
      </div>
      <PrintConfigurator priceConfig={priceConfig} acceptingJobs={s?.acceptingJobs ?? true} />
    </div>
  );
}
