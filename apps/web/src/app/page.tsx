import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-[url('/grid.svg')] relative overflow-hidden">
      {/* Background gradients for cosmic effect */}
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-transparent via-background/80 to-background z-0 pointer-events-none" />
      <div className="absolute top-[-20%] right-[10%] w-[500px] h-[500px] bg-primary/20 rounded-full blur-[128px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[10%] w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[128px] pointer-events-none" />

      <div className="z-10 relative flex flex-col items-center text-center space-y-8 max-w-2xl">
        <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-sm font-medium text-primary backdrop-blur-md">
          <span className="flex h-2 w-2 rounded-full bg-primary mr-2 animate-pulse"></span>
          Finux System Online
        </div>

        <h1 className="text-6xl font-bold tracking-tighter sm:text-7xl bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-white/50">
          Cosmic <span className="text-primary">Gold</span>
        </h1>

        <p className="text-lg text-muted-foreground max-w-[600px]">
          Advanced stock research platform featuring real-time analytics,
          AI-driven insights, and a premium glassmorphic interface.
        </p>

        <div className="flex gap-4">
          <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_20px_-5px_var(--primary)]">
            Launch Dashboard
          </Button>
          <Button variant="outline" size="lg" className="border-white/10 bg-white/5 backdrop-blur-sm hover:bg-white/10 hover:text-white">
            Documentation
          </Button>
        </div>

        {/* Glass Card Example */}
        <div className="mt-12 p-6 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl w-full max-w-md">
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm text-muted-foreground">Market Status</span>
            <span className="text-xs font-mono text-green-400">● LIVE</span>
          </div>
          <div className="flex justify-between items-baseline">
            <span className="text-3xl font-bold font-mono">$4,293.18</span>
            <span className="text-sm text-green-400 flex items-center">
              +1.24%
            </span>
          </div>
        </div>
      </div>
    </main>
  );
}
