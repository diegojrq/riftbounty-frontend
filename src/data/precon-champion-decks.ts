/**
 * Decks de campeã vendidos em pacote fechado (referência para UI estática).
 * Nomes de lenda/campeã devem bater com o catálogo.
 */
import type { PreconDeckSlug, PreconDeckTitleKey } from "./precon-champion-deck-lists";

/** Linha de produto do deck pré-construído (ordem de exibição na listagem). */
export type PreconDeckSet = "origins" | "spiritforged" | "unleashed";

export const PRECON_SET_ORDER: readonly PreconDeckSet[] = [
  "unleashed",
  "spiritforged",
  "origins",
];

export interface PreconChampionDeckDef {
  id: string;
  /** Rota `/decks/precon/[slug]/view` */
  slug: PreconDeckSlug;
  /** Chave em preconDecks (ex.: vexTitle) para o título do “cartão” de deck. */
  titleKey: PreconDeckTitleKey;
  set: PreconDeckSet;
  legend: string;
  legendCollector?: string;
  champion: string;
  championCollector?: string;
}

export const PRECON_CHAMPION_DECKS: readonly PreconChampionDeckDef[] = [
  {
    id: "jinx-ogn-champion",
    slug: "jinx",
    titleKey: "jinxTitle",
    set: "origins",
    legend: "Jinx, Loose Cannon",
    champion: "Jinx, Demolitionist",
  },
  {
    id: "lee-sin-ogn-champion",
    slug: "lee-sin",
    titleKey: "leeSinTitle",
    set: "origins",
    legend: "Lee Sin, Blind Monk",
    champion: "Lee Sin, Centered",
  },
  {
    id: "viktor-ogn-champion",
    slug: "viktor",
    titleKey: "viktorTitle",
    set: "origins",
    legend: "Viktor, Herald of the Arcane",
    champion: "Viktor, Innovator",
  },
  {
    id: "rumble-sfd-champion",
    slug: "rumble",
    titleKey: "rumbleTitle",
    set: "spiritforged",
    legend: "Mechanized Menace",
    legendCollector: "SFD-181/221",
    champion: "Rumble, Hotheaded",
  },
  {
    id: "fiora-sfd-champion",
    slug: "fiora",
    titleKey: "fioraTitle",
    set: "spiritforged",
    legend: "Grand Duelist",
    legendCollector: "SFD-205/221",
    champion: "Fiora, Worthy",
  },
  {
    id: "vex-unleashed-champion",
    slug: "vex",
    titleKey: "vexTitle",
    set: "unleashed",
    legend: "Vex, Gloomist",
    champion: "Vex, Apathetic",
  },
  {
    id: "vi-unleashed-champion",
    slug: "vi",
    titleKey: "viTitle",
    set: "unleashed",
    legend: "Vi, Piltover Enforcer",
    champion: "Vi, Peacekeeper",
  },
];
