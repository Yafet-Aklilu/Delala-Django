import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import Intro from "@/components/landing/Intro";
import HowItWorks from "@/components/landing/HowItWorks";
import PropertyShowcase from "@/components/landing/PropertyShowcase";
import ForOwners from "@/components/landing/ForOwners";
import WhyDelala from "@/components/landing/WhyDelala";
import FinalCTA from "@/components/landing/FinalCTA";
import Footer from "@/components/landing/Footer";
import LandingAnimations from "@/components/landing/LandingAnimations";
import MessagesFab from "@/components/landing/MessagesFab";
import type { Property } from "@/lib/types";
import type { AuthUser } from "@/lib/auth-types";

type Props = {
  properties: Property[];
  user?: AuthUser | null;
};

export default function MarketingLanding({ properties, user = null }: Props) {
  return (
    <LandingAnimations>
      <Navbar user={user} />
      <main>
        <Hero user={user} />
        <Intro />
        <HowItWorks />
        <PropertyShowcase properties={properties} />
        <ForOwners />
        <WhyDelala />
        <FinalCTA user={user} />
      </main>
      <Footer />
      <MessagesFab user={user} />
    </LandingAnimations>
  );
}
