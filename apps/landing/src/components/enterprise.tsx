import { Lock, Server, Users } from "lucide-react";

import { FadeIn } from "./fade-in";

const features = [
  {
    title: "Data Sovereignty",
    description:
      "Your images never leave your network. No external API calls, no cloud dependencies. GDPR, HIPAA, CCPA compliant by architecture.",
    icon: Lock,
    gradient: "from-amber-500/10 to-orange-500/5",
  },
  {
    title: "Enterprise Controls",
    description:
      "Multi-user authentication, team permissions, API key management, and audit logging for regulated environments.",
    icon: Users,
    gradient: "from-blue-500/10 to-indigo-500/5",
  },
  {
    title: "Deploy Anywhere",
    description:
      "Docker, Kubernetes, bare metal. ARM and x86. Air-gapped networks. One container, any infrastructure.",
    icon: Server,
    gradient: "from-emerald-500/10 to-teal-500/5",
  },
];

export function Enterprise() {
  return (
    <section id="enterprise" className="px-6 py-24 md:py-36">
      <div className="mx-auto max-w-6xl">
        <FadeIn>
          <p className="text-center text-sm font-medium text-accent">Enterprise ready</p>
          <h2 className="mt-2 text-center text-3xl font-bold tracking-tight md:text-4xl">
            Your data never leaves your network.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-center text-lg text-muted">
            Deploy on your infrastructure, behind your firewall, on your terms.
          </p>
        </FadeIn>

        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {features.map((feat, i) => (
            <FadeIn key={feat.title} delay={i * 0.1}>
              <div
                className={`group h-full rounded-2xl bg-gradient-to-br ${feat.gradient} border border-border p-8 transition-all hover:shadow-lg hover:-translate-y-0.5`}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-background shadow-sm">
                  <feat.icon size={22} className="text-accent" />
                </div>
                <h3 className="mt-5 text-xl font-bold">{feat.title}</h3>
                <p className="mt-3 leading-relaxed text-muted">{feat.description}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
