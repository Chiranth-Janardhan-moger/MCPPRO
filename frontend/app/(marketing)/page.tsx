import { Hero } from "@/components/landing/hero";
import { Features } from "@/components/landing/features";
import { FeatureDetails } from "@/components/landing/feature-details";
import { SystemFlow } from "@/components/landing/system-flow";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <Hero />
      <Features />
      <FeatureDetails />
      <SystemFlow />
    </div>
  );
}
