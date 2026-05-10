import { type FormEvent, useCallback, useEffect, useState } from "react";
import { setToken } from "@/lib/api";

const phrases = [
  "No signups. No accounts.",
  "No uploads to the cloud. Ever.",
  "100% local processing.",
  "Free. Forever.",
  "No limits. No hidden caps.",
  "Works fully offline.",
  "Unlimited batch processing.",
  "51 image tools.",
  "15 AI models. Your hardware.",
  "Lightning fast. Built on Sharp.",
  "Air-gapped ready.",
  "One Docker container.",
  "Open source. Always.",
  "Every pixel stays on your hardware.",
  "Your server. Your rules.",
  "Deploys in a single docker pull.",
  "The self-hosted alternative.",
  "Resize, compress, convert. Locally.",
  "Free image editor. No watermarks.",
  "Bulk image processing. Unlimited.",
  "Remove backgrounds offline.",
  "Self-hosted Canva alternative.",
  "No API keys needed.",
  "GDPR compliant by design.",
  "Works without internet.",
];

function RotatingPhrase() {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  const advance = useCallback(() => {
    setVisible(false);
    setTimeout(() => {
      setIndex((i) => (i + 1) % phrases.length);
      setVisible(true);
    }, 300);
  }, []);

  useEffect(() => {
    const timer = setInterval(advance, 3000);
    return () => clearInterval(timer);
  }, [advance]);

  return (
    <span
      className="inline-block transition-all duration-300 text-white/90"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(-8px)",
      }}
    >
      {phrases[index]}
    </span>
  );
}

export function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Invalid username or password");
        return;
      }
      const data = await res.json();
      setToken(data.token);
      // Store username for settings display
      localStorage.setItem("snapotter-username", data.user?.username || username);
      // Redirect to password change if required, otherwise go home
      if (data.user?.mustChangePassword) {
        window.location.href = "/change-password";
      } else {
        window.location.href = "/";
      }
    } catch {
      setError("Connection error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              <span className="text-primary">SnapOtter</span>
            </h1>
            <h2 className="text-2xl font-bold mt-4 text-foreground">Login</h2>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium mb-1 text-foreground">
                Username
              </label>
              <input
                id="username"
                type="text"
                name="username"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                required
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-1 text-foreground">
                Password
              </label>
              <input
                id="password"
                type="password"
                name="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                required
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <button
              type="submit"
              disabled={loading || !username || !password}
              className="w-full py-3 rounded-lg bg-primary/80 text-primary-foreground font-medium hover:bg-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>
        </div>
      </div>
      <div className="hidden lg:flex flex-1 bg-primary/90 items-center justify-center p-12 text-white rounded-l-3xl">
        <div className="max-w-lg space-y-4 text-center">
          <h2 className="text-4xl font-extrabold tracking-tight">Your images. Stay yours.</h2>
          <p className="text-lg text-white/70">Every image tool you need.</p>
          <p className="text-xl font-medium h-8">
            <RotatingPhrase />
          </p>
        </div>
      </div>
    </div>
  );
}
