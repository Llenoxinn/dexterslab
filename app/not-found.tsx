import Link from "next/link";
import { MagnifierIcon } from "@/components/icons";
import { SiteHeader } from "@/components/site-header";

export const metadata = { title: "Specimen not found" };

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="hero hero--static on-ink">
        <div className="hero-frame" aria-hidden="true">
          <span className="corner corner--tl" />
          <span className="corner corner--tr" />
          <span className="corner corner--bl" />
          <span className="corner corner--br" />
        </div>
        <div className="wrap hero-main">
          <MagnifierIcon className="lost-icon" />
          <h1 className="display hero-title">Specimen not found.</h1>
          <div className="hero-lede">
            <p>This page isn’t part of the experiment. It may have been moved, or it never existed.</p>
            <Link href="/" className="btn btn-solid btn-lg">
              Back to the lab
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
