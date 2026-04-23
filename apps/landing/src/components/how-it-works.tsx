import { FadeIn } from "./fade-in";

export function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-background-alt px-6 py-20 md:py-28">
      <div className="mx-auto max-w-2xl text-center">
        <FadeIn>
          <p className="text-sm font-medium text-accent">Get started in seconds</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight md:text-3xl">
            One command. That's it.
          </h2>
        </FadeIn>

        <FadeIn delay={0.1}>
          <div className="mt-8 overflow-hidden rounded-xl border border-border bg-[#1e1e1e] shadow-lg">
            <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2.5">
              <div className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
              <div className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
              <div className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
            </div>
            <div className="px-5 py-4 text-left font-mono text-sm">
              <p className="text-white">
                <span className="text-green-400">$</span>{" "}
                <span className="select-all">
                  docker run -d -p 1349:1349 -v snapotter-data:/data ghcr.io/ashim-hq/ashim:latest
                </span>
              </p>
            </div>
          </div>
        </FadeIn>

        <FadeIn delay={0.15}>
          <p className="mt-6 text-sm text-muted">
            Linux, macOS, Windows. ARM and x86.{" "}
            <a
              href="https://docs.snapotter.com"
              className="font-medium text-accent hover:underline"
            >
              Full docs
            </a>
          </p>
        </FadeIn>
      </div>
    </section>
  );
}
