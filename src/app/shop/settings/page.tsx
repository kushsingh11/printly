import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { SettingsForm } from "@/components/shop/SettingsForm";

export default async function SettingsPage() {
  await requireRole("SHOPKEEPER");
  const s = await prisma.pricingSettings.findUnique({ where: { id: 1 } });
  if (!s) return <div className="p-6">Settings not initialized.</div>;

  return (
    <div className="p-6">
      <header className="mb-5">
        <h1 className="text-2xl font-semibold">Print pricing</h1>
        <p className="text-sm text-neutral-500">
          What students see when they configure a print. Changes go live instantly.
        </p>
      </header>
      <SettingsForm
        settings={{
          bwPerPage: s.bwPerPage,
          colorPerPage: s.colorPerPage,
          doubleSidedSurcharge: s.doubleSidedSurcharge,
          a3Surcharge: s.a3Surcharge,
          stapleFee: s.stapleFee,
          spiralFee: s.spiralFee,
          coverPageFee: s.coverPageFee,
          rushPercent: s.rushPercent,
          freeSpiralAbove: s.freeSpiralAbove,
          acceptingJobs: s.acceptingJobs,
          allowCashOnCollection: s.allowCashOnCollection,
          autoEmailWhenReady: s.autoEmailWhenReady,
          upiId: s.upiId,
          shopName: s.shopName,
          shopLocation: s.shopLocation,
        }}
      />
    </div>
  );
}
