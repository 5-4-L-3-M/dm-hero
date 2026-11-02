import type { StatBlock } from './statblock'

export interface MonsterSummary {
  id: number
  /** From the official SRD bestiary */
  srd: boolean
  name: string
  image_url: string | null
  tags: string[]
  cr: string | null
  kind: string | null
  size: string | null
  ac: number | null
  hp: number | null
}

export interface Monster {
  id: number
  srd: boolean
  name: string
  description: string | null
  image_url: string | null
  tags: string[]
  block: StatBlock
  updated_at: string
}
