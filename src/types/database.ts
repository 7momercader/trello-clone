// Tipos que reflejan las tablas de Supabase
// Mantenelos sincronizados con el schema de la base de datos

export type WorkspaceRole = 'owner' | 'admin' | 'member'

export interface Workspace {
  id: string
  name: string
  description: string | null
  owner_id: string
  created_at: string
  updated_at: string
}

export interface WorkspaceMember {
  id: string
  workspace_id: string
  user_id: string
  role: WorkspaceRole
  created_at: string
}

export interface Board {
  id: string
  workspace_id: string
  name: string
  description: string | null
  background_color: string
  created_by: string
  created_at: string
  updated_at: string
}

export interface List {
  id: string
  board_id: string
  name: string
  position: number
  created_at: string
}

export interface Card {
  id: string
  list_id: string
  title: string
  description: string | null
  position: number
  due_date: string | null
  created_by: string
  created_at: string
  updated_at: string
}

// Tipos para inserts (sin id, created_at, updated_at — los pone la DB)
export type WorkspaceInsert = {
  name: string
  description?: string | null
  owner_id: string
}

export type BoardInsert = {
  workspace_id: string
  name: string
  description?: string | null
  background_color?: string
  created_by: string
}

export type ListInsert = {
  board_id: string
  name: string
  position: number
}

export type CardInsert = {
  list_id: string
  title: string
  description?: string | null
  position: number
  due_date?: string | null
  created_by: string
}

// Tipo combinado: lista con sus tarjetas adentro
export interface ListWithCards extends List {
  cards: Card[]
}