import { DecksSubNav } from "@/components/decks/decks-sub-nav";

export default function DecksLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <DecksSubNav />
      {children}
    </>
  );
}
