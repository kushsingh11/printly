"use client";

import { useActionState } from "react";
import { updateSettings, type SettingsActionState } from "@/lib/actions/settings";

type Settings = {
  bwPerPage: number;
  colorPerPage: number;
  doubleSidedSurcharge: number;
  a3Surcharge: number;
  stapleFee: number;
  spiralFee: number;
  coverPageFee: number;
  rushPercent: number;
  freeSpiralAbove: number;
  acceptingJobs: boolean;
  allowCashOnCollection: boolean;
  autoEmailWhenReady: boolean;
  upiId: string | null;
  shopName: string;
  shopLocation: string;
};

const card = "rounded-2xl border border-neutral-200 bg-white p-5";
const inputClass = "w-28 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm text-right";
const textClass = "w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm";

const r = (paise: number) => String(paise / 100);

export function SettingsForm({ settings }: { settings: Settings }) {
  const [state, formAction, isPending] = useActionState<SettingsActionState, FormData>(
    updateSettings,
    undefined,
  );

  return (
    <form action={formAction} className="max-w-2xl space-y-4">
      <section className={card}>
        <h2 className="text-sm font-semibold">Per-page rates</h2>
        <p className="mb-3 text-xs text-neutral-500">Multiplied by pages × copies on every print job.</p>
        <div className="divide-y divide-neutral-100">
          <Money label="Black & white (₹/page)" name="bwPerPage" def={r(settings.bwPerPage)} />
          <Money label="Color (₹/page)" name="colorPerPage" def={r(settings.colorPerPage)} />
          <Money label="Double-sided surcharge (₹/page)" name="doubleSidedSurcharge" def={r(settings.doubleSidedSurcharge)} />
          <Money label="A3 surcharge (₹/page)" name="a3Surcharge" def={r(settings.a3Surcharge)} />
        </div>
      </section>

      <section className={card}>
        <h2 className="text-sm font-semibold">Add-ons</h2>
        <p className="mb-3 text-xs text-neutral-500">Flat fee per job, charged once.</p>
        <div className="divide-y divide-neutral-100">
          <Money label="Staple binding (₹)" name="stapleFee" def={r(settings.stapleFee)} />
          <Money label="Spiral binding (₹)" name="spiralFee" def={r(settings.spiralFee)} />
          <Money label="Printed cover page (₹)" name="coverPageFee" def={r(settings.coverPageFee)} />
          <Row label="Rush uplift (%)">
            <input type="number" name="rushPercent" min={0} max={200} defaultValue={settings.rushPercent} className={inputClass} />
          </Row>
        </div>
      </section>

      <section className={card}>
        <h2 className="text-sm font-semibold">Policies</h2>
        <div className="mt-2 divide-y divide-neutral-100">
          <Money label="Free spiral binding above (₹, 0 = off)" name="freeSpiralAbove" def={r(settings.freeSpiralAbove)} />
          <Toggle label="Accept new print jobs" name="acceptingJobs" def={settings.acceptingJobs} hint="Turn off when machines are down." />
          <Toggle label="Allow cash on collection" name="allowCashOnCollection" def={settings.allowCashOnCollection} hint="Students can pay at the counter." />
          <Toggle label="Notify students when ready" name="autoEmailWhenReady" def={settings.autoEmailWhenReady} hint="Sends the ‘ready for pickup’ alert." />
        </div>
      </section>

      <section className={card}>
        <h2 className="text-sm font-semibold">Payment &amp; shop</h2>
        <p className="mb-3 text-xs text-neutral-500">Students pay to this UPI ID; a QR is generated automatically.</p>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-500">UPI ID</label>
            <input name="upiId" defaultValue={settings.upiId ?? ""} placeholder="shop@okaxis" className={textClass} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-500">Shop name</label>
              <input name="shopName" defaultValue={settings.shopName} required className={textClass} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-500">Location</label>
              <input name="shopLocation" defaultValue={settings.shopLocation} className={textClass} />
            </div>
          </div>
        </div>
      </section>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={isPending} className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60">
          {isPending ? "Saving…" : "Save changes"}
        </button>
        {state?.ok && <span className="text-sm font-medium text-success">Saved ✓</span>}
        {state?.error && <span className="text-sm text-red-600">{state.error}</span>}
      </div>
    </form>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <span className="text-sm text-neutral-600">{label}</span>
      {children}
    </div>
  );
}

function Money({ label, name, def }: { label: string; name: string; def: string }) {
  return (
    <Row label={label}>
      <input type="number" step="0.01" min="0" name={name} defaultValue={def} className={inputClass} />
    </Row>
  );
}

function Toggle({ label, name, def, hint }: { label: string; name: string; def: boolean; hint: string }) {
  return (
    <label className="flex items-center justify-between py-2.5">
      <span>
        <span className="block text-sm text-neutral-700">{label}</span>
        <span className="block text-xs text-neutral-400">{hint}</span>
      </span>
      <input type="checkbox" name={name} defaultChecked={def} className="h-4 w-4" />
    </label>
  );
}
