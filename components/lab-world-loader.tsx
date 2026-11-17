"use client";

import dynamic from "next/dynamic";

// three.js stays out of the first load: the page is readable before the lab arrives behind it.
const LabWorld = dynamic(() => import("@/components/lab-world").then((mod) => mod.LabWorld), { ssr: false });

export function LabWorldLoader() {
  return <LabWorld />;
}
