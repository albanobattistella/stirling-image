import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar";

export default function NotFound() {
  return (
    <>
      <Navbar />
      <main className="flex min-h-screen flex-col items-center justify-center px-6 pt-16">
        <span className="text-7xl">🦦</span>
        <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl">
          Hello from the otter side!
        </h1>
        <p className="mt-4 text-lg text-muted">
          This page swam away. Let&apos;s get you back on track.
        </p>
        <a
          href="/"
          className="mt-8 rounded-lg bg-accent px-6 py-3 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent-hover"
        >
          Back to homepage
        </a>
      </main>
      <Footer />
    </>
  );
}
