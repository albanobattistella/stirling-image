import { type FormEvent, useState } from "react";

function generatePassword(): string {
  const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lower = "abcdefghijklmnopqrstuvwxyz";
  const digits = "0123456789";
  const all = upper + lower + digits;
  // Guarantee at least one of each required character class
  const required = [
    upper[Math.floor(Math.random() * upper.length)],
    lower[Math.floor(Math.random() * lower.length)],
    digits[Math.floor(Math.random() * digits.length)],
  ];
  const rest = Array.from({ length: 13 }, () => all[Math.floor(Math.random() * all.length)]);
  // Shuffle so the required chars aren't always at the start
  const chars = [...required, ...rest];
  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

export function ChangePasswordPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showGenerated, setShowGenerated] = useState(false);

  const handleGenerate = () => {
    const pw = generatePassword();
    setNewPassword(pw);
    setConfirmPassword(pw);
    setShowGenerated(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("stirling-token");
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to change password");
        return;
      }

      // Password changed, reload to re-check auth state
      window.location.href = "/";
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
              Stirling <span className="text-primary">Image</span>
            </h1>
            <h2 className="text-2xl font-bold mt-4 text-foreground">Change your password</h2>
            <p className="text-sm text-muted-foreground mt-2">
              You need to set a new password before continuing. Your password must be at least 8
              characters with uppercase, lowercase, and a number.
            </p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Hidden username so the browser associates saved credentials correctly */}
            <input
              type="hidden"
              name="username"
              autoComplete="username"
              value={localStorage.getItem("stirling-username") || "admin"}
            />
            <div>
              <label
                htmlFor="current-password"
                className="block text-sm font-medium mb-1 text-foreground"
              >
                Current password
              </label>
              <input
                id="current-password"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                required
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="new-password" className="text-sm font-medium text-foreground">
                  New password
                </label>
                <button
                  type="button"
                  onClick={handleGenerate}
                  className="text-xs text-primary hover:text-primary/80 font-medium"
                >
                  Generate strong password
                </button>
              </div>
              <input
                id="new-password"
                type={showGenerated ? "text" : "password"}
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  setShowGenerated(false);
                }}
                placeholder="At least 8 characters"
                className={`w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 ${showGenerated ? "font-mono text-sm" : ""}`}
                required
                minLength={8}
              />
            </div>
            <div>
              <label
                htmlFor="confirm-password"
                className="block text-sm font-medium mb-1 text-foreground"
              >
                Confirm new password
              </label>
              <input
                id="confirm-password"
                type={showGenerated ? "text" : "password"}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setShowGenerated(false);
                }}
                placeholder="Repeat new password"
                className={`w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 ${showGenerated ? "font-mono text-sm" : ""}`}
                required
                minLength={8}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <button
              type="submit"
              disabled={loading || !currentPassword || !newPassword || !confirmPassword}
              className="w-full py-3 rounded-lg bg-primary/80 text-primary-foreground font-medium hover:bg-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Changing..." : "Change password"}
            </button>
          </form>
        </div>
      </div>
      <div className="hidden lg:flex flex-1 bg-primary/90 items-center justify-center p-12 text-white rounded-l-3xl">
        <div className="max-w-lg space-y-6 text-center">
          <h2 className="text-3xl font-bold">Almost there</h2>
          <p className="text-lg text-white/80">
            Set a strong password to secure your account, then you are good to go.
          </p>
        </div>
      </div>
    </div>
  );
}
