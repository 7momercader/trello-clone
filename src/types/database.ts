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

// Miembro con email incluido (lo devuelve la función RPC get_workspace_members)
export interface WorkspaceMemberWithEmail {
  member_id: string
  user_id: string
  email: string
  role: WorkspaceRole
  joined_at: string
}

// Respuesta estándar de las funciones RPC de miembros (add/remove)
export interface MemberActionResult {
  success: boolean
  message: string
  member_id?: string
  user_id?: string
  role?: WorkspaceRole
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

// ============================================
// Card Assignments (asignación de miembros a tarjetas)
// ============================================

// Fila base de card_assignments
export interface CardAssignment {
  id: string
  card_id: string
  user_id: string
  assigned_by: string | null
  assigned_at: string
}

// Asignado con email y rol incluidos (lo devuelve la RPC get_card_assignments)
export interface CardAssignmentWithEmail {
  assignment_id: string
  user_id: string
  email: string
  role: WorkspaceRole
  assigned_at: string
}

// Respuesta estándar de las RPC assign/unassign
export interface AssignmentActionResult {
  success: boolean
  message: string
  assignment_id?: string
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