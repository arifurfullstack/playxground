import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Eye, EyeOff, Lock, Mail, Sparkles, Crown, ShieldCheck, User, IdCard, Camera, CreditCard, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

/**
 * PlayGroundX — Auth (Preview)
 * ------------------------------------------------
 * Polished Create Account / Sign In page with a blurred neon collage backdrop.
 * - No real auth; buttons are UI-only.
 * - Designed to match the PlayGroundX neon nightclub aesthetic.
 */

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function Logo() {
  return (
    <div className="flex items-center gap-3 select-none">
      <div className="text-2xl leading-none">
        <span className="pgx-logo">PlayGround</span>
        <span className="pgx-logo-x">X</span>
      </div>
      <span className="ml-1 text-[10px] px-2 py-[2px] rounded-full border border-pink-500/40 text-pink-200 bg-black/40">
        Preview
      </span>
    </div>
  );
}

const CollageTile = ({ label, tone, className }: { label: string; tone: "pink" | "cyan" | "violet" | "lime"; className?: string }) => {
  const toneBg =
    tone === "cyan"
      ? "from-cyan-400/25 via-black to-fuchsia-500/10"
      : tone === "violet"
        ? "from-violet-500/25 via-black to-cyan-400/10"
        : tone === "lime"
          ? "from-lime-300/18 via-black to-emerald-500/10"
          : "from-fuchsia-500/25 via-black to-cyan-400/10";

  return (
    <div className={cx("relative overflow-hidden rounded-2xl border border-white/10 bg-black/40", "shadow-[0_0_34px_rgba(255,0,200,0.14),0_0_78px_rgba(0,230,255,0.10)]", className)}>
      <div className={cx("absolute inset-0 bg-gradient-to-b", toneBg)} />
      <div className="absolute inset-0 opacity-60" style={{ backgroundImage: "radial-gradient(circle at 30% 25%, rgba(255,0,200,.20), transparent 55%), radial-gradient(circle at 70% 55%, rgba(0,230,255,.18), transparent 60%)" }} />
      <div className="absolute inset-0 backdrop-blur-[2px]" />
      <div className="relative h-full w-full p-4 flex items-end">
        <div className="text-sm text-gray-100">
          <div className="text-[10px] text-gray-300">Room preview</div>
          <div className="font-semibold drop-shadow-[0_0_44px_rgba(255,0,200,0.45)]">{label}</div>
        </div>
      </div>
    </div>
  );
};

function usePreviewTiles() {
  return useMemo(
    () => [
      { label: "Suga 4 U", tone: "pink" as const },
      { label: "Flash Drops", tone: "cyan" as const },
      { label: "Bar Lounge", tone: "violet" as const },
      { label: "Confessions", tone: "pink" as const },
      { label: "X Chat", tone: "lime" as const },
      { label: "Truth or Dare", tone: "cyan" as const },
    ],
    []
  );
}

const SocialButton = ({ children }: { children: React.ReactNode }) => (
  <Button
    variant="outline"
    className={cx(
      "h-11 w-full justify-center gap-2 rounded-xl",
      "border-white/10 bg-black/35 text-gray-100",
      "hover:bg-white/5",
      "shadow-[0_0_18px_rgba(0,230,255,0.10)]"
    )}
    type="button"
  >
    {children}
  </Button>
);

