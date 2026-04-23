import { Lock, Server, Users } from "lucide-react";

import { FadeIn } from "./fade-in";

const features = [
  {
    title: "Data Sovereignty",
    description:
      "Your images never leave your network. No external API calls, no cloud dependencies. Full GDPR, HIPAA, CCPA compliance by architecture.",
    icon: Lock,
  },
  {
    title: "Enterprise Controls",
    description:
      "Multi-user authentication, team permissions, API key management, and audit logging. Everything you need for regulated environments.",
    icon: Users,
  },
  {
    title: "Deploy Anywhere",
    description:
      "Docker, Kubernetes, bare metal. ARM and x86. Air-gapped networks. One container, any infrastructure.",
    icon: Server,
  },
];

export function Enterprise() {
  return (
    <section id="enterprise" className="px-6 py-24 md:py-36">
      <div className="mx-auto max-w-6xl">
        <FadeIn>
          <h2 className="text-center text-3xl font-bold tracking-tight md:text-4xl">
            Built for organizations that take data seriously.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-center text-lg text-muted">
            Self-host on your own infrastructure. Your images never leave your network.
          </p>
        </FadeIn>

        <div className="mt-16 grid gap-8 md:grid-cols-3 md:gap-12">
          {features.map((feat, i) => (
            <FadeIn key={feat.title} delay={i * 0.1}>
              <div className="rounded-2xl border border-border bg-background-alt p-8 transition-all hover:shadow-md">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10">
                  <feat.icon size={22} className="text-accent" />
                </div>
                <h3 className="mt-4 text-xl font-bold">{feat.title}</h3>
                <p className="mt-3 leading-relaxed text-muted">{feat.description}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
