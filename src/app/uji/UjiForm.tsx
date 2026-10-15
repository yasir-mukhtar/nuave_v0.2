"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { writeTestPassCode } from "@/lib/intake/test-pass";

/**
 * R-20: one code field. The code goes to this tab's session storage and
 * nowhere else; the journey sends it in the order request body. The input has
 * no `name` and the form has no action, so even with scripts off the browser
 * could never put the code in a URL. A wrong code is not told apart here: the
 * server gives the same neutral answer for every refusal.
 */
export default function UjiForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) return;
    if (!writeTestPassCode(trimmed)) {
      setError("Kode tidak dapat disimpan di tab ini.");
      return;
    }
    router.push("/audit");
  }

  return (
    <main className="mx-auto grid max-w-[560px] gap-5 px-6 py-14">
      <h1 className="type-heading-lg">Uji</h1>
      <form className="grid gap-5" onSubmit={submit}>
        <label className="grid gap-2 type-label">
          Kode uji
          <Input
            type="password"
            autoComplete="off"
            maxLength={256}
            value={code}
            onChange={(event) => {
              setCode(event.target.value);
              setError(null);
            }}
          />
        </label>
        {error ? (
          <p role="alert" className="type-copy text-destructive">
            {error}
          </p>
        ) : null}
        <Button type="submit" className="min-h-11 w-fit rounded-full px-6">
          Lanjut
        </Button>
      </form>
    </main>
  );
}
