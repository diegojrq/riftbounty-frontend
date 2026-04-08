/**
 * Decks de campeã vendidos em pacote fechado (referência para UI estática).
 * Nomes de lenda/campeã devem bater com o catálogo (UNL).
 */
import type { PreconDeckSlug } from "./precon-champion-deck-lists";

export interface PreconChampionDeckDef {
  id: string;
  /** Rota `/decks/precon/[slug]/view` */
  slug: PreconDeckSlug;
  /** Chave em preconDecks (ex.: vexTitle) para o título do “cartão” de deck. */
  titleKey: "vexTitle" | "viTitle";
  legend: string;
  legendCollector?: string;
  champion: string;
  championCollector?: string;
}

export const PRECON_CHAMPION_DECKS: readonly PreconChampionDeckDef[] = [
  {
    id: "vex-unleashed-champion",
    slug: "vex",
    titleKey: "vexTitle",
    legend: "Vex, Gloomist",
    champion: "Vex, Apathetic",
  },
  {
    id: "vi-unleashed-champion",
    slug: "vi",
    titleKey: "viTitle",
    legend: "Vi, Piltover Enforcer",
    champion: "Vi, Peacekeeper",
  },
];