export default function AuthPagePreview() {
  const tiles = usePreviewTiles();
  const [mode, setMode] = useState<"signin" | "create">("signin");
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(true);
  const [agree, setAgree] = useState(false);

  // Create account (Fan vs Creator) — Preview state
  const [createRole, setCreateRole] = useState<"fan" | "creator">("fan");
  const [createStep, setCreateStep] = useState<1 | 2 | 3 | 4>(1);
  const [verificationStatus, setVerificationStatus] = useState<"not_started" | "submitted" | "under_review" | "verified" | "rejected">("not_started");
  const [idFront, setIdFront] = useState(false);
  const [idBack, setIdBack] = useState(false);
  const [selfieDone, setSelfieDone] = useState(false);
  const [attest18, setAttest18] = useState(false);
  const [attestSelf, setAttestSelf] = useState(false);
  const [attestConsent, setAttestConsent] = useState(false);

  // Fan onboarding — Preview state (18+ required + ID verification + optional Suga badge)
  const [fanStep, setFanStep] = useState<1 | 2 | 3>(1);
  const [fanVerificationStatus, setFanVerificationStatus] = useState<"not_started" | "submitted" | "under_review" | "verified" | "rejected">("not_started");
  const [fanIdFront, setFanIdFront] = useState(false);
  const [fanIdBack, setFanIdBack] = useState(false);
  const [fanSelfieDone, setFanSelfieDone] = useState(false);
  const [fanAttest18, setFanAttest18] = useState(false);
  const [fanAttestSelf, setFanAttestSelf] = useState(false);
  const [fanAttestConsent, setFanAttestConsent] = useState(false);
  const [sugaIdentity, setSugaIdentity] = useState<"none" | "daddy" | "mama">("none");
  const [sugaTier, setSugaTier] = useState<"bronze" | "silver" | "gold" | "vip">("bronze");

  // Creator add-on — Suga Baby badge system (Suga 4 U)
  const [creatorTierEnabled, setCreatorTierEnabled] = useState(false);
  const [creatorTierLevel, setCreatorTierLevel] = useState<"rising" | "pro" | "elite" | "vip">("rising");
  const [creatorSugaBadgeEnabled, setCreatorSugaBadgeEnabled] = useState(false);

  const creatorReadyToSubmit = idFront && (idBack || true) && selfieDone && attest18 && attestSelf && attestConsent;
  const canContinueCreatorStep1 = agree;
  const canContinueCreatorStep2 = true; // Profile fields are visual-only in Preview
  const creatorSubmitted = verificationStatus === "submitted" || verificationStatus === "under_review" || verificationStatus === "verified";
  const creatorVerified = verificationStatus === "verified";

  const fanReadyToSubmit = fanIdFront && (fanIdBack || true) && fanSelfieDone && fanAttest18 && fanAttestSelf && fanAttestConsent;
  const fanSubmitted = fanVerificationStatus === "submitted" || fanVerificationStatus === "under_review" || fanVerificationStatus === "verified";
  const fanVerified = fanVerificationStatus === "verified";

  function nextCreateStep() {
    setCreateStep((s) => (s < 4 ? ((s + 1) as any) : s));
  }
  function prevCreateStep() {
    setCreateStep((s) => (s > 1 ? ((s - 1) as any) : s));
  }

  // --- Real Auth Integration ---
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Sign In State
  const [signinEmail, setSigninEmail] = useState("");
  const [signinPassword, setSigninPassword] = useState("");

  // Fan Sign Up State
  const [fanFirst, setFanFirst] = useState("");
  const [fanLast, setFanLast] = useState("");
  const [fanUsername, setFanUsername] = useState("");
  const [fanEmail, setFanEmail] = useState("");
  const [fanPassword, setFanPassword] = useState("");
  const [fanDob, setFanDob] = useState("");

  // Creator Sign Up State
  const [creatorHandle, setCreatorHandle] = useState("");
  const [creatorEmail, setCreatorEmail] = useState("");
  const [creatorPassword, setCreatorPassword] = useState("");

  const handleSignIn = async () => {
    if (!signinEmail || !signinPassword) {
      toast({ title: "Error", description: "Please enter email and password", variant: "destructive" });
      return;
    }
    const { error } = await signIn(signinEmail, signinPassword);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      navigate("/feed");
    }
  };

  const handleFanSignUp = async () => {
    if (!fanEmail || !fanPassword || !fanUsername) {
      toast({ title: "Error", description: "Please fill in all required fields", variant: "destructive" });
      return;
    }

    // Auto-detect admin role for development
    const role = fanEmail.endsWith("@admin.com") ? "admin" : "fan";

    // Note: Passing extra metadata like firstName/lastName might require updating AuthContext or Supabase trigger
    // For now we use the supported fields
    const { error } = await signUp(fanEmail, fanPassword, fanUsername, role);
    if (error) {
      let desc = error.message;
      if (error.message.includes("Database error saving new user")) {
        desc = "Username or Email already taken. Please try another.";
      }
      toast({ title: "Registration Failed", description: desc, variant: "destructive" });
    } else {
      toast({ title: "Success", description: `Account created! ${role === 'admin' ? 'Welcome Admin.' : 'Please check your email.'}` });
      navigate(role === 'admin' ? "/admin" : "/feed");
    }
  };

  const handleCreatorSignUp = async () => {
    if (!creatorEmail || !creatorPassword || !creatorHandle) {
      toast({ title: "Error", description: "Please fill in all required fields", variant: "destructive" });
      return;
    }
    // Remove '@' from handle if present
    const cleanHandle = creatorHandle.startsWith("@") ? creatorHandle.slice(1) : creatorHandle;

    const { error } = await signUp(creatorEmail, creatorPassword, cleanHandle, "creator");
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Creator account created!" });
      navigate("/creator");
    }
  };

  return (
    <div className="min-h-screen w-full bg-black text-white">
      <style>{`
        @keyframes neonFlicker {
          0%, 100% { opacity: 1; filter: saturate(1.55) contrast(1.06); }
          42% { opacity: 0.95; }
          43% { opacity: 0.78; }
          44% { opacity: 1; }
          68% { opacity: 0.93; }
          69% { opacity: 0.72; }
          70% { opacity: 0.99; }
        }
        @keyframes smokeDrift {
          0% { transform: translate3d(-6%, -2%, 0) scale(1); opacity: .18; }
          50% { transform: translate3d(4%, 3%, 0) scale(1.10); opacity: .32; }
          100% { transform: translate3d(-6%, -2%, 0) scale(1); opacity: .18; }
        }
        .neon-flicker { animation: neonFlicker 7.5s infinite; }
        .neon-smoke {
          pointer-events: none;
          position: absolute;
          inset: -46px;
          filter: blur(18px);
          background:
            radial-gradient(circle at 18% 20%, rgba(255,0,200,.22), transparent 55%),
            radial-gradient(circle at 74% 38%, rgba(0,230,255,.18), transparent 60%),
            radial-gradient(circle at 35% 82%, rgba(0,255,170,.12), transparent 58%),
            radial-gradient(circle at 85% 85%, rgba(170,80,255,.14), transparent 58%),
            radial-gradient(circle at 58% 62%, rgba(200,255,0,.08), transparent 56%);
          mix-blend-mode: screen;
          animation: smokeDrift 9s ease-in-out infinite;
        }
        .pgx-logo {
          font-family: cursive;
          font-style: italic;
          color: rgba(255,0,200,0.95);
          text-shadow: 0 0 18px rgba(255,0,200,0.95), 0 0 56px rgba(255,0,200,0.55);
          filter: saturate(1.7) contrast(1.15);
        }
        .pgx-logo-x {
          font-family: cursive;
          font-style: italic;
          margin-left: 2px;
          color: rgba(0,230,255,0.95);
          text-shadow: 0 0 18px rgba(0,230,255,0.95), 0 0 56px rgba(0,230,255,0.55);
          filter: saturate(1.7) contrast(1.15);
        }
      `}</style>

      {/* Backdrop */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 opacity-70">
          <div className="absolute -left-24 top-[-160px] h-[520px] w-[520px] rounded-full bg-fuchsia-500/20 blur-3xl" />
          <div className="absolute -right-24 bottom-[-160px] h-[560px] w-[560px] rounded-full bg-cyan-400/16 blur-3xl" />
          <div className="absolute left-1/2 top-1/2 h-[620px] w-[620px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-500/10 blur-3xl" />
        </div>

        {/* Collage grid (no external images) */}
        <div className="absolute inset-0 grid grid-cols-12 gap-4 p-6 md:p-10">
          <CollageTile label={tiles[0].label} tone={tiles[0].tone} className="col-span-7 row-span-6 h-[28vh] md:h-[42vh]" />
          <CollageTile label={tiles[1].label} tone={tiles[1].tone} className="col-span-5 row-span-4 h-[20vh] md:h-[28vh]" />
          <CollageTile label={tiles[2].label} tone={tiles[2].tone} className="col-span-5 row-span-6 h-[28vh] md:h-[42vh]" />
          <CollageTile label={tiles[3].label} tone={tiles[3].tone} className="col-span-7 row-span-4 h-[20vh] md:h-[28vh]" />
          <CollageTile label={tiles[4].label} tone={tiles[4].tone} className="col-span-4 row-span-4 hidden h-[20vh] md:block md:h-[28vh]" />
          <CollageTile label={tiles[5].label} tone={tiles[5].tone} className="col-span-8 row-span-4 hidden h-[20vh] md:block md:h-[28vh]" />
        </div>

        <div className="absolute inset-0 bg-black/55 backdrop-blur-2xl" />
      </div>

      {/* Content */}
      <div className="relative mx-auto flex min-h-screen max-w-6xl items-center justify-center px-4 py-10 md:px-8">
        <div className="grid w-full grid-cols-1 gap-8 md:grid-cols-2 md:gap-10">
          {/* Left: Brand panel */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="hidden md:flex"
          >
            <div className="relative w-full rounded-3xl border border-pink-500/20 bg-black/40 p-8 shadow-2xl backdrop-blur-xl">
              <div className="neon-smoke" aria-hidden="true" />

              <div className="relative">
                <Logo />

                <div className="mt-8 space-y-4">
                  <h1 className="text-3xl font-semibold leading-tight text-gray-50">
                    Step into the rooms.
                    <span className="block text-fuchsia-300 drop-shadow-[0_0_46px_rgba(255,0,200,0.85)] neon-flicker">Unlock the moments.</span>
                  </h1>
                  <p className="max-w-md text-base text-gray-200/80">
                    PlayGroundX is a neon nightlife playground: live rooms, drops, games, and private interactions.
                    Sign in to continue — or create an account to start exploring.
                  </p>
                </div>

                <div className="mt-8 grid grid-cols-1 gap-3">
                  <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-black/35 p-4">
                    <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl bg-white/10">
                      <ShieldCheck className="h-5 w-5 text-cyan-200" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-100">Secure sessions</div>
                      <div className="text-sm text-gray-200/70">Encrypted auth, optional MFA, device controls.</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-black/35 p-4">
                    <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl bg-white/10">
                      <Lock className="h-5 w-5 text-fuchsia-300" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-100">Private by design</div>
                      <div className="text-sm text-gray-200/70">Locked rooms, consent-first access, clear controls.</div>
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex flex-wrap items-center gap-2">
                  <Badge className="rounded-full bg-white/10 text-gray-100 hover:bg-white/10">Fast entry</Badge>
                  <Badge className="rounded-full bg-white/10 text-gray-100 hover:bg-white/10">Neon rooms</Badge>
                  <Badge className="rounded-full bg-white/10 text-gray-100 hover:bg-white/10">Creator-led</Badge>
                </div>

                <div className="mt-10 text-xs text-gray-300/70">
                  Preview note: This is a visual mockup only — no real payments or identity checks.
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right: Auth card */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.05 }}
            className="flex items-center justify-center"
          >
            <Card className="w-full max-w-md rounded-3xl border border-pink-500/20 bg-black/55 shadow-2xl backdrop-blur-xl">
              <CardHeader className="space-y-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-2xl text-gray-50">Welcome</CardTitle>
                  <Badge className="rounded-full border border-white/10 bg-black/40 text-gray-200">Preview</Badge>
                </div>
                <CardDescription className="text-gray-200/70">Sign in or create your account to continue.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Tabs value={mode} onValueChange={(v) => setMode(v as any)} className="w-full">
                  <TabsList className="grid w-full grid-cols-2 rounded-2xl bg-black/35 p-1 border border-white/10">
                    <TabsTrigger value="signin" className="rounded-xl data-[state=active]:bg-pink-600 data-[state=active]:text-white">
                      Sign in
                    </TabsTrigger>
                    <TabsTrigger value="create" className="rounded-xl data-[state=active]:bg-pink-600 data-[state=active]:text-white">
                      Create account
                    </TabsTrigger>
                  </TabsList>

                  {/* Sign In */}
                  <TabsContent value="signin" className="mt-6 space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="signin-email" className="text-gray-200">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <Input
                          id="signin-email"
                          type="email"
                          placeholder="name@domain.com"
                          className="h-11 rounded-xl pl-10 bg-black/40 border-white/10 text-gray-100 placeholder:text-gray-500"
                          value={signinEmail}
                          onChange={(e) => setSigninEmail(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signin-password" className="text-gray-200">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <Input
                          id="signin-password"
                          type={showPw ? "text" : "password"}
                          placeholder="••••••••"
                          className="h-11 rounded-xl pl-10 pr-10 bg-black/40 border-white/10 text-gray-100 placeholder:text-gray-500"
                          value={signinPassword}
                          onChange={(e) => setSigninPassword(e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPw((s) => !s)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-gray-300 hover:bg-white/5"
                          aria-label={showPw ? "Hide password" : "Show password"}
                        >
                          {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Checkbox id="remember" checked={remember} onCheckedChange={(v) => setRemember(!!v)} />
                        <Label htmlFor="remember" className="text-sm font-normal text-gray-200/80">
                          Remember me
                        </Label>
                      </div>
                      <Button variant="link" className="h-auto p-0 text-sm text-gray-200/80 hover:text-gray-50">
                        Forgot password?
                      </Button>
                    </div>

                    <Button
                      className="h-11 w-full rounded-xl bg-pink-600 hover:bg-pink-700"
                      onClick={handleSignIn}
                    >
                      Sign in
                    </Button>

                    <div className="relative">
                      <Separator className="bg-white/10" />
                      <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/60 px-3 text-xs text-gray-300 border border-white/10">
                        or continue with
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <SocialButton>
                        <Sparkles className="h-4 w-4" /> Google
                      </SocialButton>
                      <SocialButton>
                        <Crown className="h-4 w-4" /> Apple
                      </SocialButton>
                    </div>
                  </TabsContent>

                  {/* Create Account Boundary */}
                  <TabsContent value="create" className="mt-6 space-y-5">
                    {/* Role toggle */}
                    <div className="rounded-2xl border border-white/10 bg-black/35 p-2">
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setCreateRole("fan");
                            setCreateStep(1);
                          }}
                          className={cx(
                            "h-10 rounded-xl border text-sm font-medium transition",
                            createRole === "fan"
                              ? "border-cyan-400/40 bg-cyan-500/20 text-cyan-100 shadow-[0_0_18px_rgba(0,230,255,0.18)]"
                              : "border-white/10 bg-black/30 text-gray-200 hover:bg-white/5"
                          )}
                        >
                          <span className="inline-flex items-center gap-2"><User className="h-4 w-4" /> Fan</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setCreateRole("creator");
                            setCreateStep(1);
                          }}
                          className={cx(
                            "h-10 rounded-xl border text-sm font-medium transition",
                            createRole === "creator"
                              ? "border-pink-500/40 bg-pink-500/20 text-pink-100 shadow-[0_0_18px_rgba(255,0,200,0.18)]"
                              : "border-white/10 bg-black/30 text-gray-200 hover:bg-white/5"
                          )}
                        >
                          <span className="inline-flex items-center gap-2">
                            <IdCard className="h-4 w-4" /> Creator
                            <span className="ml-1 rounded-full border border-pink-500/30 bg-black/30 px-2 py-[1px] text-[10px] text-pink-200">
                              18+ ID required
                            </span>
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* FAN FLOW (18+ + ID verification + Suga badges) */}
                    {createRole === "fan" ? (
                      <>
                        {/* Fan stepper */}
                        <div className="rounded-2xl border border-white/10 bg-black/35 p-4">
                          <div className="flex items-center justify-between">
                            <div className="text-sm font-medium text-gray-100">Fan onboarding</div>
                            <Badge className="rounded-full border border-cyan-400/30 bg-cyan-500/10 text-cyan-100">18+ ID required</Badge>
                          </div>

                          <div className="mt-3 grid grid-cols-3 gap-2">
                            {[1, 2, 3].map((n) => {
                              const active = fanStep === n;
                              const done = fanStep > n;
                              return (
                                <div
                                  key={n}
                                  className={cx(
                                    "rounded-xl border p-2 text-center",
                                    active
                                      ? "border-cyan-400/40 bg-cyan-500/10"
                                      : done
                                        ? "border-pink-500/30 bg-pink-500/10"
                                        : "border-white/10 bg-black/20"
                                  )}
                                >
                                  <div className="text-[10px] text-gray-300">Step {n}</div>
                                  <div className="mt-1 text-[11px] font-medium text-gray-100">
                                    {n === 1 ? "Account" : n === 2 ? "ID Verify" : "Suga Badge"}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* STEP 1: Fan Account */}
                        {fanStep === 1 && (
                          <div className="space-y-4">
                            <div className="rounded-2xl border border-white/10 bg-black/35 p-4">
                              <div className="text-sm font-medium text-gray-100">Create your fan account</div>
                              <div className="mt-1 text-xs text-gray-200/70">All users must verify 18+ via government ID before entering rooms or spending.</div>
                            </div>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                              <div className="space-y-2">
                                <Label htmlFor="fan_first" className="text-gray-200">First name</Label>
                                <Input
                                  id="fan_first"
                                  placeholder="Alex"
                                  className="h-11 rounded-xl bg-black/40 border-white/10 text-gray-100 placeholder:text-gray-500"
                                  value={fanFirst}
                                  onChange={(e) => setFanFirst(e.target.value)}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="fan_last" className="text-gray-200">Last name</Label>
                                <Input
                                  id="fan_last"
                                  placeholder="Doe"
                                  className="h-11 rounded-xl bg-black/40 border-white/10 text-gray-100 placeholder:text-gray-500"
                                  value={fanLast}
                                  onChange={(e) => setFanLast(e.target.value)}
                                />
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="fan_username" className="text-gray-200">Username</Label>
                              <Input
                                id="fan_username"
                                placeholder="alex_neon"
                                className="h-11 rounded-xl bg-black/40 border-white/10 text-gray-100 placeholder:text-gray-500"
                                value={fanUsername}
                                onChange={(e) => setFanUsername(e.target.value)}
                              />
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="fan_email" className="text-gray-200">Email</Label>
                              <div className="relative">
                                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                <Input
                                  id="fan_email"
                                  type="email"
                                  placeholder="name@domain.com"
                                  className="h-11 rounded-xl pl-10 bg-black/40 border-white/10 text-gray-100 placeholder:text-gray-500"
                                  value={fanEmail}
                                  onChange={(e) => setFanEmail(e.target.value)}
                                />
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="fan_password" className="text-gray-200">Password</Label>
                              <div className="relative">
                                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                <Input
                                  id="fan_password"
                                  type={showPw ? "text" : "password"}
                                  placeholder="At least 8 characters"
                                  className="h-11 rounded-xl pl-10 pr-10 bg-black/40 border-white/10 text-gray-100 placeholder:text-gray-500"
                                  value={fanPassword}
                                  onChange={(e) => setFanPassword(e.target.value)}
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowPw((s) => !s)}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-gray-300 hover:bg-white/5"
                                  aria-label={showPw ? "Hide password" : "Show password"}
                                >
                                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Label className="text-gray-200">Date of birth</Label>
                              <Input
                                type="date"
                                className="h-11 rounded-xl bg-black/40 border-white/10 text-gray-100"
                                value={fanDob || ""}
                                onChange={(e) => setFanDob(e.target.value)}
                              />
                              <div className="text-xs text-gray-300/70">DOB is used for age gating and verification matching.</div>
                            </div>

                            <div className="flex items-start gap-2">
                              <Checkbox id="agree_fan" checked={agree} onCheckedChange={(v) => setAgree(!!v)} />
                              <Label htmlFor="agree_fan" className="text-sm font-normal leading-relaxed text-gray-200/80">
                                I agree to the <span className="underline underline-offset-4">Terms</span> and acknowledge the{" "}
                                <span className="underline underline-offset-4">Privacy Policy</span>.
                              </Label>
                            </div>

                            <Button
                              className="h-11 w-full rounded-xl bg-pink-600 hover:bg-pink-700"
                              disabled={!agree}
                              onClick={() => setFanStep(2)}
                            >
                              Continue to ID verification
                            </Button>
                          </div>
                        )}

                        {/* STEP 2: Fan ID Verification */}
                        {fanStep === 2 && (
                          <div className="space-y-4">
                            <div className="rounded-2xl border border-white/10 bg-black/35 p-4">
                              <div className="flex items-center gap-3">
                                <div className="rounded-full bg-cyan-500/20 p-2"><ShieldCheck className="h-5 w-5 text-cyan-400" /></div>
                                <div>
                                  <div className="text-sm font-medium text-gray-100">Identity Verification</div>
                                  <div className="text-xs text-gray-200/70">Powered by Stripe Identity (Preview)</div>
                                </div>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <button
                                type="button"
                                onClick={() => setFanIdFront(true)}
                                className={cx(
                                  "flex flex-col items-center justify-center gap-2 rounded-2xl border bg-black/40 p-5 transition",
                                  fanIdFront ? "border-pink-500/50 bg-pink-500/5" : "border-white/10 hover:bg-white/5"
                                )}
                              >
                                {fanIdFront ? <CheckCircle2 className="h-6 w-6 text-pink-500" /> : <Camera className="h-6 w-6 text-gray-400" />}
                                <div className="text-xs font-medium text-gray-200">ID Front</div>
                              </button>
                              <button
                                type="button"
                                onClick={() => setFanIdBack(true)}
                                className={cx(
                                  "flex flex-col items-center justify-center gap-2 rounded-2xl border bg-black/40 p-5 transition",
                                  fanIdBack ? "border-pink-500/50 bg-pink-500/5" : "border-white/10 hover:bg-white/5"
                                )}
                              >
                                {fanIdBack ? <CheckCircle2 className="h-6 w-6 text-pink-500" /> : <Camera className="h-6 w-6 text-gray-400" />}
                                <div className="text-xs font-medium text-gray-200">ID Back</div>
                              </button>
                            </div>

                            <button
                              type="button"
                              onClick={() => setFanSelfieDone(true)}
                              className={cx(
                                "flex w-full items-center justify-between rounded-2xl border bg-black/40 p-4 transition",
                                fanSelfieDone ? "border-pink-500/50 bg-pink-500/5" : "border-white/10 hover:bg-white/5"
                              )}
                            >
                              <div className="flex items-center gap-3">
                                <div className="rounded-full bg-white/10 p-2"><User className="h-5 w-5 text-gray-300" /></div>
                                <div className="text-left">
                                  <div className="text-sm font-medium text-gray-100">Liveness Selfie</div>
                                  <div className="text-[10px] text-gray-400">Match faces against your official ID</div>
                                </div>
                              </div>
                              {fanSelfieDone && <CheckCircle2 className="h-5 w-5 text-pink-500" />}
                            </button>

                            <div className="space-y-3 rounded-2xl border border-white/10 bg-black/35 p-4">
                              <div className="flex items-start gap-3">
                                <Checkbox id="fan_attest1" checked={fanAttest18} onCheckedChange={(v) => setFanAttest18(!!v)} className="mt-1" />
                                <Label htmlFor="fan_attest1" className="text-xs font-normal leading-relaxed text-gray-200/80">
                                  I attest that I am 18 years or older and the owner of this ID.
                                </Label>
                              </div>
                              <div className="flex items-start gap-3">
                                <Checkbox id="fan_attest2" checked={fanAttestSelf} onCheckedChange={(v) => setFanAttestSelf(!!v)} className="mt-1" />
                                <Label htmlFor="fan_attest2" className="text-xs font-normal leading-relaxed text-gray-200/80">
                                  I consent to biometric matching of my selfie against my ID.
                                </Label>
                              </div>
                              <div className="flex items-start gap-3">
                                <Checkbox id="fan_attest3" checked={fanAttestConsent} onCheckedChange={(v) => setFanAttestConsent(!!v)} className="mt-1" />
                                <Label htmlFor="fan_attest3" className="text-xs font-normal leading-relaxed text-gray-200/80">
                                  I understand my data is processed securely per the Privacy Policy.
                                </Label>
                              </div>
                            </div>

                            <div className="flex gap-3">
                              <Button variant="outline" className="flex-1 rounded-xl border-white/10" onClick={() => setFanStep(1)}>Back</Button>
                              <Button
                                className="flex-[2] rounded-xl bg-pink-600 hover:bg-pink-700"
                                disabled={!fanReadyToSubmit}
                                onClick={() => {
                                  setFanVerificationStatus("under_review");
                                  setFanStep(3);
                                }}
                              >
                                Submit for review
                              </Button>
                            </div>
                          </div>
                        )}

                        {/* STEP 3: Fan Suga Identity / Badges (Optional) */}
                        {fanStep === 3 && (
                          <div className="space-y-4">
                            <div className="rounded-2xl border border-white/10 bg-black/35 p-4">
                              <div className="text-sm font-medium text-gray-100 text-center">Identity Badge (Optional)</div>
                              <div className="mt-1 text-xs text-gray-200/70 text-center">Display your status in live rooms and chats.</div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <button
                                type="button"
                                onClick={() => setSugaIdentity("daddy")}
                                className={cx(
                                  "relative overflow-hidden group flex flex-col items-center justify-center gap-2 rounded-2xl border p-5 transition",
                                  sugaIdentity === "daddy" ? "border-cyan-400 bg-cyan-500/10" : "border-white/10 bg-black/40 hover:bg-white/5"
                                )}
                              >
                                <div className="absolute inset-0 opacity-0 group-hover:opacity-10 bg-gradient-to-br from-cyan-400 to-transparent transition-opacity" />
                                <Crown className={cx("h-8 w-8", sugaIdentity === "daddy" ? "text-cyan-400" : "text-gray-500")} />
                                <div className="text-sm font-bold text-gray-100">Suga Daddy</div>
                                {sugaIdentity === "daddy" && <div className="absolute top-2 right-2"><CheckCircle2 className="h-4 w-4 text-cyan-400" /></div>}
                              </button>
                              <button
                                type="button"
                                onClick={() => setSugaIdentity("mama")}
                                className={cx(
                                  "relative overflow-hidden group flex flex-col items-center justify-center gap-2 rounded-2xl border p-5 transition",
                                  sugaIdentity === "mama" ? "border-pink-500 bg-pink-500/10" : "border-white/10 bg-black/40 hover:bg-white/5"
                                )}
                              >
                                <div className="absolute inset-0 opacity-0 group-hover:opacity-10 bg-gradient-to-br from-pink-500 to-transparent transition-opacity" />
                                <Crown className={cx("h-8 w-8", sugaIdentity === "mama" ? "text-pink-500" : "text-gray-500")} />
                                <div className="text-sm font-bold text-gray-100">Suga Mama</div>
                                {sugaIdentity === "mama" && <div className="absolute top-2 right-2"><CheckCircle2 className="h-4 w-4 text-pink-500" /></div>}
                              </button>
                            </div>

                            <div className="rounded-2xl border border-white/10 bg-black/35 p-4 space-y-4">
                              <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">Selected Tier: <span className="text-pink-400 font-black">{sugaTier.toUpperCase()}</span></div>
                              <div className="grid grid-cols-4 gap-2">
                                {["bronze", "silver", "gold", "vip"].map((t: any) => (
                                  <button
                                    key={t}
                                    onClick={() => setSugaTier(t)}
                                    className={cx(
                                      "py-2 rounded-lg border text-[10px] font-black uppercase transition-all",
                                      sugaTier === t ? "border-pink-500 bg-pink-500/20 text-white shadow-lg shadow-pink-500/20" : "border-white/5 bg-black/40 text-gray-500"
                                    )}
                                  >
                                    {t}
                                  </button>
                                ))}
                              </div>
                              <div className="p-3 rounded-xl bg-pink-500/5 border border-pink-500/10 text-[11px] text-pink-200/80 leading-relaxed italic">
                                "The Suga badge signifies elite support status, unlocking special reactions and priority placement in creator queues."
                              </div>
                            </div>

                            <div className="flex gap-3 pt-2">
                              <Button variant="ghost" className="flex-1 rounded-xl text-gray-400" onClick={() => setFanStep(2)}>Back</Button>
                              <Button
                                className="flex-[3] rounded-xl bg-gradient-to-r from-pink-600 to-fuchsia-600 hover:opacity-90 font-bold"
                                onClick={handleFanSignUp}
                              >
                                Complete Activation
                              </Button>
                            </div>
                          </div>
                        )}
                      </>
                    ) : createRole === "creator" ? (
                      <>
                        {/* Creator stepper */}
                        <div className="rounded-2xl border border-white/10 bg-black/35 p-4">
                          <div className="flex items-center justify-between">
                            <div className="text-sm font-medium text-gray-100">Creator application</div>
                            <div className="flex items-center gap-1.5 rounded-full bg-pink-500/10 px-2.5 py-1 text-[10px] font-bold text-pink-300 border border-pink-500/20">
                              <ShieldCheck className="h-3 w-3" /> VERIFIED ONLY
                            </div>
                          </div>

                          <div className="mt-3 grid grid-cols-4 gap-1.5">
                            {[1, 2, 3, 4].map((n) => {
                              const active = createStep === n;
                              const done = createStep > n;
                              return (
                                <div
                                  key={n}
                                  className={cx(
                                    "rounded-xl border p-2 text-center",
                                    active
                                      ? "border-pink-500/40 bg-pink-500/10"
                                      : done
                                        ? "border-cyan-400/30 bg-cyan-400/10"
                                        : "border-white/10 bg-black/20"
                                  )}
                                >
                                  <div className="text-[9px] text-gray-300">ST {n}</div>
                                  <div className="mt-0.5 text-[10px] font-medium text-gray-100">
                                    {n === 1 ? "Start" : n === 2 ? "Profile" : n === 3 ? "Verify" : "Suga"}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* STEP 1: Policy */}
                        {createStep === 1 && (
                          <div className="space-y-4">
                            <div className="rounded-2xl border border-white/10 bg-black/35 p-4">
                              <div className="text-sm font-medium text-gray-100">Joining as a Creator</div>
                              <div className="mt-1 text-xs text-gray-200/70">Access creator-only rooms (Confessions, Flash Drops) and set your own rates.</div>
                            </div>
                            <div className="space-y-3 rounded-2xl border border-white/10 bg-black/35 p-4">
                              <div className="flex items-start gap-3">
                                <Checkbox id="c_attest1" checked={agree} onCheckedChange={(v) => setAgree(!!v)} className="mt-1" />
                                <Label htmlFor="c_attest1" className="text-[11px] font-normal leading-relaxed text-gray-200/80">
                                  I am 18+ and will provide a valid government ID for verification.
                                </Label>
                              </div>
                              <div className="flex items-start gap-3">
                                <Checkbox id="c_attest2" checked={agree} onCheckedChange={(v) => setAgree(!!v)} className="mt-1" />
                                <Label htmlFor="c_attest2" className="text-[11px] font-normal leading-relaxed text-gray-200/80">
                                  I agree to the Creator Terms and safety guidelines.
                                </Label>
                              </div>
                            </div>
                            <Button
                              className="h-11 w-full rounded-xl bg-pink-600 hover:bg-pink-700"
                              disabled={!agree}
                              onClick={nextCreateStep}
                            >
                              Continue
                            </Button>
                          </div>
                        )}

                        {/* STEP 2: Basic Profile */}
                        {createStep === 2 && (
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 gap-4">
                              <div className="space-y-2">
                                <Label htmlFor="c_user" className="text-gray-200">Handle / Nickname</Label>
                                <Input
                                  id="c_user"
                                  placeholder="@username"
                                  className="h-11 rounded-xl bg-black/40 border-white/10 text-gray-100"
                                  value={creatorHandle}
                                  onChange={(e) => setCreatorHandle(e.target.value)}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="c_email" className="text-gray-200">Creator Email</Label>
                                <Input
                                  id="c_email"
                                  type="email"
                                  placeholder="creator@domain.com"
                                  className="h-11 rounded-xl bg-black/40 border-white/10 text-gray-100"
                                  value={creatorEmail}
                                  onChange={(e) => setCreatorEmail(e.target.value)}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="c_pw" className="text-gray-200">Password</Label>
                                <Input
                                  id="c_pw"
                                  type="password"
                                  placeholder="••••••••"
                                  className="h-11 rounded-xl bg-black/40 border-white/10 text-gray-100"
                                  value={creatorPassword}
                                  onChange={(e) => setCreatorPassword(e.target.value)}
                                />
                              </div>
                            </div>
                            <div className="flex gap-3">
                              <Button variant="outline" className="flex-1 rounded-xl border-white/10" onClick={prevCreateStep}>Back</Button>
                              <Button className="flex-[2] rounded-xl bg-pink-600 hover:bg-pink-700" onClick={nextCreateStep}>Next step</Button>
                            </div>
                          </div>
                        )}

                        {/* STEP 3: Identity Review */}
                        {createStep === 3 && (
                          <div className="space-y-4">
                            <div className="rounded-2xl border border-white/10 bg-black/35 p-4 text-center">
                              <IdCard className="mx-auto h-8 w-8 text-pink-400" />
                              <div className="mt-2 text-sm font-medium text-gray-100">Official ID Verification</div>
                              <div className="text-[10px] text-gray-400">Match faces against your official ID to earn verified status.</div>
                            </div>

                            {!creatorSubmitted ? (
                              <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-2">
                                  <Button variant="outline" className={cx("h-14 rounded-xl border-white/10 bg-black/40", idFront && "border-pink-500/40 bg-pink-500/5")} onClick={() => setIdFront(true)}>
                                    <Camera className="mr-2 h-4 w-4" /> Front
                                  </Button>
                                  <Button variant="outline" className={cx("h-14 rounded-xl border-white/10 bg-black/40", idBack && "border-pink-500/40 bg-pink-500/5")} onClick={() => setIdBack(true)}>
                                    <Camera className="mr-2 h-4 w-4" /> Back
                                  </Button>
                                </div>
                                <Button
                                  variant="outline"
                                  className={cx("h-14 w-full rounded-xl border-white/10 bg-black/40", selfieDone && "border-pink-500/40 bg-pink-500/5")}
                                  onClick={() => setSelfieDone(true)}
                                >
                                  <User className="mr-2 h-4 w-4" /> Take Liveness Selfie
                                </Button>

                                <div className="space-y-3 rounded-2xl border border-white/10 bg-black/35 p-4">
                                  <div className="flex items-start gap-3">
                                    <Checkbox id="c_v1" checked={attest18} onCheckedChange={(v) => setAttest18(!!v)} className="mt-1" />
                                    <Label htmlFor="c_v1" className="text-[11px] font-normal leading-relaxed text-gray-200/80">I am 18+ the owner of this ID.</Label>
                                  </div>
                                  <div className="flex items-start gap-3">
                                    <Checkbox id="c_v2" checked={attestSelf} onCheckedChange={(v) => setAttestSelf(!!v)} className="mt-1" />
                                    <Label htmlFor="c_v2" className="text-[11px] font-normal leading-relaxed text-gray-200/80">I consent to biometric matching.</Label>
                                  </div>
                                  <div className="flex items-start gap-3">
                                    <Checkbox id="c_v3" checked={attestConsent} onCheckedChange={(v) => setAttestConsent(!!v)} className="mt-1" />
                                    <Label htmlFor="c_v3" className="text-[11px] font-normal leading-relaxed text-gray-200/80">Secure processing agreement.</Label>
                                  </div>
                                </div>

                                <div className="flex gap-3">
                                  <Button variant="outline" className="flex-1 rounded-xl" onClick={prevCreateStep}>Back</Button>
                                  <Button
                                    className="flex-[2] rounded-xl bg-pink-600"
                                    disabled={!creatorReadyToSubmit}
                                    onClick={() => {
                                      setVerificationStatus("under_review");
                                      setTimeout(() => setVerificationStatus("verified"), 2000);
                                    }}
                                  >
                                    Submit
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="rounded-2xl border border-pink-500/20 bg-pink-500/5 p-6 text-center animate-in fade-in zoom-in duration-500">
                                {creatorVerified ? (
                                  <>
                                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-500/20 mb-4">
                                      <CheckCircle2 className="h-8 w-8 text-green-400" />
                                    </div>
                                    <div className="text-lg font-bold text-gray-50">Identity Verified</div>
                                    <p className="mt-1 text-sm text-gray-300">Your profile is now verified for 18+ content.</p>
                                    <Button className="mt-6 w-full rounded-xl bg-pink-600" onClick={nextCreateStep}>Setup Suga Badges</Button>
                                  </>
                                ) : (
                                  <>
                                    <Loader2 className="mx-auto h-12 w-12 animate-spin text-pink-400 mb-4" />
                                    <div className="text-lg font-bold text-gray-50">Reviewing Identity</div>
                                    <p className="mt-1 text-sm text-gray-300 italic">"Our automated matching system is validating your documents..."</p>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* STEP 4: Creator Suga Badge / Tiers */}
                        {createStep === 4 && (
                          <div className="space-y-4">
                            <div className="rounded-2xl border border-white/10 bg-black/35 p-4 text-center">
                              <Sparkles className="mx-auto h-6 w-6 text-pink-400" />
                              <div className="mt-2 text-sm font-medium text-gray-100">Suga 4 U (Creator Badges)</div>
                              <div className="text-[10px] text-gray-400">Enable specialized badges for your fans and profile.</div>
                            </div>

                            <div className="space-y-3">
                              <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/35 p-4">
                                <div className="flex items-center gap-3">
                                  <div className="rounded-full bg-pink-500/10 p-2"><Crown className="h-5 w-5 text-pink-400" /></div>
                                  <div>
                                    <div className="text-sm font-semibold text-gray-100">Elite Creator Tier</div>
                                    <div className="text-[10px] text-gray-400">Unlocks VIP rooms & direct billing.</div>
                                  </div>
                                </div>
                                <Checkbox checked={creatorTierEnabled} onCheckedChange={(v) => setCreatorTierEnabled(!!v)} />
                              </div>

                              {creatorTierEnabled && (
                                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-4 gap-2 px-2">
                                  {["rising", "pro", "elite", "vip"].map((t: any) => (
                                    <button key={t} onClick={() => setCreatorTierLevel(t)} className={cx("py-2 rounded-lg border text-[9px] font-black uppercase transition", creatorTierLevel === t ? "border-pink-500 bg-pink-500/20 text-white" : "border-white/5 bg-black/40 text-gray-500")}>
                                      {t}
                                    </button>
                                  ))}
                                </motion.div>
                              )}

                              <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/35 p-4">
                                <div className="flex items-center gap-3">
                                  <div className="rounded-full bg-cyan-400/10 p-2"><Sparkles className="h-5 w-5 text-cyan-400" /></div>
                                  <div>
                                    <div className="text-sm font-semibold text-gray-100">Suga Baby Badge</div>
                                    <div className="text-[10px] text-gray-400">Display Suga status on your profile.</div>
                                  </div>
                                </div>
                                <Checkbox checked={creatorSugaBadgeEnabled} onCheckedChange={(v) => setCreatorSugaBadgeEnabled(!!v)} />
                              </div>
                            </div>

                            <div className="flex gap-3 pt-2">
                              <Button variant="ghost" className="flex-1 rounded-xl text-gray-400" onClick={prevCreateStep}>Back</Button>
                              <Button
                                className="flex-[3] rounded-xl bg-gradient-to-r from-pink-600 to-fuchsia-600 font-bold"
                                onClick={handleCreatorSignUp}
                              >
                                Activate Profile
                              </Button>
                            </div>
                          </div>
                        )}
                      </>
                    ) : null}
                  </TabsContent>
                </Tabs>

                <div className="text-center text-xs text-gray-300/70">
                  Preview-only UI. Production auth should include risk checks, device verification, and age gating.
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
