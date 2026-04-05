/** GET /communities, GET /communities/:slug, admin CRUD */

import type { PublicProfileCard } from "@/types/auth";

export interface Community {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  avatarUrl: string | null;
  memberCount: number;
  createdAt?: string;
  updatedAt?: string;
  /** Se o backend enviar, usamos para o botão entrar/sair sem heurística */
  isMember?: boolean;
}

export interface CommunitiesListResponse {
  items: Community[];
  total: number;
  limit: number;
  offset: number;
}

export interface JoinCommunityResponse {
  communityId: string;
  slug: string;
  wasNew: boolean;
}

/** GET /communities/:slug/members */
export interface CommunityMember {
  userId: string;
  slug: string;
  displayName: string | null;
  joinedAt: string;
}

export interface CommunityMembersResponse {
  items: CommunityMember[];
  total: number;
  limit: number;
  offset: number;
}

/** Membro numa carta do agregado (embutido em cada item) */
export interface CommunityAggregateLineMember {
  userId: string;
  slug: string;
  displayName: string | null;
  quantity: number;
  /** À venda: número ou null se não definido na BD (como no perfil); wishlist: null */
  pricePerCard: number | null;
}

/** GET .../aggregates/for-sale | wishlist — agregação por carta; cada item inclui lines (membros dessa carta nesta página) */
export interface CommunityAggregateRow {
  cardId: string;
  totalQuantity: number;
  memberCount: number;
  card: PublicProfileCard | null;
  lines: CommunityAggregateLineMember[];
}

export interface CommunityAggregatesResponse {
  items: CommunityAggregateRow[];
}
